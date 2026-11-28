import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  chronicleOf,
  createGame,
  DRILL,
  DRILL_CELLS,
  victoryLine,
  type Game,
} from "./rules.ts";

function table(seats = DRILL.slice(0, 3), cells = DRILL_CELLS.slice(0, 3)): Game {
  return createGame({ title: "Drill", seats, cells, now: 10, id: "t" });
}

describe("alliance rules", () => {
  it("refuses a march onto sea", () => {
    const game = table();
    game.size = 10;
    game.seaCells = ["1,0"];
    const denied = applyAction(game, { type: "march", id: "n1", x: 1, y: 0 });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.toast, "The sea is closed.");
    assert.equal(game.nations[0]!.y, 1);
  });

  it("marches without a success toast and spends one AP", () => {
    const game = table();
    const result = applyAction(game, { type: "march", id: "n1", x: 1, y: 0 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.toast, null);
    assert.equal(result.game.nations[0]!.ap, 2);
    assert.equal(result.game.nations[0]!.y, 0);
    assert.deepEqual(chronicleOf(result.game), []);
  });

  it("refuses a march without AP", () => {
    let game = table();
    for (const y of [0, 1, 0]) {
      const step = applyAction(game, { type: "march", id: "n1", x: 1, y });
      assert.equal(step.ok, true);
      if (step.ok) game = step.game;
    }
    const denied = applyAction(game, { type: "march", id: "n1", x: 1, y: 1 });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.toast, "You need 1 AP to march.");
  });

  it("records only the finishing blow, naming who dealt it", () => {
    let game = table(DRILL.slice(0, 3), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
    const first = applyAction(game, { type: "strike", id: "n1", targetId: "n2" });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.toast, "Strike landed.");
    assert.deepEqual(chronicleOf(first.game), []);
    game = first.game;
    const second = applyAction(game, { type: "strike", id: "n1", targetId: "n2" });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.deepEqual(chronicleOf(second.game), []);
    const last = applyAction(second.game, { type: "strike", id: "n3", targetId: "n2" });
    assert.equal(last.ok, true);
    if (!last.ok) return;
    assert.deepEqual(chronicleOf(last.game), [
      "Kenji Mori of Japan is eliminated by Claire Duval of France.",
    ]);
    assert.equal(last.game.nations[1]!.alive, false);
    assert.equal(last.victory, false);
    assert.equal(last.toast, "Kenji Mori of Japan is eliminated.");
    const blows = last.game.plies.filter((ply) => ply.text.includes("strikes") || ply.chronicle);
    assert.equal(blows.length, 3);
    assert.equal(blows[0]!.text.includes("Health 2"), true);
  });

  it("crowns the last nation and keeps the record", () => {
    let game = createGame({
      title: "Duel",
      seats: DRILL.slice(0, 2),
      cells: DRILL_CELLS.slice(0, 2),
      now: 5,
      id: "duel",
    });
    for (let i = 0; i < 3; i += 1) {
      const step = applyAction(game, { type: "strike", id: "n1", targetId: "n2" }, 20);
      assert.equal(step.ok, true);
      if (step.ok) game = step.game;
    }
    assert.equal(victoryLine(game), "Ash Vale of Brazil rules the world!");
    assert.equal(game.plies.length, 4);
    assert.equal(game.plies[3]!.snapshot[1]!.hp, 0);
    assert.equal(game.plies[1]!.snapshot[1]!.hp, 2);
    assert.equal(game.plies[1]!.snapshot[0]!.ap, 2);
  });

  it("records abdication without a life tally", () => {
    const game = table(DRILL.slice(0, 2), DRILL_CELLS.slice(0, 2));
    const step = applyAction(game, { type: "abdicate", id: "n2" }, 9);
    assert.equal(step.ok, true);
    if (!step.ok) return;
    assert.deepEqual(chronicleOf(step.game), ["Kenji Mori of Japan is eliminated by abdication."]);
    assert.equal(victoryLine(step.game), "Ash Vale of Brazil rules the world!");
    assert.equal(step.toast, null);
  });

  it("toasts a range extension once", () => {
    const game = table();
    const step = applyAction(game, { type: "extend", id: "n1" });
    assert.equal(step.ok, true);
    if (!step.ok) return;
    assert.equal(step.toast, "Reach is now 2.");
    assert.equal(step.game.nations[0]!.reach, 2);
    assert.equal(step.game.nations[0]!.ap, 1);
    assert.equal(chronicleOf(step.game).length, 0);
  });

  it("refuses a march onto a sea tile", () => {
    const game = table();
    game.size = 10;
    game.seaCells = ["1,0"];
    const denied = applyAction(game, { type: "march", id: "n1", x: 1, y: 0 });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.toast, "The sea is closed.");
    assert.equal(game.nations[0]!.y, 1);
  });
});
