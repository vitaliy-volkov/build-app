
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../App';
import { MeasurementProject, MeasurementFloor, MeasurementRoom, MeasurementPoint, MeasurementOpening, ManualMeasurementStats, ManualWall, ManualOpening, AutoRectData, AutoRectOpening, MeasurementCalcSnapshot } from '../types';
import { calculateRoomSnapshot } from '../services/measurementMath';
import { 
  Ruler, Plus, Maximize, Layers, Layout, MousePointer2, 
  Trash2, Save, ChevronDown, Calculator, Edit2, X, 
  ArrowRight, Box, Move, DoorOpen, AppWindow, ArrowUp, ArrowLeft, ArrowDown, ScanLine,
  Download, FileText, Square
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

// --- Constants ---
const GRID_SIZE = 25; // Pixels per grid step
const SCALE_PIXELS_PER_METER = 50; // 50px = 1 meter. 1px = 20mm.
const MM_PER_PIXEL = 1000 / SCALE_PIXELS_PER_METER; // 20mm

// --- Math Utils ---

const dist = (p1: MeasurementPoint, p2: MeasurementPoint) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

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
  return areaPx / (SCALE_PIXELS_PER_METER * SCALE_PIXELS_PER_METER);
};

const calculatePerimeterM = (points: MeasurementPoint[]) => {
  if (points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    if (i === points.length - 1 && points.length < 3) continue; 
    p += dist(points[i], next);
  }
  return p / SCALE_PIXELS_PER_METER;
};

const getWallLengthMm = (p1: MeasurementPoint, p2: MeasurementPoint) => {
    return dist(p1, p2) * MM_PER_PIXEL;
};

// --- Components ---

// 1. Interactive Floor Plan Editor (Drawing Mode)
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
    if (drawing || room.points.length === 0) {
        setDrawing(true);
        const newPoints = [...room.points, cursorPos];
        if (room.points.length > 2) {
            const d = dist(cursorPos, room.points[0]);
            if (d < 15) {
                setDrawing(false); 
                return;
            }
        }
        onUpdateRoom({ ...room, points: newPoints });
    } else {
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
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
       {/* Editor Toolbar */}
       <div className="bg-slate-50 border-b border-slate-200 p-2 flex justify-between items-center text-xs">
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
       <div className="flex-1 relative overflow-hidden select-none bg-slate-50/50">
          <svg 
            ref={svgRef}
            width="100%" height="100%" 
            className="absolute inset-0"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
          >
             <defs>
                <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                   <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#grid)" />

             {room.points.length > 2 && (
                <polygon points={pointsString} fill="rgba(59, 130, 246, 0.1)" stroke="none"/>
             )}

             {room.points.map((p, i) => {
                 const nextIndex = (i + 1) % room.points.length;
                 if (drawing && i === room.points.length - 1) return null;

                 const pNext = room.points[nextIndex];
                 const isSelected = selectedWallIndex === i;
                 const mx = (p.x + pNext.x) / 2;
                 const my = (p.y + pNext.y) / 2;
                 const lenM = (dist(p, pNext) / SCALE_PIXELS_PER_METER).toFixed(2);

                 return (
                    <g key={i}>
                        <line 
                           x1={p.x} y1={p.y} x2={pNext.x} y2={pNext.y}
                           stroke={isSelected ? "#ef4444" : "#2563eb"}
                           strokeWidth={isSelected ? 4 : 3}
                           className="transition-all"
                        />
                        <line 
                           x1={p.x} y1={p.y} x2={pNext.x} y2={pNext.y}
                           stroke="transparent" strokeWidth={20} cursor="pointer"
                           onClick={(e) => { e.stopPropagation(); if (!drawing) setSelectedWallIndex(i); }}
                        />
                        <rect x={mx-15} y={my-8} width={30} height={16} fill="white" rx="4" opacity="0.8" />
                        <text x={mx} y={my} textAnchor="middle" dy="4" fontSize="10" fill="#334155" fontWeight="bold" pointerEvents="none">{lenM}m</text>
                        
                        {room.openings.filter(o => o.wallIndex === i).map(op => {
                            const offsetPx = op.distanceFromStart / MM_PER_PIXEL;
                            const widthPx = op.width / MM_PER_PIXEL;
                            const dx = pNext.x - p.x;
                            const dy = pNext.y - p.y;
                            const wallLenPx = Math.sqrt(dx*dx + dy*dy);
                            const ux = dx / wallLenPx;
                            const uy = dy / wallLenPx;
                            const ox = p.x + ux * offsetPx;
                            const oy = p.y + uy * offsetPx;
                            const oex = ox + ux * widthPx;
                            const oey = oy + uy * widthPx;

                            return (
                                <g key={op.id} onClick={(e) => { e.stopPropagation(); if(confirm('Удалить проем?')) deleteOpening(op.id); }} cursor="pointer">
                                    <line x1={ox} y1={oy} x2={oex} y2={oey} stroke={op.type === 'Door' ? '#92400e' : '#06b6d4'} strokeWidth={6} />
                                    <title>{op.type}: {op.width}x{op.height}mm</title>
                                </g>
                            );
                        })}
                    </g>
                 )
             })}

             {drawing && room.points.length > 0 && (
                <line 
                   x1={room.points[room.points.length-1].x} y1={room.points[room.points.length-1].y}
                   x2={cursorPos.x} y2={cursorPos.y}
                   stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" pointerEvents="none"
                />
             )}

             {room.points.map((p, i) => (
                 <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
             ))}
             
             <circle cx={cursorPos.x} cy={cursorPos.y} r="3" fill="#ef4444" opacity="0.5" pointerEvents="none" />
          </svg>
       </div>

       {isOpeningModalOpen && (
           <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
               <div className="bg-white p-6 rounded-xl shadow-xl w-72">
                   <h3 className="font-bold mb-4 text-slate-800">Добавить {newOpeningType === 'Door' ? 'Дверь' : 'Окно'}</h3>
                   <form onSubmit={(e) => {
                       e.preventDefault();
                       const data = new FormData(e.currentTarget);
                       saveOpening(Number(data.get('width')), Number(data.get('height')), Number(data.get('offset')));
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

// 2. Read-Only Visualizer (For Manual/Auto Modes)
const RoomVisualizer = ({ room }: { room: MeasurementRoom }) => {
    // Generate points based on mode
    const points = useMemo(() => {
        if (room.mode === 'drawing') return room.points;
        
        // Manual Mode Points
        if (room.mode === 'manual' && room.manualWalls) {
            const pts: MeasurementPoint[] = [{x: 300, y: 300}];
            let currentX = 300;
            let currentY = 300;
            room.manualWalls.forEach(w => {
                const lenPx = w.length / MM_PER_PIXEL;
                if (w.direction === 'Right') currentX += lenPx;
                if (w.direction === 'Left') currentX -= lenPx;
                if (w.direction === 'Up') currentY -= lenPx;
                if (w.direction === 'Down') currentY += lenPx;
                pts.push({x: currentX, y: currentY});
            });
            return pts;
        }

        // Auto Rect Mode Points
        if (room.mode === 'auto_rect' && room.autoRectData) {
            const { length, width } = room.autoRectData;
            const lPx = length / MM_PER_PIXEL;
            const wPx = width / MM_PER_PIXEL;
            const startX = 100, startY = 100;
            return [
                {x: startX, y: startY},
                {x: startX + lPx, y: startY},
                {x: startX + lPx, y: startY + wPx},
                {x: startX, y: startY + wPx}
            ];
        }

        return [];
    }, [room]);

    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="w-full h-full bg-slate-50 relative overflow-hidden rounded-xl border border-slate-200">
            <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-[10px] font-bold text-slate-400 pointer-events-none border border-slate-100 z-10">
                Чертеж / План
            </div>
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#smallGrid)" />
                
                {points.length > 0 && (
                    <g transform="translate(0,0)"> 
                        <polygon 
                            points={pointsString} 
                            fill="rgba(59, 130, 246, 0.1)" 
                            stroke="#2563eb" 
                            strokeWidth="3" 
                        />
                        {points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#2563eb" strokeWidth="2" />
                        ))}
                    </g>
                )}
            </svg>
        </div>
    );
};

// 3. Manual Walls Input
const ManualInputView = ({ room, onUpdateRoom }: { room: MeasurementRoom, onUpdateRoom: (r: MeasurementRoom) => void }) => {
    const walls = room.manualWalls || [];
    const [newOpeningModal, setNewOpeningModal] = useState<{ open: boolean, wallId: string | null }>({ open: false, wallId: null });

    const addWall = () => {
        const newWall: ManualWall = {
            id: uuidv4(), direction: 'Right', length: 3000, openings: []
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

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Список стен</h3>
                <button onClick={addWall} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center shadow-sm hover:bg-blue-700">
                    <Plus size={14} className="mr-1"/> Добавить
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {walls.length === 0 && (
                    <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl text-sm">
                        Стен нет. Добавьте первую.
                    </div>
                )}
                {walls.map((wall, idx) => (
                    <div key={wall.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-[10px]">#{idx + 1}</div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="flex bg-slate-100 rounded p-0.5">
                                    {[{ val: 'Up', icon: ArrowUp }, { val: 'Right', icon: ArrowRight }, { val: 'Down', icon: ArrowDown }, { val: 'Left', icon: ArrowLeft }].map((dir: any) => (
                                        <button key={dir.val} onClick={() => updateWall(wall.id, { direction: dir.val })} className={clsx("flex-1 rounded flex items-center justify-center", wall.direction === dir.val ? "bg-white shadow text-blue-600" : "text-slate-400")} title={dir.val}>
                                            <dir.icon size={14} />
                                        </button>
                                    ))}
                                </div>
                                <input type="number" value={wall.length} onChange={e => updateWall(wall.id, { length: Number(e.target.value) })} className="w-full p-1 border rounded text-xs font-bold" placeholder="Длина (мм)" />
                            </div>
                            <button onClick={() => deleteWall(wall.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                        
                        <div className="space-y-2">
                            {wall.openings.map(op => (
                                <div key={op.id} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 text-xs">
                                    <span className="flex items-center">
                                        <span className={clsx("w-1.5 h-1.5 rounded-full mr-2", op.type==='Window'?"bg-cyan-400":op.type==='Door'?"bg-amber-600":"bg-slate-400")}></span>
                                        {op.type === 'Window' ? 'Окно' : 'Дверь'} {op.width}x{op.height}
                                    </span>
                                    <button onClick={() => removeOpening(wall.id, op.id)}><X size={12} className="text-slate-400 hover:text-red-500"/></button>
                                </div>
                            ))}
                            <button onClick={() => setNewOpeningModal({ open: true, wallId: wall.id })} className="w-full py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 flex items-center justify-center">
                                <Plus size={12} className="mr-1"/> Проем
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {newOpeningModal.open && (
                <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-72">
                        <h3 className="font-bold mb-4 text-slate-800">Добавить проем</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const d = new FormData(e.currentTarget);
                            addOpening(newOpeningModal.wallId!, d.get('type') as any, Number(d.get('width')), Number(d.get('height')), Number(d.get('offset')));
                        }} className="space-y-3">
                            <select name="type" className="w-full p-2 border rounded">
                                <option value="Window">Окно</option>
                                <option value="Door">Дверь</option>
                                <option value="Empty">Проем</option>
                            </select>
                            <input name="width" type="number" placeholder="Ширина" className="w-full p-2 border rounded" required />
                            <input name="height" type="number" placeholder="Высота" className="w-full p-2 border rounded" required />
                            <input name="offset" type="number" placeholder="Отступ" className="w-full p-2 border rounded" required />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setNewOpeningModal({ open: false, wallId: null })} className="flex-1 py-2 bg-slate-100 rounded">Отмена</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded">OK</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Auto Rectangle Form (New)
const AutoRectRoomForm = ({ room, onUpdateRoom }: { room: MeasurementRoom, onUpdateRoom: (r: MeasurementRoom) => void }) => {
    const data = room.autoRectData || { length: 4000, width: 3000, height: 2700, openings: [] };
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

    const updateData = (updates: Partial<AutoRectData>) => {
        onUpdateRoom({ ...room, autoRectData: { ...data, ...updates } });
    };

    const addOpening = (op: AutoRectOpening) => {
        updateData({ openings: [...data.openings, op] });
        setIsOpeningModalOpen(false);
    };

    const removeOpening = (id: string) => {
        updateData({ openings: data.openings.filter(o => o.id !== id) });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Параметры комнаты</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs text-slate-500 font-bold block mb-1">Длина (мм)</label>
                       <input type="number" value={data.length} onChange={e => updateData({ length: Number(e.target.value) })} className="w-full p-2 border rounded font-bold text-slate-700"/>
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 font-bold block mb-1">Ширина (мм)</label>
                       <input type="number" value={data.width} onChange={e => updateData({ width: Number(e.target.value) })} className="w-full p-2 border rounded font-bold text-slate-700"/>
                   </div>
                   <div className="col-span-2">
                       <label className="text-xs text-slate-500 font-bold block mb-1">Высота (мм)</label>
                       <input type="number" value={data.height} onChange={e => updateData({ height: Number(e.target.value) })} className="w-full p-2 border rounded font-bold text-slate-700"/>
                   </div>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-700">Проемы</h4>
                    <button onClick={() => setIsOpeningModalOpen(true)} className="text-blue-600 text-xs font-bold hover:underline">+ Добавить</button>
                </div>
                
                <div className="space-y-2">
                    {data.openings.length === 0 && <div className="text-slate-400 text-xs italic">Нет добавленных проемов</div>}
                    {data.openings.map(op => (
                        <div key={op.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                             <div>
                                 <span className="font-bold block">{op.type === 'Window' ? 'Окно' : 'Дверь'}</span>
                                 <span className="text-slate-500">{op.width}x{op.height} мм</span>
                                 {op.depth && <span className="text-slate-400 ml-2">Глуб: {op.depth}</span>}
                             </div>
                             <button onClick={() => removeOpening(op.id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {isOpeningModalOpen && (
                <div className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-72">
                        <h3 className="font-bold mb-4 text-slate-800">Добавить проем</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const d = new FormData(e.currentTarget);
                            addOpening({
                                id: uuidv4(),
                                type: d.get('type') as any,
                                width: Number(d.get('width')),
                                height: Number(d.get('height')),
                                depth: Number(d.get('depth')),
                                distanceFromFloor: Number(d.get('dist'))
                            });
                        }} className="space-y-3">
                            <select name="type" className="w-full p-2 border rounded">
                                <option value="Window">Окно</option>
                                <option value="Door">Дверь</option>
                                <option value="Empty">Проем</option>
                            </select>
                            <input name="width" type="number" placeholder="Ширина" className="w-full p-2 border rounded" required />
                            <input name="height" type="number" placeholder="Высота" className="w-full p-2 border rounded" required />
                            <input name="depth" type="number" placeholder="Глубина" className="w-full p-2 border rounded" />
                            <input name="dist" type="number" placeholder="Высота от пола" className="w-full p-2 border rounded" />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded">Отмена</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded">OK</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// 5. Metrics Panel
const MetricsPanel = ({ room }: { room: MeasurementRoom }) => {
    const calc = room.calculations || calculateRoomSnapshot(room);
    
    const { 
        floorArea, perimeter, wallAreaNet, roomVolume, openingsArea,
        ceilingArea, wallHeight, wallAreaGross, doorCount, windowCount,
        doorArea, windowArea, windowSillLength, slopeLength
    } = calc;

    const exportData = () => {
        const text = `
Экспорт измерений: ${room.name}
-----------------------------
Площадь пола: ${floorArea.toFixed(2)} м2
Площадь потолка: ${ceilingArea.toFixed(2)} м2
Периметр: ${perimeter.toFixed(2)} м
Высота стен: ${wallHeight.toFixed(2)} м
Площадь стен (брутто): ${wallAreaGross.toFixed(2)} м2
Площадь стен (нетто): ${wallAreaNet.toFixed(2)} м2
Объем: ${roomVolume.toFixed(2)} м3
Площадь проемов: ${openingsArea.toFixed(2)} м2
-----------------------------
Кол-во дверей: ${doorCount}
Площадь дверей: ${doorArea.toFixed(2)} м2
Кол-во окон: ${windowCount}
Площадь окон: ${windowArea.toFixed(2)} м2
Длина подоконников: ${windowSillLength.toFixed(2)} м
Длина откосов: ${slopeLength.toFixed(2)} м
        `.trim();
        const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${room.name}_metrics.txt`;
        a.click();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                 <h3 className="font-bold text-slate-800">Результаты</h3>
                 <button onClick={exportData} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Экспорт"><Download size={16}/></button>
             </div>
             
             <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                 <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <div className="text-xs text-slate-500 mb-1">Площадь пола</div>
                         <div className="text-xl font-bold text-slate-800">{floorArea.toFixed(2)}</div>
                         <div className="text-[10px] text-slate-400">кв. метров</div>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <div className="text-xs text-slate-500 mb-1">Стены (нетто)</div>
                         <div className="text-xl font-bold text-slate-800">{wallAreaNet.toFixed(2)}</div>
                         <div className="text-[10px] text-slate-400">кв. метров</div>
                     </div>
                 </div>

                 <div className="space-y-2 text-sm">
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Периметр</span>
                         <span className="font-medium">{perimeter.toFixed(2)} м</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Объем</span>
                         <span className="font-medium">{roomVolume.toFixed(2)} м3</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Площадь потолка</span>
                         <span className="font-medium">{ceilingArea.toFixed(2)} м2</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Площадь стен (брутто)</span>
                         <span className="font-medium">{wallAreaGross.toFixed(2)} м2</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Площадь проемов</span>
                         <span className="font-medium text-red-500">-{openingsArea.toFixed(2)} м2</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Откосы (длина)</span>
                         <span className="font-medium">{slopeLength.toFixed(2)} м</span>
                     </div>
                     <div className="flex justify-between py-1 border-b border-slate-50">
                         <span className="text-slate-500">Подоконники</span>
                         <span className="font-medium">{windowSillLength.toFixed(2)} м</span>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Main Page Component ---

export const Measurements = () => {
  const { measurements, addMeasurementProject, updateMeasurementProject, projects } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Debug logging
  useEffect(() => {
      console.log('Measurements: projects count=', projects.length, 'selectedProjectId=', selectedProjectId);
      console.log('Measurements: measurements count=', measurements.length, 'measurements=', measurements.map(m => m.projectId));
  }, [projects, measurements, selectedProjectId]);
  
  // Update selected project when projects are loaded
  useEffect(() => {
      if (projects.length > 0 && !selectedProjectId) {
          console.log('Measurements: setting selectedProjectId to', projects[0].id);
          setSelectedProjectId(projects[0].id);
      }
  }, [projects, selectedProjectId]);
  
  // Use useMemo to prevent recalculation on every render
  const activeMeasurement = useMemo(() => 
      measurements.find(m => m.projectId === selectedProjectId),
      [measurements, selectedProjectId]
  );
  
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string>('');

  // Create measurement project if it doesn't exist
  useEffect(() => {
      console.log('Measurements: checking creation - selectedProjectId=', selectedProjectId, 'activeMeasurement=', !!activeMeasurement, 'isInitializing=', isInitializing);
      if (selectedProjectId && !activeMeasurement && !isInitializing) {
          console.log('Measurements: creating new measurement project for', selectedProjectId);
          setIsInitializing(true);
          const initRoom: MeasurementRoom = {
              id: uuidv4(), name: 'Помещение 1', height: 2700, points: [], openings: [], mode: 'drawing', manualWalls: []
          };
          initRoom.calculations = calculateRoomSnapshot(initRoom);

          const newMp: MeasurementProject = {
              id: uuidv4(),
              projectId: selectedProjectId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              floors: [{
                  id: uuidv4(),
                  name: '1 Этаж',
                  rooms: [initRoom]
              }]
          };
          addMeasurementProject(newMp);
          console.log('Measurements: added new measurement project');
      }
  }, [selectedProjectId, activeMeasurement, isInitializing, addMeasurementProject]);
  
  // Reset isInitializing when measurement appears
  useEffect(() => {
      if (activeMeasurement && isInitializing) {
          setIsInitializing(false);
      }
  }, [activeMeasurement, isInitializing]);

  // Set active floor/room when measurement is created
  useEffect(() => {
      console.log('Measurements: setting floor/room - activeMeasurement=', !!activeMeasurement, 'activeFloorId=', activeFloorId);
      if (activeMeasurement && !activeFloorId) {
          console.log('Measurements: setting floor', activeMeasurement.floors[0].id, 'room', activeMeasurement.floors[0].rooms[0].id);
          setActiveFloorId(activeMeasurement.floors[0].id);
          setActiveRoomId(activeMeasurement.floors[0].rooms[0].id);
      }
  }, [activeMeasurement, activeFloorId]);

  const activeFloor = activeMeasurement?.floors.find(f => f.id === activeFloorId);
  const activeRoom = activeFloor?.rooms.find(r => r.id === activeRoomId);

  const updateRoom = (updatedRoom: MeasurementRoom) => {
      if (!activeMeasurement || !activeFloor) return;
      
      // Calculate and persist snapshot
      const snapshot = calculateRoomSnapshot(updatedRoom);
      const roomWithCalc = { ...updatedRoom, calculations: snapshot };

      const newFloors = activeMeasurement.floors.map(f => {
          if (f.id === activeFloorId) {
              return { ...f, rooms: f.rooms.map(r => r.id === activeRoomId ? roomWithCalc : r) };
          }
          return f;
      });
      updateMeasurementProject({ ...activeMeasurement, floors: newFloors, updated_at: new Date().toISOString() });
  };

  const addRoom = () => {
      if (!activeMeasurement || !activeFloor) return;
      const newRoom: MeasurementRoom = {
          id: uuidv4(), name: `Новое помещение`, height: 2700, points: [], openings: [], mode: 'drawing', manualWalls: []
      };
      // Initial calc
      newRoom.calculations = calculateRoomSnapshot(newRoom);

      const newFloors = activeMeasurement.floors.map(f => 
          f.id === activeFloorId ? { ...f, rooms: [...f.rooms, newRoom] } : f
      );
      updateMeasurementProject({ ...activeMeasurement, floors: newFloors, updated_at: new Date().toISOString() });
      setActiveRoomId(newRoom.id);
  };

  // Show message when no projects available
  if (projects.length === 0) {
      return <div className="p-8 text-center text-slate-500">Нет доступных проектов. Создайте проект для начала работы с замерами.</div>;
  }
  
  // Show loading while measurement is being initialized
  if (!activeMeasurement || !activeFloor || !activeRoom) {
      return <div className="p-8 text-center text-slate-500">Инициализация модуля замеров...</div>;
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-100">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center flex-none">
          <div className="flex items-center space-x-4">
             <h1 className="text-lg font-bold text-slate-800 flex items-center"><Ruler className="mr-2 text-blue-600"/> Замеры</h1>
             <div className="h-6 w-px bg-slate-200"></div>
             <select 
                className="p-1.5 border rounded-lg text-sm bg-slate-50 font-medium"
                value={selectedProjectId}
                onChange={e => { setSelectedProjectId(e.target.value); setActiveFloorId(''); }}
             >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
             {[
                 { id: 'drawing', label: 'Чертеж', icon: Layout },
                 { id: 'manual', label: 'Ручной ввод', icon: Edit2 },
                 { id: 'auto_rect', label: 'Прямоугольник', icon: Square }
             ].map((m: any) => (
                 <button 
                    key={m.id}
                    onClick={() => updateRoom({...activeRoom, mode: m.id})}
                    className={clsx(
                        "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center", 
                        activeRoom.mode === m.id ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
                    )}
                 >
                    <m.icon size={14} className="mr-1.5"/> {m.label}
                 </button>
             ))}
          </div>
       </div>

       <div className="flex flex-1 overflow-hidden p-4 gap-4">
          {/* 1. Sidebar (Navigation) */}
          <div className="w-60 flex flex-col flex-none gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-y-auto">
                 <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Этаж</label>
                    <select 
                       className="w-full p-2 border rounded mb-2 text-sm bg-slate-50"
                       value={activeFloorId}
                       onChange={e => setActiveFloorId(e.target.value)}
                    >
                       {activeMeasurement.floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                 </div>
                 
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
                       </button>
                    ))}
                 </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                 <h4 className="font-bold text-sm mb-3 text-slate-700">Свойства</h4>
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
                       <label className="block text-xs text-slate-500 mb-1 font-medium">Высота (мм)</label>
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

          {/* 2. Main Input Area (Center) */}
          <div className="flex-1 flex flex-col min-w-0">
             {activeRoom.mode === 'drawing' && (
                 <FloorPlanEditor room={activeRoom} onUpdateRoom={updateRoom} />
             )}
             {activeRoom.mode === 'manual' && (
                 <ManualInputView room={activeRoom} onUpdateRoom={updateRoom} />
             )}
             {activeRoom.mode === 'auto_rect' && (
                 <AutoRectRoomForm room={activeRoom} onUpdateRoom={updateRoom} />
             )}
          </div>

          {/* 3. Preview & Metrics (Right) */}
          <div className="w-80 flex flex-col flex-none gap-4">
              {activeRoom.mode !== 'drawing' && (
                  <div className="h-64 flex-none">
                      <RoomVisualizer room={activeRoom} />
                  </div>
              )}
              <div className="flex-1">
                  <MetricsPanel room={activeRoom} />
              </div>
          </div>
       </div>
    </div>
  );
};

export default Measurements;
