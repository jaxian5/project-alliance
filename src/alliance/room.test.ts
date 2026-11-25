import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asGridSize,
  clampCapacity,
  clampHour,
  createRoom,
  normalizeSettings,
  uniqueCode,
  type RoomSettings,
} from "./room.ts";
import { cellKey, generateSeaCells, landIsConnected } from "./board.ts";

const base: RoomSettings = {
  name: "  Northern room  ",
  password: "secret",
  capacity: 8,
  gridSize: 15,
  timezone: "Asia/Manila",
  apHour: 8,
  juryHour: 20,
  seas: false,
  seaCells: [],
};

describe("room settings", () => {
  it("keeps host settings inside the blueprint bounds", () => {
    const settings = normalizeSettings({
      ...base,
      name: " ",
      capacity: 99,
      gridSize: 12 as RoomSettings["gridSize"],
      apHour: 30,
      juryHour: -2,
      timezone: "  ",
    });
    assert.equal(settings.name, "Room");
    assert.equal(settings.capacity, 30);
    assert.equal(settings.gridSize, 10);
    assert.equal(settings.apHour, 23);
    assert.equal(settings.juryHour, 0);
    assert.ok(settings.timezone.length > 0);
  });

  it("does not let capacity fall under two, or under the seated count", () => {
    assert.equal(clampCapacity(1, 1), 2);
    assert.equal(clampCapacity(4, 6), 6);
    assert.equal(asGridSize(25), 25);
    assert.equal(clampHour(7.6), 8);
  });

  it("seats only the host and issues a code", () => {
    const room = createRoom({
      settings: base,
      hostName: " Ada ",
      hostIso: "gb",
      taken: ["AAAAA"],
      now: 5,
    });
    assert.equal(room.members.length, 1);
    assert.equal(room.members[0]!.isHost, true);
    assert.equal(room.members[0]!.name, "Ada");
    assert.equal(room.status, "waiting");
    assert.equal(room.settings.gridSize, 15);
    assert.equal(room.settings.timezone, "Asia/Manila");
    assert.equal(room.settings.apHour, 8);
    assert.equal(room.settings.juryHour, 20);
    assert.notEqual(room.id, "AAAAA");
    assert.equal(uniqueCode(["AAAAA"]).length >= 5, true);
  });

  it("clumps sea tiles and keeps them inside the field", () => {
    let seed = 11;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const cells = generateSeaCells(20, rng);
    const set = new Set(cells);
    let touching = 0;
    for (const cell of cells) {
      const [x, y] = cell.split(",").map(Number);
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => set.has(cellKey(x! + dx!, y! + dy!)));
      if (near) touching += 1;
    }
    assert.ok(cells.length > 20);
    assert.ok(cells.length < 20 * 20 * 0.4);
    assert.ok(touching / cells.length >= 0.7);
    assert.equal(landIsConnected(20, set), true);
    const settings = normalizeSettings({ ...base, seas: true, seaCells: cells, gridSize: 20 });
    assert.equal(settings.seas, true);
    assert.deepEqual(settings.seaCells, cells);
    const cleared = normalizeSettings({ ...settings, seas: false });
    assert.deepEqual(cleared.seaCells, []);
  });
});
