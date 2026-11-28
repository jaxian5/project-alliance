import { HEIGHT, WIDTH, cellKey, isLand, isWalkable, landCells } from "./board.ts";
import { countryByIso } from "./countries.ts";

export const START_HP = 3;
export const START_AP = 1;
export const START_REACH = 2;
export const MAX_AP = 8;
export const MAX_REACH = 3;
export const MARCH_COST = 1;
export const STRIKE_COST = 1;
export const EXTEND_COST = 2;
export const SEND_AMOUNT = 1;
export const BELL_GRANT = 1;

export type Seat = { name: string; iso: string };

export type Nation = {
  id: string;
  name: string;
  country: string;
  iso: string;
  x: number;
  y: number;
  hp: number;
  ap: number;
  reach: number;
  alive: boolean;
  eliminatedBy: string | null;
};

export type Ply = {
  n: number;
  text: string;
  chronicle: string | null;
  hour: number;
  snapshot: Nation[];
};

export type Game = {
  id: string;
  title: string;
  createdAt: number;
  finishedAt: number | null;
  winnerId: string | null;
  hour: number;
  nations: Nation[];
  plies: Ply[];
  size?: number;
  seaCells?: string[];
  /** Local hotseat. Several nations, one device, no other player required. */
  local?: boolean;
};

export type Action =
  | { type: "march"; id: string; x: number; y: number }
  | { type: "strike"; id: string; targetId: string }
  | { type: "extend"; id: string }
  | { type: "send"; id: string; targetId: string }
  | { type: "abdicate"; id: string }
  | { type: "bell" };

export type Result =
  | { ok: true; game: Game; toast: string | null; victory: boolean }
  | { ok: false; toast: string };

export const DRILL: Seat[] = [
  { name: "Ash Vale", iso: "br" },
  { name: "Kenji Mori", iso: "jp" },
  { name: "Claire Duval", iso: "fr" },
  { name: "Mateo Ruiz", iso: "mx" },
];

export const DRILL_CELLS = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 5, y: 4 },
  { x: 6, y: 4 },
];

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function isOrthogonalStep(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

export function directionName(dx: number, dy: number): string {
  if (dx === 0 && dy < 0) return "north";
  if (dx === 0 && dy > 0) return "south";
  if (dx < 0 && dy === 0) return "west";
  if (dx > 0 && dy === 0) return "east";
  return "aside";
}

export function nationLabel(nation: Pick<Nation, "name" | "country">): string {
  return `${nation.name} of ${nation.country}`;
}

export function victoryLine(game: Game): string | null {
  if (!game.finishedAt) return null;
  const winner = game.nations.find((n) => n.id === game.winnerId);
  if (!winner) return "The world is unclaimed.";
  return `${nationLabel(winner)} rules the world!`;
}

export function chronicleOf(game: Game): string[] {
  return game.plies.flatMap((ply) => (ply.chronicle ? [ply.chronicle] : []));
}

export function living(nations: Nation[]): Nation[] {
  return nations.filter((n) => n.alive);
}

function fail(toast: string): Result {
  return { ok: false, toast };
}

function snapshotPly(game: Game, text: string, chronicle: string | null) {
  game.plies.push({
    n: game.plies.length,
    text,
    chronicle,
    hour: game.hour,
    snapshot: structuredClone(game.nations),
  });
}

function closeIfAlone(game: Game, now: number): boolean {
  const left = living(game.nations);
  if (left.length > 1) return false;
  game.finishedAt = now;
  game.winnerId = left[0]?.id ?? null;
  return true;
}

export function pickSpawns(count: number, rng: () => number = Math.random) {
  const land = landCells();
  if (count > land.length) throw new Error("Too many nations for this map.");
  return spreadPicks(land, count, 2, rng);
}

export function pickLandSpawns(
  size: number,
  sea: ReadonlySet<string>,
  count: number,
  rng: () => number = Math.random,
): { x: number; y: number }[] {
  const land: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!sea.has(cellKey(x, y))) land.push({ x, y });
    }
  }
  if (count > land.length) throw new Error("Too many nations for this map.");
  const ideal = Math.max(2, Math.floor(size / Math.max(2, Math.sqrt(count))));
  return spreadPicks(land, count, ideal, rng);
}

function spreadPicks(
  land: { x: number; y: number }[],
  count: number,
  ideal: number,
  rng: () => number,
): { x: number; y: number }[] {
  if (count === 0) return [];
  const first = land[Math.floor(rng() * land.length)]!;
  const picks = [first];
  while (picks.length < count) {
    let best = land[0]!;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cell of land) {
      if (picks.some((picked) => picked.x === cell.x && picked.y === cell.y)) continue;
      let nearest = Number.POSITIVE_INFINITY;
      for (const picked of picks) {
        nearest = Math.min(nearest, chebyshev(picked.x, picked.y, cell.x, cell.y));
      }
      const score = Math.abs(nearest - ideal) + rng() * 0.15;
      if (score < bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    picks.push(best);
  }
  return picks;
}

export function createGame(opts: {
  title: string;
  seats: Seat[];
  cells?: { x: number; y: number }[];
  now?: number;
  id?: string;
  rng?: () => number;
  size?: number;
  seaCells?: readonly string[];
  local?: boolean;
}): Game {
  const now = opts.now ?? Date.now();
  const size = opts.size;
  const seaCells = size ? [...(opts.seaCells ?? [])] : undefined;
  const sea = new Set(seaCells ?? []);
  const rng = opts.rng ?? Math.random;
  const cells =
    opts.cells ??
    (size ? pickLandSpawns(size, sea, opts.seats.length, rng) : pickSpawns(opts.seats.length, rng));
  const nations: Nation[] = opts.seats.map((seat, index) => {
    const country = countryByIso(seat.iso);
    const cell = cells[index];
    const seated = cell
      ? size
        ? isWalkable(cell.x, cell.y, size, sea)
        : isLand(cell.x, cell.y)
      : false;
    if (!country || !cell || !seated) throw new Error("A nation could not be seated.");
    return {
      id: `n${index + 1}`,
      name: seat.name.trim(),
      country: country.name,
      iso: country.iso,
      x: cell.x,
      y: cell.y,
      hp: START_HP,
      ap: START_AP,
      reach: START_REACH,
      alive: true,
      eliminatedBy: null,
    };
  });
  const game: Game = {
    id: opts.id ?? `g-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    title: opts.title.trim() || "Table",
    createdAt: now,
    finishedAt: null,
    winnerId: null,
    hour: 1,
    nations,
    plies: [],
    size,
    seaCells,
    local: opts.local === true ? true : undefined,
  };
  snapshotPly(game, "The nations take their places.", null);
  return game;
}

function inField(game: Game, x: number, y: number): boolean {
  if (typeof game.size === "number") return x >= 0 && y >= 0 && x < game.size && y < game.size;
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
}

function squareOpen(game: Game, x: number, y: number): boolean {
  if (!inField(game, x, y)) return false;
  if (typeof game.size === "number") return isWalkable(x, y, game.size, new Set(game.seaCells ?? []));
  return isLand(x, y);
}

function actor(game: Game, id: string): Nation | Result {
  if (game.finishedAt) return fail("This table has already ended.");
  const nation = game.nations.find((n) => n.id === id);
  if (!nation?.alive) return fail("That nation has already fallen.");
  return nation;
}

export function applyAction(game: Game, action: Action, now = Date.now()): Result {
  const next = structuredClone(game);

  if (action.type === "bell") {
    if (next.finishedAt) return fail("This table has already ended.");
    next.hour += 1;
    for (const nation of next.nations) {
      if (nation.alive) nation.ap = Math.min(MAX_AP, nation.ap + BELL_GRANT);
    }
    snapshotPly(
      next,
      `The bell sounds. Hour ${next.hour}. Living nations gain ${BELL_GRANT} AP.`,
      null,
    );
    return { ok: true, game: next, toast: "The hour advances.", victory: false };
  }

  const found = actor(next, action.id);
  if (!("iso" in found)) return found;
  const self = found;

  if (action.type === "march") {
    if (self.ap < MARCH_COST) return fail(`You need ${MARCH_COST} AP to march.`);
    if (!isOrthogonalStep(self.x, self.y, action.x, action.y) || !inField(next, action.x, action.y)) {
      return fail("That square is not beside you.");
    }
    if (!squareOpen(next, action.x, action.y)) return fail("You can't move onto the sea.");
    const occupied = next.nations.find((n) => n.x === action.x && n.y === action.y);
    if (occupied?.alive) return fail("That square is occupied.");
    if (occupied) return fail("A gravestone holds that square.");
    const dir = directionName(action.x - self.x, action.y - self.y);
    self.x = action.x;
    self.y = action.y;
    self.ap -= MARCH_COST;
    snapshotPly(next, `${nationLabel(self)} marches ${dir}.`, null);
    return { ok: true, game: next, toast: null, victory: false };
  }

  if (action.type === "extend") {
    if (self.reach >= MAX_REACH) return fail("Reach cannot extend further.");
    if (self.ap < EXTEND_COST) return fail(`You need ${EXTEND_COST} AP to extend your reach.`);
    self.ap -= EXTEND_COST;
    self.reach += 1;
    snapshotPly(next, `${nationLabel(self)} extends reach to ${self.reach}.`, null);
    return { ok: true, game: next, toast: `Reach is now ${self.reach}.`, victory: false };
  }

  if (action.type === "strike") {
    if (self.ap < STRIKE_COST) return fail(`You need ${STRIKE_COST} AP to strike.`);
    const target = next.nations.find((n) => n.id === action.targetId);
    if (!target || target.id === self.id) return fail("Choose another nation.");
    if (!target.alive) return fail("That nation has already fallen.");
    if (chebyshev(self.x, self.y, target.x, target.y) > self.reach) {
      return fail("They are outside your reach.");
    }
    self.ap -= STRIKE_COST;
    target.hp -= 1;
    if (target.hp > 0) {
      snapshotPly(next, `${nationLabel(self)} strikes ${nationLabel(target)}. Health ${target.hp}.`, null);
      return { ok: true, game: next, toast: "Strike landed.", victory: false };
    }
    target.hp = 0;
    target.alive = false;
    target.eliminatedBy = self.id;
    const line = `${nationLabel(target)} is eliminated by ${nationLabel(self)}.`;
    snapshotPly(next, line, line);
    const victory = closeIfAlone(next, now);
    return {
      ok: true,
      game: next,
      toast: victory ? null : `${nationLabel(target)} is eliminated.`,
      victory,
    };
  }

  if (action.type === "send") {
    if (self.ap < SEND_AMOUNT) return fail(`You need ${SEND_AMOUNT} AP to send.`);
    const target = next.nations.find((n) => n.id === action.targetId);
    if (!target || target.id === self.id) return fail("Choose another nation.");
    if (!target.alive) return fail("That nation has already fallen.");
    if (chebyshev(self.x, self.y, target.x, target.y) > self.reach) {
      return fail("They are outside your reach.");
    }
    if (target.ap >= MAX_AP) return fail("They cannot hold more AP.");
    self.ap -= SEND_AMOUNT;
    target.ap += SEND_AMOUNT;
    snapshotPly(next, `${nationLabel(self)} sends 1 AP to ${nationLabel(target)}.`, null);
    return { ok: true, game: next, toast: `Sent 1 AP to ${target.name}.`, victory: false };
  }

  const line = `${nationLabel(self)} is eliminated by abdication.`;
  self.alive = false;
  self.hp = 0;
  self.eliminatedBy = "abdication";
  snapshotPly(next, line, line);
  const victory = closeIfAlone(next, now);
  return { ok: true, game: next, toast: victory ? null : "Abdication is recorded.", victory };
}

export function inReach(self: Nation, other: Nation): boolean {
  return other.alive && other.id !== self.id && chebyshev(self.x, self.y, other.x, other.y) <= self.reach;
}
