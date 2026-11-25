import { isRoom, normalizeSettings, type Room } from "./room.ts";
import type { Game } from "./rules.ts";

const KEY = "alliance.v1";
const ARCHIVE_LIMIT = 20;

export type SaveFile = {
  version: 2;
  confirm: boolean;
  live: Game | null;
  archive: Game[];
  rooms: Room[];
  activeRoomId: string | null;
};

export const EMPTY_SAVE: SaveFile = {
  version: 2,
  confirm: false,
  live: null,
  archive: [],
  rooms: [],
  activeRoomId: null,
};

export function isGame(value: unknown): value is Game {
  if (!value || typeof value !== "object") return false;
  const game = value as Game;
  return (
    typeof game.id === "string" &&
    Array.isArray(game.nations) &&
    Array.isArray(game.plies) &&
    game.plies.length > 0 &&
    typeof game.hour === "number"
  );
}

export function loadSave(): SaveFile {
  if (typeof localStorage === "undefined") return EMPTY_SAVE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_SAVE;
    const parsed = JSON.parse(raw) as Partial<SaveFile>;
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms.filter(isRoom).map(hydrateRoom) : [];
    const active =
      typeof parsed.activeRoomId === "string" && rooms.some((room) => room.id === parsed.activeRoomId)
        ? parsed.activeRoomId
        : null;
    return {
      version: 2,
      confirm: parsed.confirm === true,
      live: isGame(parsed.live) ? parsed.live : null,
      archive: Array.isArray(parsed.archive) ? parsed.archive.filter(isGame) : [],
      rooms,
      activeRoomId: active,
    };
  } catch {
    return EMPTY_SAVE;
  }
}

function hydrateRoom(room: Room): Room {
  const settings = room.settings;
  return {
    ...room,
    settings: normalizeSettings(
      {
        name: settings.name,
        password: settings.password ?? "",
        capacity: settings.capacity,
        gridSize: settings.gridSize,
        timezone: settings.timezone,
        apHour: settings.apHour,
        juryHour: settings.juryHour,
        seas: settings.seas === true,
        seaCells: Array.isArray(settings.seaCells) ? settings.seaCells : [],
      },
      room.members.length,
    ),
  };
}

export function writeSave(save: SaveFile) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...save,
      version: 2,
      archive: save.archive.slice(0, ARCHIVE_LIMIT),
    }),
  );
}

export function rememberGame(save: SaveFile, game: Game): SaveFile {
  if (!game.finishedAt) return { ...save, live: game };
  const archive = [game, ...save.archive.filter((item) => item.id !== game.id)].slice(0, ARCHIVE_LIMIT);
  return { ...save, live: game, archive };
}
