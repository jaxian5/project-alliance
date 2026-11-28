export const WIDTH = 8;
export const HEIGHT = 6;

const ROWS = ["LLLLLLLL", "LLLLLLLL", "LLLSSLLL", "LLLSSLLL", "LLLLLLLL", "LLLLLLLL"];

export function isLand(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return false;
  return ROWS[y]![x] === "L";
}

export function landCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (isLand(x, y)) cells.push({ x, y });
    }
  }
  return cells;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isWalkable(x: number, y: number, size: number, sea: ReadonlySet<string>): boolean {
  if (x < 0 || y < 0 || x >= size || y >= size) return false;
  return !sea.has(cellKey(x, y));
}

export function landSpawn(size: number, sea: ReadonlySet<string>): { x: number; y: number } {
  const center = Math.floor(size / 2);
  if (!sea.has(cellKey(center, center))) return { x: center, y: center };
  let best = { x: 0, y: 0 };
  let bestDist = Number.POSITIVE_INFINITY;
  let found = false;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (sea.has(cellKey(x, y))) continue;
      const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
      if (dist < bestDist) {
        bestDist = dist;
        best = { x, y };
        found = true;
      }
    }
  }
  return found ? best : { x: 0, y: 0 };
}

const STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** A few islands of sea. New tiles grow from a tile already in the island. */
export function generateSeaCells(size: number, rng: () => number = Math.random): string[] {
  const safe = Math.max(2, Math.floor(size));
  const target = Math.max(safe, Math.round(safe * safe * 0.16));
  const blobs = Math.max(1, Math.round(safe / 10));
  const sea = new Set<string>();

  for (let blob = 0; blob < blobs && sea.size < target; blob += 1) {
    const quota = Math.ceil((target - sea.size) / (blobs - blob));
    const members: { x: number; y: number }[] = [];
    let x = Math.floor(rng() * safe);
    let y = Math.floor(rng() * safe);
    let guard = 0;
    while (members.length < quota && sea.size < target && guard < quota * 16) {
      guard += 1;
      const id = cellKey(x, y);
      if (!sea.has(id)) {
        sea.add(id);
        members.push({ x, y });
      }
      const from = members[Math.floor(rng() * members.length)] ?? { x, y };
      const [dx, dy] = STEPS[Math.floor(rng() * STEPS.length)]!;
      const nx = from.x + dx;
      const ny = from.y + dy;
      if (nx < 0 || ny < 0 || nx >= safe || ny >= safe) {
        x = from.x;
        y = from.y;
      } else {
        x = nx;
        y = ny;
      }
    }
  }

  return [...sea];
}

export function seaInBounds(cells: readonly string[], size: number): string[] {
  const kept: string[] = [];
  for (const cell of cells) {
    const parts = cell.split(",");
    if (parts.length !== 2) continue;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    kept.push(cellKey(x, y));
  }
  return kept;
}
