
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { MeasurementProject, MeasurementFloor, MeasurementRoom, MeasurementPoint, MeasurementOpening, ManualMeasurementStats, ManualWall, ManualOpening } from '../types';
import { 
  Ruler, Plus, Maximize, Layers, Layout, MousePointer2, 
  Trash2, Save, ChevronDown, Calculator, Edit2, X, 
  ArrowRight, Box, Move, DoorOpen, AppWindow, ArrowUp, ArrowLeft, ArrowDown, ScanLine
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

// --- Constants ---
const GRID_SIZE = 25; // Pixels per grid step
const SCALE_PIXELS_PER_METER = 50; // 50px = 1 meter. 1px = 20mm.
const MM_PER_PIXEL = 1000 / SCALE_PIXELS_PER_METER; // 20mm

// --- Math Utils ---

// Distance between two points
const dist = (p1: MeasurementPoint, p2: MeasurementPoint) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Calculate Polygon Area (Shoelace) - Returns m2
const calculatePolygonAreaM2 = (points: MeasurementPoint[]) => {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  const areaPx = Math.abs(area) / 2;
  // Convert px^2 to m^2. (px / scale) * (px / scale)
  return areaPx / (SCALE_PIXELS_PER_METER * SCALE_PIXELS_PER_METER);
};

// Calculate Perimeter - Returns m
const calculatePerimeterM = (points: MeasurementPoint[]) => {
  if (points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    // If checking during drawing and not closed, skip last segment? 
    // Actually standard perimeter usually assumes closed for rooms.
    if (i === points.length - 1 && points.length < 3) continue; 
    p += dist(points[i], next);
  }
  return p / SCALE_PIXELS_PER_METER;
};

// Get Wall Length in mm
const getWallLengthMm = (p1: MeasurementPoint, p2: MeasurementPoint) => {
    return dist(p1, p2) * MM_PER_PIXEL;
};

// --- Components ---

const FloorPlanEditor = ({ room, onUpdateRoom }: { room: MeasurementRoom, onUpdateRoom: (r: MeasurementRoom) => void }) => {
  const [drawing, setDrawing] = useState(false);
  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [newOpeningType, setNewOpeningType] = useState<'Door' | 'Window'>('Window');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPos, setCursorPos] = useState<MeasurementPoint>({x:0, y:0});
  
  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setCursorPos({
        x: snapToGrid(e.clientX - rect.left),
        y: snapToGrid(e.clientY - rect.top)
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on a wall (handled by stopPropagation on wall line), don't add point
    // If drawing
    if (drawing || room.points.length === 0) {
        setDrawing(true);
        const newPoints = [...room.points, cursorPos];
        
        // Check closing
        if (room.points.length > 2) {
            const d = dist(cursorPos, room.points[0]);
            if (d < 15) {
                setDrawing(false); // Closed
                return;
            }
        }
        onUpdateRoom({ ...room, points: newPoints });
    } else {
        // If not drawing, clicking empty space deselects
        setSelectedWallIndex(null);
    }
  };

  const handleReset = () => {
      if(confirm("Сбросить весь чертеж?")) {
        onUpdateRoom({ ...room, points: [], openings: [] });
        setDrawing(false);
        setSelectedWallIndex(null);
      }
  };

  const handleAddOpening = (type: 'Door' | 'Window') => {
      if (selectedWallIndex === null) return;
      setNewOpeningType(type);
      setIsOpeningModalOpen(true);
  };

  const saveOpening = (width: number, height: number, offset: number) => {
      if (selectedWallIndex === null) return;
      
      // Validation: Opening shouldn't exceed wall length
      const p1 = room.points[selectedWallIndex];
      const p2 = room.points[(selectedWallIndex + 1) % room.points.length];
      const wallLen = getWallLengthMm(p1, p2);
      
      if (offset + width > wallLen) {
          alert("Проем выходит за границы стены!");
          return;
      }

      const newOp: MeasurementOpening = {
          id: uuidv4(),
          type: newOpeningType,
          width,
          height,
          distanceFromStart: offset,
          wallIndex: selectedWallIndex
      };
      
      onUpdateRoom({ ...room, openings: [...room.openings, newOp] });
      setIsOpeningModalOpen(false);
  };

  const deleteOpening = (id: string) => {
      onUpdateRoom({ ...room, openings: room.openings.filter(o => o.id !== id) });
  };

  const pointsString = room.points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col h-full">
       {/* Editor Toolbar */}
       <div className="bg-slate-100 border-b border-slate-200 p-2 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4">
             <span className="flex items-center text-slate-600"><MousePointer2 size={14} className="mr-1"/> {drawing ? 'Кликайте для создания углов' : 'Выберите стену для редактирования'}</span>
             <div className="h-4 w-px bg-slate-300"></div>
             {selectedWallIndex !== null ? (
                 <div className="flex space-x-2 animate-in fade-in">
                     <button onClick={() => handleAddOpening('Door')} className="flex items-center px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 font-medium"><DoorOpen size={14} className="mr-1"/> Дверь</button>
                     <button onClick={() => handleAddOpening('Window')} className="flex items-center px-2 py-1 bg-cyan-100 text-cyan-800 rounded hover:bg-cyan-200 font-medium"><AppWindow size={14} className="mr-1"/> Окно</button>
                 </div>
             ) : (
                 <span className="text-slate-400 italic">Кликните на синюю линию стены...</span>
             )}
          </div>
          <button onClick={handleReset} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center"><Trash2 size={14} className="mr-1"/> Очистить</button>
       </div>

       {/* Canvas */}
       <div className="flex-1 bg-white relative overflow-hidden select-none">
          <svg 
            ref={svgRef}
            width="100%" height="100%" 
            className="absolute inset-0"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
          >
             <defs>
                <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                   <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#grid)" />

             {/* Room Polygon Fill */}
             {room.points.length > 2 && (
                <polygon 
                   points={pointsString} 
                   fill="rgba(59, 130, 246, 0.1)" 
                   stroke="none"
                />
             )}

             {/* Walls (Lines) */}
             {room.points.map((p, i) => {
                 const nextIndex = (i + 1) % room.points.length;
                 // Don't draw closing line if still drawing and not closed
                 if (drawing && i === room.points.length - 1) return null;

                 const pNext = room.points[nextIndex];
                 const isSelected = selectedWallIndex === i;
                 
                 // Calculate Center for Label
                 const mx = (p.x + pNext.x) / 2;
                 const my = (p.y + pNext.y) / 2;
                 const lenM = (dist(p, pNext) / SCALE_PIXELS_PER_METER).toFixed(2);

                 return (
                    <g key={i}>
                        {/* The visible line */}
                        <line 
                           x1={p.x} y1={p.y} x2={pNext.x} y2={pNext.y}
                           stroke={isSelected ? "#ef4444" : "#2563eb"}
                           strokeWidth={isSelected ? 4 : 3}
                           className="transition-all"
                        />
                        {/* Invisible Hit Area for easier selection */}
                        <line 
                           x1={p.x} y1={p.y} x2={pNext.x} y2={pNext.y}
                           stroke="transparent"
                           strokeWidth={20}
                           cursor="pointer"
                           onClick={(e) => {
                               e.stopPropagation();
                               if (!drawing) setSelectedWallIndex(i);
                           }}
                        />
                        {/* Length Label */}
                        <rect x={mx-15} y={my-8} width={30} height={16} fill="white" rx="4" opacity="0.8" />
                        <text x={mx} y={my} textAnchor="middle" dy="4" fontSize="10" fill="#334155" fontWeight="bold" pointerEvents="none">{lenM}m</text>
                        
                        {/* Render Openings on this wall */}
                        {room.openings.filter(o => o.wallIndex === i).map(op => {
                            // Project opening onto line
                            // p is start, pNext is end
                            // distanceFromStart is in mm. Convert to px.
                            const offsetPx = op.distanceFromStart / MM_PER_PIXEL;
                            const widthPx = op.width / MM_PER_PIXEL;
                            
                            // Vector direction
                            const dx = pNext.x - p.x;
                            const dy = pNext.y - p.y;
                            const wallLenPx = Math.sqrt(dx*dx + dy*dy);
                            
                            // Normalize
                            const ux = dx / wallLenPx;
                            const uy = dy / wallLenPx;
                            
                            // Start Point of Opening
                            const ox = p.x + ux * offsetPx;
                            const oy = p.y + uy * offsetPx;
                            
                            // End Point
                            const oex = ox + ux * widthPx;
                            const oey = oy + uy * widthPx;

                            return (
                                <g key={op.id} onClick={(e) => { e.stopPropagation(); if(confirm('Удалить проем?')) deleteOpening(op.id); }} cursor="pointer">
                                    <line 
                                        x1={ox} y1={oy} x2={oex} y2={oey}
                                        stroke={op.type === 'Door' ? '#92400e' : '#06b6d4'}
                                        strokeWidth={6}
                                    />
                                    <title>{op.type}: {op.width}x{op.height}mm</title>
                                </g>
                            );
                        })}
                    </g>
                 )
             })}

             {/* Drawing Guide Line */}
             {drawing && room.points.length > 0 && (
                <line 
                   x1={room.points[room.points.length-1].x} 
                   y1={room.points[room.points.length-1].y}
                   x2={cursorPos.x}
                   y2={cursorPos.y}
                   stroke="#94a3b8"
                   strokeWidth="2"
                   strokeDasharray="5,5"
                   pointerEvents="none"
                />
             )}

             {/* Corners */}
             {room.points.map((p, i) => (
                 <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
             ))}
             
             {/* Cursor */}
             <circle cx={cursorPos.x} cy={cursorPos.y} r="3" fill="#ef4444" opacity="0.5" pointerEvents="none" />
          </svg>
       </div>

       {/* Add Opening Modal */}
       {isOpeningModalOpen && (
           <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
               <div className="bg-white p-6 rounded-xl shadow-xl w-72">
                   <h3 className="font-bold mb-4 text-slate-800">Добавить {newOpeningType === 'Door' ? 'Дверь' : 'Окно'}</h3>
                   <form onSubmit={(e) => {
                       e.preventDefault();
                       const data = new FormData(e.currentTarget);
                       saveOpening(
                           Number(data.get('width')),
                           Number(data.get('height')),
                           Number(data.get('offset'))
                       );
                   }} className="space-y-3">
                       <div>
                           <label className="block text-xs font-bold text-slate-500">Ширина (мм)</label>
                           <input name="width" type="number" defaultValue={newOpeningType==='Door'?900:1500} className="w-full border rounded p-2" autoFocus />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500">Высота (мм)</label>
                           <input name="height" type="number" defaultValue={newOpeningType==='Door'?2100:1500} className="w-full border rounded p-2" />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500">Отступ от начала стены (мм)</label>
                           <input name="offset" type="number" defaultValue={500} className="w-full border rounded p-2" />
                       </div>
                       <div className="flex space-x-2 pt-2">
                           <button type="button" onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded">Отмена</button>
                           <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">OK</button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};

// --- Manual Input Form ---

const ManualInputView = ({ room, onUpdateRoom }: { room: MeasurementRoom, onUpdateRoom: (r: MeasurementRoom) => void }) => {
    const walls = room.manualWalls || [];
    const [newOpeningModal, setNewOpeningModal] = useState<{ open: boolean, wallId: string | null }>({ open: false, wallId: null });

    const addWall = () => {
        const newWall: ManualWall = {
            id: uuidv4(),
            direction: 'Right',
            length: 3000,
            openings: []
        };
        onUpdateRoom({ ...room, manualWalls: [...walls, newWall] });
    };

    const updateWall = (id: string, updates: Partial<ManualWall>) => {
        onUpdateRoom({ ...room, manualWalls: walls.map(w => w.id === id ? { ...w, ...updates } : w) });
    };

    const deleteWall = (id: string) => {
        onUpdateRoom({ ...room, manualWalls: walls.filter(w => w.id !== id) });
    };

    const addOpening = (wallId: string, type: 'Door' | 'Window' | 'Empty', width: number, height: number, offset: number) => {
        const newOp: ManualOpening = { id: uuidv4(), type, width, height, distanceFromStart: offset };
        const updatedWalls = walls.map(w => w.id === wallId ? { ...w, openings: [...w.openings, newOp] } : w);
        onUpdateRoom({ ...room, manualWalls: updatedWalls });
        setNewOpeningModal({ open: false, wallId: null });
    };

    const removeOpening = (wallId: string, opId: string) => {
        const updatedWalls = walls.map(w => w.id === wallId ? { ...w, openings: w.openings.filter(o => o.id !== opId) } : w);
        onUpdateRoom({ ...room, manualWalls: updatedWalls });
    };

    // Auto-calculate shape for preview
    const generatedPoints = (() => {
        const points: MeasurementPoint[] = [{x: 300, y: 300}]; // Start somewhat centered
        let currentX = 300;
        let currentY = 300;
        
        walls.forEach(w => {
            const lenPx = w.length / MM_PER_PIXEL;
            if (w.direction === 'Right') currentX += lenPx;
            if (w.direction === 'Left') currentX -= lenPx;
            if (w.direction === 'Up') currentY -= lenPx;
            if (w.direction === 'Down') currentY += lenPx;
            points.push({x: currentX, y: currentY});
        });
        return points;
    })();

    const pointsString = generatedPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex h-full bg-white">
            {/* Left Panel: Wall List */}
            <div className="w-3/5 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Стены помещения</h3>
                    <button onClick={addWall} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center shadow-sm hover:bg-blue-700">
                        <Plus size={16} className="mr-1.5"/> Добавить стену
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {walls.length === 0 && (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            Добавьте первую стену, чтобы начать построение.
                        </div>
                    )}
                    {walls.map((wall, idx) => (
                        <div key={wall.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-all hover:shadow-md">
                            <div className="flex items-end gap-4 mb-4">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs flex-shrink-0">
                                    #{idx + 1}
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Направление</label>
                                        <div className="flex bg-slate-100 rounded-lg p-1">
                                            {[
                                                { val: 'Up', icon: ArrowUp }, 
                                                { val: 'Right', icon: ArrowRight }, 
                                                { val: 'Down', icon: ArrowDown }, 
                                                { val: 'Left', icon: ArrowLeft }
                                            ].map((dir: any) => (
                                                <button 
                                                    key={dir.val}
                                                    onClick={() => updateWall(wall.id, { direction: dir.val })}
                                                    className={clsx(
                                                        "flex-1 p-1.5 rounded flex items-center justify-center transition-all",
                                                        wall.direction === dir.val ? "bg-white shadow text-blue-600" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                    title={dir.val}
                                                >
                                                    <dir.icon size={16} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Длина (мм)</label>
                                        <input 
                                            type="number" 
                                            value={wall.length} 
                                            onChange={e => updateWall(wall.id, { length: Number(e.target.value) })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => deleteWall(wall.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Удалить стену">
                                    <Trash2 size={18}/>
                                </button>
                            </div>

                            {/* Openings Section */}
                            <div className="border-t border-slate-100 pt-3">
                                <div className="flex flex-wrap gap-2">
                                    {wall.openings.map(op => (
                                        <div key={op.id} className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs">
                                            <span className={clsx("w-2 h-2 rounded-full mr-2", op.type === 'Window' ? "bg-cyan-400" : op.type === 'Door' ? "bg-amber-600" : "bg-slate-400")}></span>
                                            <span className="font-medium mr-2">
                                                {op.type === 'Window' ? 'Окно' : op.type === 'Door' ? 'Дверь' : 'Проем'} 
                                                <span className="text-slate-400 ml-1">{op.width}x{op.height}</span>
                                            </span>
                                            <button onClick={() => removeOpening(wall.id, op.id)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setNewOpeningModal({ open: true, wallId: wall.id })}
                                        className="px-2 py-1 bg-white border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center"
                                    >
                                        <Plus size={12} className="mr-1"/> Проем/Окно
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Preview & Stats */}
            <div className="w-2/5 bg-slate-50 flex flex-col">
                <div className="flex-1 relative overflow-hidden bg-grid-pattern border-b border-slate-200">
                    <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-[10px] font-bold text-slate-400 pointer-events-none border border-slate-100">
                        Предпросмотр
                    </div>
                    <svg width="100%" height="100%" className="absolute inset-0">
                        <defs>
                            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#smallGrid)" />
                        
                        {walls.length > 0 && (
                            <g transform="translate(0,0)"> {/* Viewbox logic would go here for centering */}
                                <polyline 
                                    points={pointsString} 
                                    fill="none" 
                                    stroke="#2563eb" 
                                    strokeWidth="4" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                                {generatedPoints.map((p, i) => (
                                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#2563eb" strokeWidth="2" />
                                ))}
                                {/* Closing line if not closed */}
                                {walls.length > 1 && dist(generatedPoints[0], generatedPoints[generatedPoints.length-1]) > 5 && (
                                    <line 
                                        x1={generatedPoints[generatedPoints.length-1].x} y1={generatedPoints[generatedPoints.length-1].y}
                                        x2={generatedPoints[0].x} y2={generatedPoints[0].y}
                                        stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4"
                                    />
                                )}
                            </g>
                        )}
                    </svg>
                </div>
                <div className="p-4 bg-white h-1/3 overflow-y-auto">
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center"><Calculator size={16} className="mr-2 text-blue-600"/> Расчетные данные</h4>
                    <CalculationsSummary room={{...room, mode: 'manual', manualWalls: walls}} />
                </div>
            </div>

            {/* Modal for Adding Opening */}
            {newOpeningModal.open && (
                <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-80 animate-in zoom-in-95 duration-200">
                        <h4 className="font-bold text-slate-800 mb-4">Параметры проема</h4>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const data = new FormData(e.currentTarget);
                            if (newOpeningModal.wallId) {
                                addOpening(
                                    newOpeningModal.wallId, 
                                    data.get('type') as any, 
                                    Number(data.get('width')), 
                                    Number(data.get('height')), 
                                    Number(data.get('offset'))
                                );
                            }
                        }} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Тип</label>
                                <select name="type" className="w-full border rounded p-2 bg-white">
                                    <option value="Window">Окно</option>
                                    <option value="Door">Дверь</option>
                                    <option value="Empty">Пустой проем</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Ширина (мм)</label>
                                    <input name="width" type="number" defaultValue={900} className="w-full border rounded p-2" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Высота (мм)</label>
                                    <input name="height" type="number" defaultValue={2100} className="w-full border rounded p-2" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Отступ от начала (мм)</label>
                                <input name="offset" type="number" defaultValue={500} className="w-full border rounded p-2" required />
                            </div>
                            <div className="flex space-x-2 pt-3">
                                <button type="button" onClick={() => setNewOpeningModal({ open: false, wallId: null })} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium">Отмена</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">Добавить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const CalculationsSummary = ({ room }: { room: MeasurementRoom }) => {
    // Unified Calculation Logic
    let floorArea = 0, perimeter = 0, wallAreaNet = 0, volume = 0, openingsArea = 0;
    
    if (room.mode === 'manual' && room.manualWalls && room.manualWalls.length > 0) {
        // Manual Wall Mode Calculation
        perimeter = room.manualWalls.reduce((acc, w) => acc + w.length, 0) / 1000;
        const heightM = room.height / 1000;
        
        const wallsAreaGross = perimeter * heightM;
        
        openingsArea = room.manualWalls.reduce((acc, w) => {
            const wallOps = w.openings.reduce((wSum, op) => wSum + ((op.width * op.height) / 1000000), 0);
            return acc + wallOps;
        }, 0);
        
        wallAreaNet = Math.max(0, wallsAreaGross - openingsArea);
        
        // Floor Area from manual walls vectors
        const points: MeasurementPoint[] = [{x:0,y:0}];
        let curX=0, curY=0;
        room.manualWalls.forEach(w => {
            const len = w.length / 1000; // Use meters for direct area calc? No, let's stick to px scale logic for consistency or direct math.
            // Let's use meters directly for coordinate math to get m2
            if(w.direction === 'Right') curX += len;
            if(w.direction === 'Left') curX -= len;
            if(w.direction === 'Up') curY -= len;
            if(w.direction === 'Down') curY += len;
            points.push({x: curX, y: curY});
        });
        // Shoelace on meters
        let area = 0;
        for(let i=0; i<points.length-1; i++){
            area += points[i].x * points[i+1].y;
            area -= points[i+1].x * points[i].y;
        }
        // Close loop if needed
        area += points[points.length-1].x * points[0].y;
        area -= points[0].x * points[points.length-1].y;
        
        floorArea = Math.abs(area) / 2;
        volume = floorArea * heightM;

    } else if (room.mode === 'manual' && room.manualStats) {
        // Legacy Manual Stats
        floorArea = room.manualStats.floorArea || 0;
        perimeter = room.manualStats.perimeter || 0;
        wallAreaNet = room.manualStats.wallAreaNet || 0;
        volume = floorArea * (room.manualStats.wallHeight || 0);
        openingsArea = room.manualStats.openingsArea || 0;
    } else {
        // Drawing Mode
        floorArea = calculatePolygonAreaM2(room.points);
        perimeter = calculatePerimeterM(room.points);
        const heightM = room.height / 1000;
        openingsArea = room.openings.reduce((sum, op) => sum + ((op.width * op.height) / 1000000), 0);
        wallAreaNet = Math.max(0, (perimeter * heightM) - openingsArea);
        volume = floorArea * heightM;
    }

    return (
        <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Площадь пола</span>
                <span className="font-bold text-slate-800">{floorArea.toFixed(2)} м²</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Периметр</span>
                <span className="font-bold text-slate-800">{perimeter.toFixed(2)} м</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Стены (нетто)</span>
                <span className="font-bold text-slate-800">{wallAreaNet.toFixed(2)} м²</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Проемы</span>
                <span className="font-bold text-red-500">-{openingsArea.toFixed(2)} м²</span>
            </div>
            <div className="flex justify-between pt-2">
                <span className="text-slate-500 font-bold">Объем</span>
                <span className="font-bold text-blue-600">{volume.toFixed(2)} м³</span>
            </div>
        </div>
    );
};

const CalculationsView = ({ room }: { room: MeasurementRoom }) => {
    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full bg-slate-50">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-800">Сводка: {room.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${room.mode === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {room.mode === 'manual' ? 'Ручной ввод' : 'По чертежу'}
                </span>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <CalculationsSummary room={room} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <Layers size={24} className="mx-auto mb-2 text-purple-500"/>
                    <div className="text-xs text-slate-500 uppercase font-bold">Высота</div>
                    <div className="text-xl font-bold">{(room.height/1000).toFixed(2)} м</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <ScanLine size={24} className="mx-auto mb-2 text-slate-500"/>
                    <div className="text-xs text-slate-500 uppercase font-bold">Режим</div>
                    <div className="text-xl font-bold capitalize">{room.mode}</div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, unit, icon: Icon, color }: any) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        slate: "bg-slate-100 text-slate-600",
        purple: "bg-purple-50 text-purple-600"
    };
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</p>
                <div className="text-2xl font-bold text-slate-800">
                    {value} <span className="text-sm text-slate-500 font-normal">{unit}</span>
                </div>
            </div>
            <div className={`p-3 rounded-full ${colors[color] || colors.slate}`}>
                <Icon size={20}/>
            </div>
        </div>
    );
};

export const Measurements = () => {
  const { measurements, addMeasurementProject, updateMeasurementProject, projects } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  
  // Init logic
  const activeMeasurement = measurements.find(m => m.projectId === selectedProjectId);
  
  // State tracking
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'draw' | 'calc'>('draw');

  // Create default structure if needed
  useEffect(() => {
      if (selectedProjectId && !activeMeasurement) {
          const newMp: MeasurementProject = {
              id: uuidv4(),
              projectId: selectedProjectId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              floors: [{
                  id: uuidv4(),
                  name: '1 Этаж',
                  rooms: [{
                      id: uuidv4(),
                      name: 'Помещение 1',
                      height: 2700,
                      points: [],
                      openings: [],
                      mode: 'drawing',
                      manualWalls: []
                  }]
              }]
          };
          addMeasurementProject(newMp);
      }
  }, [selectedProjectId, activeMeasurement]);

  // Auto-select first room on load
  useEffect(() => {
      if (activeMeasurement && !activeFloorId) {
          setActiveFloorId(activeMeasurement.floors[0].id);
          setActiveRoomId(activeMeasurement.floors[0].rooms[0].id);
      }
  }, [activeMeasurement]);

  const activeFloor = activeMeasurement?.floors.find(f => f.id === activeFloorId);
  const activeRoom = activeFloor?.rooms.find(r => r.id === activeRoomId);

  const updateRoom = (updatedRoom: MeasurementRoom) => {
      if (!activeMeasurement || !activeFloor) return;
      const newFloors = activeMeasurement.floors.map(f => {
          if (f.id === activeFloorId) {
              return { ...f, rooms: f.rooms.map(r => r.id === activeRoomId ? updatedRoom : r) };
          }
          return f;
      });
      updateMeasurementProject({ ...activeMeasurement, floors: newFloors });
  };

  const addRoom = () => {
      if (!activeMeasurement || !activeFloor) return;
      const newRoom: MeasurementRoom = {
          id: uuidv4(), name: `Новое помещение`, height: 2700, points: [], openings: [], mode: 'drawing', manualWalls: []
      };
      const newFloors = activeMeasurement.floors.map(f => 
          f.id === activeFloorId ? { ...f, rooms: [...f.rooms, newRoom] } : f
      );
      updateMeasurementProject({ ...activeMeasurement, floors: newFloors });
      setActiveRoomId(newRoom.id);
  };

  if (!activeMeasurement || !activeFloor || !activeRoom) return <div className="p-8 text-center">Загрузка модуля замеров...</div>;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center flex-none">
          <div className="flex items-center space-x-4">
             <h1 className="text-xl font-bold text-slate-800 flex items-center"><Ruler className="mr-2 text-blue-600"/> Замеры</h1>
             <div className="h-6 w-px bg-slate-200"></div>
             <select 
                className="p-2 border rounded-lg text-sm bg-slate-50 font-medium"
                value={selectedProjectId}
                onChange={e => { setSelectedProjectId(e.target.value); setActiveFloorId(''); }}
             >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>
          
          <div className="flex items-center space-x-4">
             {/* Mode Toggle */}
             <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button 
                    onClick={() => updateRoom({...activeRoom, mode: 'drawing'})}
                    className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center", activeRoom.mode === 'drawing' ? "bg-white shadow text-blue-600" : "text-slate-500")}
                 >
                    <Layout size={14} className="mr-1"/> Чертеж
                 </button>
                 <button 
                    onClick={() => updateRoom({...activeRoom, mode: 'manual'})}
                    className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center", activeRoom.mode === 'manual' ? "bg-white shadow text-amber-600" : "text-slate-500")}
                 >
                    <Edit2 size={14} className="mr-1"/> Ручной ввод
                 </button>
             </div>

             {/* View Toggle */}
             <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-100">
                 <button 
                   onClick={() => setViewMode('draw')}
                   className={clsx("px-4 py-1.5 rounded-md text-sm font-bold transition-all", viewMode === 'draw' ? "bg-blue-600 text-white shadow-sm" : "text-blue-600 hover:bg-blue-100")}
                 >
                    Редактор
                 </button>
                 <button 
                   onClick={() => setViewMode('calc')}
                   className={clsx("px-4 py-1.5 rounded-md text-sm font-bold transition-all", viewMode === 'calc' ? "bg-blue-600 text-white shadow-sm" : "text-blue-600 hover:bg-blue-100")}
                 >
                    Результаты
                 </button>
             </div>
          </div>
       </div>

       <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-none overflow-y-auto">
             <div className="p-4 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Этаж</label>
                <select 
                   className="w-full p-2 border rounded mb-4 text-sm bg-slate-50"
                   value={activeFloorId}
                   onChange={e => setActiveFloorId(e.target.value)}
                >
                   {activeMeasurement.floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                
                <div className="flex justify-between items-center mb-2">
                   <div className="text-xs font-bold text-slate-400 uppercase">Помещения</div>
                   <button onClick={addRoom} className="p-1 hover:bg-slate-100 rounded text-blue-600"><Plus size={16}/></button>
                </div>
                <div className="space-y-1">
                   {activeFloor.rooms.map(r => (
                      <button 
                         key={r.id}
                         onClick={() => setActiveRoomId(r.id)}
                         className={clsx(
                            "w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center group transition-colors",
                            activeRoomId === r.id ? "bg-blue-50 text-blue-700 font-bold border border-blue-100" : "hover:bg-slate-50 text-slate-600 border border-transparent"
                         )}
                      >
                         <span className="truncate">{r.name}</span>
                         {r.mode === 'manual' && <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" title="Ручной режим"></span>}
                      </button>
                   ))}
                </div>
             </div>
             
             {/* Room Properties */}
             <div className="p-4 bg-slate-50 flex-1 border-t border-slate-100">
                <h4 className="font-bold text-sm mb-3 text-slate-700">Свойства помещения</h4>
                <div className="space-y-3">
                   <div>
                      <label className="block text-xs text-slate-500 mb-1 font-medium">Название</label>
                      <input 
                         className="w-full p-2 border rounded text-sm bg-white" 
                         value={activeRoom.name} 
                         onChange={e => updateRoom({...activeRoom, name: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-xs text-slate-500 mb-1 font-medium">Высота потолка (мм)</label>
                      <input 
                         type="number"
                         className="w-full p-2 border rounded text-sm bg-white" 
                         value={activeRoom.height} 
                         onChange={e => updateRoom({...activeRoom, height: Number(e.target.value)})}
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 bg-slate-100 relative overflow-hidden">
             {viewMode === 'draw' ? (
                 activeRoom.mode === 'manual' ? (
                     <ManualInputView room={activeRoom} onUpdateRoom={updateRoom} />
                 ) : (
                     <FloorPlanEditor room={activeRoom} onUpdateRoom={updateRoom} />
                 )
             ) : (
                 <CalculationsView room={activeRoom} />
             )}
          </div>
       </div>
    </div>
  );
};
