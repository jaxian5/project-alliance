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

/** Every land square can still be reached by an orthogonal walk. Peninsulas and 1-wide landways count; islands do not. */
export function landIsConnected(size: number, sea: ReadonlySet<string>): boolean {
  const n = size;
  if (n <= 0) return false;
  let total = 0;
  let start = -1;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (sea.has(cellKey(x, y))) continue;
      total += 1;
      start = x + y * n;
    }
  }
  if (total === 0 || start < 0) return false;
  const seen = new Uint8Array(n * n);
  const stack = [start];
  seen[start] = 1;
  let reached = 0;
  while (stack.length > 0) {
    const i = stack.pop()!;
    reached += 1;
    const x = i % n;
    const y = (i - x) / n;
    if (x + 1 < n && !seen[i + 1] && !sea.has(cellKey(x + 1, y))) {
      seen[i + 1] = 1;
      stack.push(i + 1);
    }
    if (x > 0 && !seen[i - 1] && !sea.has(cellKey(x - 1, y))) {
      seen[i - 1] = 1;
      stack.push(i - 1);
    }
    if (y + 1 < n && !seen[i + n] && !sea.has(cellKey(x, y + 1))) {
      seen[i + n] = 1;
      stack.push(i + n);
    }
    if (y > 0 && !seen[i - n] && !sea.has(cellKey(x, y - 1))) {
      seen[i - n] = 1;
      stack.push(i - n);
    }
  }
  return reached === total;
}

function tryAddSea(size: number, sea: Set<string>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= size || y >= size) return false;
  const id = cellKey(x, y);
  if (sea.has(id)) return false;
  sea.add(id);
  if (!landIsConnected(size, sea)) {
    sea.delete(id);
    return false;
  }
  return true;
}

/** Seeds spread the way nations do, then each one grows into a clump. */
function spreadSeeds(size: number, count: number, rng: () => number): { x: number; y: number }[] {
  const first = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
  const picks = [first];
  const ideal = Math.max(3, Math.floor(size / (count + 1)));
  while (picks.length < count) {
    let best = { x: 0, y: 0 };
    let bestScore = Number.POSITIVE_INFINITY;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (picks.some((picked) => picked.x === x && picked.y === y)) continue;
        let nearest = Number.POSITIVE_INFINITY;
        for (const picked of picks) {
          nearest = Math.min(nearest, Math.max(Math.abs(picked.x - x), Math.abs(picked.y - y)));
        }
        const score = Math.abs(nearest - ideal) + rng() * 0.35;
        if (score < bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    picks.push(best);
  }
  return picks;
}

function seaTouch(size: number, sea: ReadonlySet<string>, x: number, y: number): number {
  let touch = 0;
  for (const step of STEPS) {
    const nx = x + step[0];
    const ny = y + step[1];
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    if (sea.has(cellKey(nx, ny))) touch += 1;
  }
  return touch;
}

/**
 * One fat patch. New squares prefer a shore that already has sea beside them,
 * and they stay near the seed so the patch cannot wander into a river.
 */
function growClump(
  size: number,
  sea: Set<string>,
  origin: { x: number; y: number },
  quota: number,
  rng: () => number,
): string[] {
  const placed: string[] = [];
  if (!tryAddSea(size, sea, origin.x, origin.y)) return placed;
  placed.push(cellKey(origin.x, origin.y));
  let radius = Math.max(2, Math.ceil(Math.sqrt(quota / Math.PI)));
  const frontier: { x: number; y: number }[] = [];
  const queued = new Set<string>(placed);

  const consider = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) > radius) return;
    const id = cellKey(x, y);
    if (queued.has(id) || sea.has(id)) return;
    queued.add(id);
    frontier.push({ x, y });
  };

  const refresh = () => {
    for (const id of placed) {
      const [x, y] = id.split(",").map(Number);
      for (const step of STEPS) consider(x! + step[0], y! + step[1]);
    }
  };
  refresh();

  let guard = 0;
  while (placed.length < quota && guard < quota * 12) {
    guard += 1;
    if (frontier.length === 0) {
      if (radius > size) break;
      radius += 1;
      refresh();
      if (frontier.length === 0) break;
    }
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < frontier.length; index += 1) {
      const cell = frontier[index]!;
      const score = seaTouch(size, sea, cell.x, cell.y) * 5 + rng();
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const cell = frontier.splice(bestIndex, 1)[0]!;
    if (!tryAddSea(size, sea, cell.x, cell.y)) continue;
    placed.push(cellKey(cell.x, cell.y));
    for (const step of STEPS) consider(cell.x + step[0], cell.y + step[1]);
  }
  return placed;
}

/**
 * Sea is a few random clumps, spaced apart the way nations are, then grown
 * into patches. A cell is refused when it would cut land into an island.
 * Peninsulas and narrow landways stay.
 */
export function generateSeaCells(size: number, rng: () => number = Math.random): string[] {
  const safe = Math.max(2, Math.floor(size));
  const room = safe * safe;
  const target = Math.max(
    safe >= 8 ? 8 : 2,
    Math.min(Math.round(room * 0.16), room - Math.max(4, Math.ceil(room * 0.55))),
  );
  const blobs = Math.max(1, Math.round(safe / 8));
  const sea = new Set<string>();
  const seeds = spreadSeeds(safe, blobs, rng);

  for (let blob = 0; blob < seeds.length && sea.size < target; blob += 1) {
    const quota = Math.max(4, Math.ceil((target - sea.size) / (seeds.length - blob)));
    let placed = growClump(safe, sea, seeds[blob]!, quota, rng);
    if (placed.length === 0) {
      for (let attempt = 0; attempt < 12 && placed.length === 0; attempt += 1) {
        placed = growClump(safe, sea, { x: Math.floor(rng() * safe), y: Math.floor(rng() * safe) }, quota, rng);
      }
    }
    if (placed.length > 0 && placed.length < 3) {
      for (const id of placed) sea.delete(id);
    }
  }

  if (sea.size < Math.min(target, Math.max(4, Math.floor(safe / 2)))) {
    const placed = growClump(
      safe,
      sea,
      { x: Math.floor(safe / 2), y: Math.floor(safe / 2) },
      target - sea.size,
      rng,
    );
    if (placed.length > 0 && placed.length < 3) {
      for (const id of placed) sea.delete(id);
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
