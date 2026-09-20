export interface SamalHouseLot {
  id: string;
  lotNumber: number;
  blockNumber: number;
  name: string;
  polygonLatLon: [number, number][];
  polygonLonLat: [number, number][];
  center: [number, number];
}

export interface SamalSubdivisionData {
  id: string;
  name: string;
  center: [number, number];
  zoomThreshold: number;
  boundaryLatLon: [number, number][];
  boundaryLonLat: [number, number][];
  lots: SamalHouseLot[];
}

const CENTER_LAT = 7.1053089;
const CENTER_LNG = 125.668114;
const D_LAT_1M = 1 / 110574;
const D_LNG_1M = 1 / 110463;

const LOT_WIDTH = 14 * D_LNG_1M;
const LOT_DEPTH = 18 * D_LAT_1M;
const LOT_GAP = 3 * D_LNG_1M;
const ROAD_GAP = 8 * D_LAT_1M;
const TOTAL_LOTS_PER_ROW = 6;

const TOTAL_WIDTH =
  TOTAL_LOTS_PER_ROW * LOT_WIDTH + (TOTAL_LOTS_PER_ROW - 1) * LOT_GAP;
const START_LNG = CENTER_LNG - TOTAL_WIDTH / 2;

function generateLots(): SamalHouseLot[] {
  const lots: SamalHouseLot[] = [];

  // Generate North row lots (Block 1)
  const r1StartLat = CENTER_LAT + ROAD_GAP / 2;
  for (let i = 0; i < TOTAL_LOTS_PER_ROW; i++) {
    const x0 = START_LNG + i * (LOT_WIDTH + LOT_GAP);
    const x1 = x0 + LOT_WIDTH;
    const y0 = r1StartLat;
    const y1 = y0 + LOT_DEPTH;
    lots.push({
      id: `samal-b1-l${i + 1}`,
      lotNumber: i + 1,
      blockNumber: 1,
      name: `Block 1 Lot ${i + 1}`,
      polygonLatLon: [
        [y0, x0],
        [y1, x0],
        [y1, x1],
        [y0, x1],
        [y0, x0],
      ],
      polygonLonLat: [
        [x0, y0],
        [x0, y1],
        [x1, y1],
        [x1, y0],
        [x0, y0],
      ],
      center: [(y0 + y1) / 2, (x0 + x1) / 2],
    });
  }

  // Generate South row lots (Block 2)
  const r2StartLat = CENTER_LAT - ROAD_GAP / 2 - LOT_DEPTH;
  for (let i = 0; i < TOTAL_LOTS_PER_ROW; i++) {
    const x0 = START_LNG + i * (LOT_WIDTH + LOT_GAP);
    const x1 = x0 + LOT_WIDTH;
    const y0 = r2StartLat;
    const y1 = y0 + LOT_DEPTH;
    lots.push({
      id: `samal-b2-l${i + 1}`,
      lotNumber: i + 1,
      blockNumber: 2,
      name: `Block 2 Lot ${i + 1}`,
      polygonLatLon: [
        [y0, x0],
        [y1, x0],
        [y1, x1],
        [y0, x1],
        [y0, x0],
      ],
      polygonLonLat: [
        [x0, y0],
        [x0, y1],
        [x1, y1],
        [x1, y0],
        [x0, y0],
      ],
      center: [(y0 + y1) / 2, (x0 + x1) / 2],
    });
  }

  return lots;
}

const PAD_X = 10 * D_LNG_1M;
const PAD_Y = 10 * D_LAT_1M;
const BOUND_X0 = START_LNG - PAD_X;
const BOUND_X1 = START_LNG + TOTAL_WIDTH + PAD_X;
const BOUND_Y0 = CENTER_LAT - ROAD_GAP / 2 - LOT_DEPTH - PAD_Y;
const BOUND_Y1 = CENTER_LAT + ROAD_GAP / 2 + LOT_DEPTH + PAD_Y;

export const SAMAL_SUBDIVISION: SamalSubdivisionData = {
  id: "samal-island-estates",
  name: "Samal Island Subdivision",
  center: [CENTER_LAT, CENTER_LNG],
  zoomThreshold: 17,
  boundaryLatLon: [
    [BOUND_Y0, BOUND_X0],
    [BOUND_Y1, BOUND_X0],
    [BOUND_Y1, BOUND_X1],
    [BOUND_Y0, BOUND_X1],
    [BOUND_Y0, BOUND_X0],
  ],
  boundaryLonLat: [
    [BOUND_X0, BOUND_Y0],
    [BOUND_X0, BOUND_Y1],
    [BOUND_X1, BOUND_Y1],
    [BOUND_X1, BOUND_Y0],
    [BOUND_X0, BOUND_Y0],
  ],
  lots: generateLots(),
};
