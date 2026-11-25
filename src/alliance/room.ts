import { generateSeaCells, seaInBounds } from "./board.ts";

export const GRID_SIZES = [10, 15, 20, 25, 30] as const;

export type GridSize = (typeof GRID_SIZES)[number];

export type RoomStatus = "waiting" | "countdown" | "active" | "finished";

export type RoomSettings = {
  name: string;
  password: string;
  capacity: number;
  gridSize: GridSize;
  timezone: string;
  apHour: number;
  juryHour: number;
  seas: boolean;
  seaCells: string[];
};

export type RoomMember = {
  id: string;
  name: string;
  iso: string;
  isHost: boolean;
};

export type Room = {
  id: string;
  createdAt: number;
  status: RoomStatus;
  settings: RoomSettings;
  members: RoomMember[];
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const GRID_LABEL: Record<GridSize, string> = {
  10: "Small",
  15: "Medium",
  20: "Large",
  25: "Very large",
  30: "Maximum",
};

const ZONE_LIST = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function detectZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch {
    /* ignore */
  }
  return "UTC";
}

export function zoneOptions(current?: string): string[] {
  const zones = [...ZONE_LIST];
  if (current && !zones.includes(current)) zones.unshift(current);
  return zones;
}

export function formatHour(hour: number): string {
  const safe = clampHour(hour);
  return `${String(safe).padStart(2, "0")}:00`;
}

export function gridLabel(size: GridSize): string {
  return `${GRID_LABEL[size]} · ${size}×${size} · ${size * size} squares`;
}

export function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 8;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

export function clampCapacity(value: number, seated = 1): number {
  const floor = Math.max(2, seated);
  if (!Number.isFinite(value)) return Math.min(30, Math.max(floor, 8));
  return Math.min(30, Math.max(floor, Math.round(value)));
}

export function asGridSize(value: number): GridSize {
  return GRID_SIZES.find((size) => size === value) ?? 10;
}

export function makeCode(length = 5): string {
  const chars: string[] = [];
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (const byte of bytes) chars.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]!);
    return chars.join("");
  }
  for (let index = 0; index < length; index += 1) {
    chars.push(CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!);
  }
  return chars.join("");
}

export function uniqueCode(taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (code) => code.toUpperCase()));
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const code = makeCode();
    if (!used.has(code)) return code;
  }
  return `${makeCode(4)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export function normalizeSettings(input: RoomSettings, seated = 1): RoomSettings {
  const zone = input.timezone.trim() || detectZone();
  const gridSize = asGridSize(input.gridSize);
  const seas = input.seas === true;
  const kept = seas ? seaInBounds(input.seaCells ?? [], gridSize) : [];
  return {
    name: input.name.trim().slice(0, 40) || "Room",
    password: input.password.slice(0, 40),
    capacity: clampCapacity(input.capacity, seated),
    gridSize,
    timezone: zone,
    apHour: clampHour(input.apHour),
    juryHour: clampHour(input.juryHour),
    seas,
    seaCells: seas ? (kept.length > 0 ? kept : generateSeaCells(gridSize)) : [],
  };
}

export function createRoom(input: {
  settings: RoomSettings;
  hostName: string;
  hostIso: string;
  taken?: Iterable<string>;
  now?: number;
}): Room {
  const now = input.now ?? Date.now();
  const hostName = input.hostName.trim().slice(0, 24);
  return {
    id: uniqueCode(input.taken ?? []),
    createdAt: now,
    status: "waiting",
    settings: normalizeSettings(input.settings, 1),
    members: [
      {
        id: "host",
        name: hostName,
        iso: input.hostIso,
        isHost: true,
      },
    ],
  };
}

export function isRoom(value: unknown): value is Room {
  if (!value || typeof value !== "object") return false;
  const room = value as Room;
  return (
    typeof room.id === "string" &&
    room.id.length > 0 &&
    (room.status === "waiting" ||
      room.status === "countdown" ||
      room.status === "active" ||
      room.status === "finished") &&
    typeof room.settings?.name === "string" &&
    typeof room.settings.capacity === "number" &&
    Array.isArray(room.members) &&
    room.members.length > 0
  );
}

export function statusLabel(status: RoomStatus): string {
  if (status === "waiting") return "Waiting";
  if (status === "countdown") return "Countdown";
  if (status === "active") return "Campaign";
  return "Decided";
}
