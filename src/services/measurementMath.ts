import { 
  MeasurementRoom, 
  MeasurementCalcSnapshot, 
  MeasurementPoint, 
  MeasurementOpening,
  ManualWall,
  ManualOpening,
  AutoRectData,
  AutoRectOpening 
} from '../types';

// Constants
const SCALE_PIXELS_PER_METER = 50; 
const MM_PER_PIXEL = 1000 / SCALE_PIXELS_PER_METER;

// Helpers
const dist = (p1: MeasurementPoint, p2: MeasurementPoint) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const mmToM = (mm: number) => mm / 1000;

export const calculateRoomSnapshot = (room: MeasurementRoom): MeasurementCalcSnapshot => {
  if (room.mode === 'drawing') {
    return calculateDrawingMode(room);
  } else if (room.mode === 'manual') {
    return calculateManualMode(room);
  } else if (room.mode === 'auto_rect') {
    return calculateAutoRectMode(room);
  }
  return getEmptySnapshot();
};

const getEmptySnapshot = (): MeasurementCalcSnapshot => ({
  floorArea: 0,
  ceilingArea: 0,
  perimeter: 0,
  wallHeight: 0,
  wallAreaGross: 0,
  wallAreaNet: 0,
  roomVolume: 0,
  openingsArea: 0,
  doorCount: 0,
  windowCount: 0,
  doorArea: 0,
  windowArea: 0,
  windowSillLength: 0,
  slopeLength: 0
});

const calculateDrawingMode = (room: MeasurementRoom): MeasurementCalcSnapshot => {
  const points = room.points;
  const heightM = mmToM(room.height);
  
  if (points.length < 3) return getEmptySnapshot();

  // 1. Floor Area (Shoelace formula)
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  const areaPx = Math.abs(area) / 2;
  const floorArea = areaPx / (SCALE_PIXELS_PER_METER * SCALE_PIXELS_PER_METER);

  // 2. Perimeter
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const lenPx = dist(points[i], next);
    const lenM = lenPx / SCALE_PIXELS_PER_METER;
    perimeter += lenM;
  }

  // 3. Wall Areas
  const wallAreaGross = perimeter * heightM;
  
  // 4. Openings
  let openingsArea = 0;
  let doorCount = 0;
  let windowCount = 0;
  let doorArea = 0;
  let windowArea = 0;
  let windowSillLength = 0;
  let slopeLength = 0;

  room.openings.forEach(op => {
    const w = mmToM(op.width);
    const h = mmToM(op.height);
    const area = w * h;
    openingsArea += area;

    if (op.type === 'Window') {
      windowCount++;
      windowArea += area;
      windowSillLength += w;
    } else if (op.type === 'Door') {
      doorCount++;
      doorArea += area;
    }

    // Slopes (Perimeter of opening excluding bottom for doors?)
    // Standard approach: 2*h + w
    slopeLength += (2 * h + w); 
  });

  const wallAreaNet = Math.max(0, wallAreaGross - openingsArea);
  const roomVolume = floorArea * heightM;

  return {
    floorArea,
    ceilingArea: floorArea,
    perimeter,
    wallHeight: heightM,
    wallAreaGross,
    wallAreaNet,
    roomVolume,
    openingsArea,
    doorCount,
    windowCount,
    doorArea,
    windowArea,
    windowSillLength,
    slopeLength
  };
};

const calculateManualMode = (room: MeasurementRoom): MeasurementCalcSnapshot => {
  const walls = room.manualWalls || [];
  const heightM = mmToM(room.height);

  let perimeter = 0;
  let openingsArea = 0;
  let doorCount = 0;
  let windowCount = 0;
  let doorArea = 0;
  let windowArea = 0;
  let windowSillLength = 0;
  let slopeLength = 0;

  walls.forEach(wall => {
    const lenM = mmToM(wall.length);
    perimeter += lenM;

    wall.openings.forEach(op => {
        const w = mmToM(op.width);
        const h = mmToM(op.height);
        
        // Count area for everything except maybe empty? 
        // Assume 'Empty' is a hole, so it subtracts wall area.
        const area = w * h;
        openingsArea += area;

        if (op.type === 'Window') {
            windowCount++;
            windowArea += area;
            windowSillLength += w;
            slopeLength += (2 * h + w);
        } else if (op.type === 'Door') {
            doorCount++;
            doorArea += area;
            slopeLength += (2 * h + w);
        } else if (op.type === 'Empty') {
             // Just subtraction, no slope? Or slopes too?
             // Usually a proem needs finishing too.
             slopeLength += (2 * h + w);
        }
    });
  });

  const wallAreaGross = perimeter * heightM;
  const wallAreaNet = Math.max(0, wallAreaGross - openingsArea);
  
  let floorArea = 0;
  // Calculate polygon points from walls
  const points: {x: number, y: number}[] = [{x: 0, y: 0}];
  let cx = 0, cy = 0;
  
  // Note: Directions are relative. 
  // 'Up' usually means Y decreases in screen coords, or Y increases in cartesian.
  // It doesn't matter for area as long as it's consistent.
  walls.forEach(w => {
      const len = w.length; // mm
      if (w.direction === 'Right') cx += len;
      if (w.direction === 'Left') cx -= len;
      if (w.direction === 'Up') cy -= len; 
      if (w.direction === 'Down') cy += len;
      points.push({x: cx, y: cy});
  });
  
  let areaMm2 = 0;
  for (let i = 0; i < points.length - 1; i++) {
     areaMm2 += points[i].x * points[i+1].y;
     areaMm2 -= points[i+1].x * points[i].y;
  }
  // Close loop
  if (points.length > 1) {
      areaMm2 += points[points.length-1].x * points[0].y;
      areaMm2 -= points[0].x * points[points.length-1].y;
  }
  
  floorArea = Math.abs(areaMm2) / 2 / 1_000_000; // mm2 to m2

  const roomVolume = floorArea * heightM;

  return {
    floorArea,
    ceilingArea: floorArea,
    perimeter,
    wallHeight: heightM,
    wallAreaGross,
    wallAreaNet,
    roomVolume,
    openingsArea,
    doorCount,
    windowCount,
    doorArea,
    windowArea,
    windowSillLength,
    slopeLength
  };
};

const calculateAutoRectMode = (room: MeasurementRoom): MeasurementCalcSnapshot => {
  const data = room.autoRectData;
  if (!data) return getEmptySnapshot();

  const lengthM = mmToM(data.length);
  const widthM = mmToM(data.width);
  const heightM = mmToM(data.height);

  const floorArea = lengthM * widthM;
  const perimeter = 2 * (lengthM + widthM);
  const wallAreaGross = perimeter * heightM;

  let openingsArea = 0;
  let doorCount = 0;
  let windowCount = 0;
  let doorArea = 0;
  let windowArea = 0;
  let windowSillLength = 0;
  let slopeLength = 0;

  data.openings.forEach(op => {
      const w = mmToM(op.width);
      const h = mmToM(op.height);
      const area = w * h;
      openingsArea += area;

      if (op.type === 'Window') {
          windowCount++;
          windowArea += area;
          windowSillLength += w;
      } else if (op.type === 'Door') {
          doorCount++;
          doorArea += area;
      }
      
      // Slopes
      slopeLength += (2 * h + w);
  });

  const wallAreaNet = Math.max(0, wallAreaGross - openingsArea);
  const roomVolume = floorArea * heightM;

  return {
    floorArea,
    ceilingArea: floorArea,
    perimeter,
    wallHeight: heightM,
    wallAreaGross,
    wallAreaNet,
    roomVolume,
    openingsArea,
    doorCount,
    windowCount,
    doorArea,
    windowArea,
    windowSillLength,
    slopeLength
  };
};
