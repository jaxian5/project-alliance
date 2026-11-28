/**
 * Room-clock helpers for campaign schedules.
 *
 * Pure functions only — safe for client, server, and a future Supabase edge
 * worker. No React, no storage. Supabase can call `tickSchedule` on a cron or
 * from a Realtime broadcast with the same inputs.
 */
import {
  BELL_GRANT,
  MAX_AP,
  type Game,
  type Ply,
} from "./rules.ts";

export type RoomSchedule = {
  timezone: string;
  apHour: number;
  juryHour: number;
  /** YYYY-MM-DD in the room timezone when dawn AP was last granted. */
  lastDawnDate: string | null;
  /** YYYY-MM-DD in the room timezone when jury last fired. */
  lastJuryDate: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar date + hour (0–23) in a given IANA timezone. */
export function clockInZone(
  now: number | Date,
  timeZone: string,
): { dateKey: string; hour: number } {
  const date = typeof now === "number" ? new Date(now) : now;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    const year = map.year ?? "1970";
    const month = map.month ?? "01";
    const day = map.day ?? "01";
    const hour = Number(map.hour ?? "0");
    return {
      dateKey: `${year}-${month}-${day}`,
      hour: Number.isFinite(hour) ? hour : 0,
    };
  } catch {
    const d = date;
    return {
      dateKey: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
      hour: d.getUTCHours(),
    };
  }
}

export function isLocalTest(game: Game): boolean {
  return game.local === true;
}

export function hasSchedule(game: Game): game is Game & { schedule: RoomSchedule } {
  return Boolean(game.schedule && game.schedule.timezone);
}

/**
 * Seed schedule when a real campaign begins.
 * If the room is already past dawn/jury today, mark those as done so the first
 * tick does not double-grant on open.
 */
export function scheduleFromRoomSettings(settings: {
  timezone: string;
  apHour: number;
  juryHour: number;
}, now = Date.now()): RoomSchedule {
  const { dateKey, hour } = clockInZone(now, settings.timezone);
  return {
    timezone: settings.timezone,
    apHour: settings.apHour,
    juryHour: settings.juryHour,
    lastDawnDate: hour >= settings.apHour ? dateKey : null,
    lastJuryDate: hour >= settings.juryHour ? dateKey : null,
  };
}

function snapshotPly(game: Game, text: string, chronicle: string | null): void {
  const snapshot = structuredClone(game.nations);
  const ply: Ply = {
    n: game.plies.length,
    text,
    chronicle,
    hour: game.hour,
    snapshot,
  };
  game.plies.push(ply);
}

export type ScheduleTick = {
  game: Game;
  changed: boolean;
  dawn: boolean;
  jury: boolean;
  toast: string | null;
};

/**
 * Advance a scheduled campaign when the room clock hits dawn / jury.
 * No-op for local test tables (those use the manual bell).
 */
export function tickSchedule(game: Game, now = Date.now()): ScheduleTick {
  if (isLocalTest(game) || game.finishedAt || !hasSchedule(game)) {
    return { game, changed: false, dawn: false, jury: false, toast: null };
  }

  const next = structuredClone(game);
  const schedule = next.schedule!;
  const { dateKey, hour } = clockInZone(now, schedule.timezone);
  let dawn = false;
  let jury = false;
  let toast: string | null = null;

  if (hour >= schedule.apHour && schedule.lastDawnDate !== dateKey) {
    schedule.lastDawnDate = dateKey;
    next.hour += 1;
    for (const nation of next.nations) {
      if (nation.alive) nation.ap = Math.min(MAX_AP, nation.ap + BELL_GRANT);
    }
    snapshotPly(
      next,
      `Dawn breaks in ${schedule.timezone}. Hour ${next.hour}. Living nations gain ${BELL_GRANT} AP.`,
      null,
    );
    dawn = true;
    toast = `Dawn — living nations gain ${BELL_GRANT} AP.`;
  }

  if (hour >= schedule.juryHour && schedule.lastJuryDate !== dateKey) {
    schedule.lastJuryDate = dateKey;
    snapshotPly(
      next,
      `Jury hour in ${schedule.timezone}. The table notes the hour.`,
      null,
    );
    jury = true;
    toast = toast ? `${toast} Jury hour has come.` : "Jury hour has come.";
  }

  return {
    game: dawn || jury ? next : game,
    changed: dawn || jury,
    dawn,
    jury,
    toast,
  };
}
