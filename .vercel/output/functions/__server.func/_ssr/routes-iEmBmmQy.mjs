import { i as __toESM } from "../_runtime.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, d as DialogOverlay, f as DialogPortal, g as require_react, h as require_jsx_runtime, i as AlertDialogContent, l as Dialog, n as AlertDialogAction, o as AlertDialogOverlay, p as DialogTitle, r as AlertDialogCancel, s as AlertDialogPortal, t as AlertDialog, u as DialogContent } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as ChevronsLeft, c as ChevronLeft, i as ChevronsRight, l as ChevronDown, o as ChevronUp, r as ScrollText, s as ChevronRight, t as X, u as Bell } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-iEmBmmQy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROWS = [
	"LLLLLLLL",
	"LLLLLLLL",
	"LLLSSLLL",
	"LLLSSLLL",
	"LLLLLLLL",
	"LLLLLLLL"
];
function isLand(x, y) {
	if (x < 0 || y < 0 || x >= 8 || y >= 6) return false;
	return ROWS[y][x] === "L";
}
function landCells() {
	const cells = [];
	for (let y = 0; y < 6; y += 1) for (let x = 0; x < 8; x += 1) if (isLand(x, y)) cells.push({
		x,
		y
	});
	return cells;
}
function cellKey(x, y) {
	return `${x},${y}`;
}
function isWalkable(x, y, size, sea) {
	if (x < 0 || y < 0 || x >= size || y >= size) return false;
	return !sea.has(cellKey(x, y));
}
function landSpawn(size, sea) {
	const center = Math.floor(size / 2);
	if (!sea.has(cellKey(center, center))) return {
		x: center,
		y: center
	};
	let best = {
		x: 0,
		y: 0
	};
	let bestDist = Number.POSITIVE_INFINITY;
	let found = false;
	for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
		if (sea.has(cellKey(x, y))) continue;
		const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
		if (dist < bestDist) {
			bestDist = dist;
			best = {
				x,
				y
			};
			found = true;
		}
	}
	return found ? best : {
		x: 0,
		y: 0
	};
}
var STEPS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/** Every land square can still be reached by an orthogonal walk. Peninsulas and 1-wide landways count; islands do not. */
function landIsConnected(size, sea) {
	const n = size;
	if (n <= 0) return false;
	let total = 0;
	let start = -1;
	for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
		if (sea.has(cellKey(x, y))) continue;
		total += 1;
		start = x + y * n;
	}
	if (total === 0 || start < 0) return false;
	const seen = new Uint8Array(n * n);
	const stack = [start];
	seen[start] = 1;
	let reached = 0;
	while (stack.length > 0) {
		const i = stack.pop();
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
function tryAddSea(size, sea, x, y) {
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
function spreadSeeds(size, count, rng) {
	const picks = [{
		x: Math.floor(rng() * size),
		y: Math.floor(rng() * size)
	}];
	const ideal = Math.max(3, Math.floor(size / (count + 1)));
	while (picks.length < count) {
		let best = {
			x: 0,
			y: 0
		};
		let bestScore = Number.POSITIVE_INFINITY;
		for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
			if (picks.some((picked) => picked.x === x && picked.y === y)) continue;
			let nearest = Number.POSITIVE_INFINITY;
			for (const picked of picks) nearest = Math.min(nearest, Math.max(Math.abs(picked.x - x), Math.abs(picked.y - y)));
			const score = Math.abs(nearest - ideal) + rng() * .35;
			if (score < bestScore) {
				bestScore = score;
				best = {
					x,
					y
				};
			}
		}
		picks.push(best);
	}
	return picks;
}
function seaTouch(size, sea, x, y) {
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
function growClump(size, sea, origin, quota, rng) {
	const placed = [];
	if (!tryAddSea(size, sea, origin.x, origin.y)) return placed;
	placed.push(cellKey(origin.x, origin.y));
	let radius = Math.max(2, Math.ceil(Math.sqrt(quota / Math.PI)));
	const frontier = [];
	const queued = new Set(placed);
	const consider = (x, y) => {
		if (x < 0 || y < 0 || x >= size || y >= size) return;
		if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) > radius) return;
		const id = cellKey(x, y);
		if (queued.has(id) || sea.has(id)) return;
		queued.add(id);
		frontier.push({
			x,
			y
		});
	};
	const refresh = () => {
		for (const id of placed) {
			const [x, y] = id.split(",").map(Number);
			for (const step of STEPS) consider(x + step[0], y + step[1]);
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
			const cell = frontier[index];
			const score = seaTouch(size, sea, cell.x, cell.y) * 5 + rng();
			if (score > bestScore) {
				bestScore = score;
				bestIndex = index;
			}
		}
		const cell = frontier.splice(bestIndex, 1)[0];
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
function generateSeaCells(size, rng = Math.random) {
	const safe = Math.max(2, Math.floor(size));
	const room = safe * safe;
	const target = Math.max(safe >= 8 ? 8 : 2, Math.min(Math.round(room * .16), room - Math.max(4, Math.ceil(room * .55))));
	const blobs = Math.max(1, Math.round(safe / 8));
	const sea = /* @__PURE__ */ new Set();
	const seeds = spreadSeeds(safe, blobs, rng);
	for (let blob = 0; blob < seeds.length && sea.size < target; blob += 1) {
		const quota = Math.max(4, Math.ceil((target - sea.size) / (seeds.length - blob)));
		let placed = growClump(safe, sea, seeds[blob], quota, rng);
		if (placed.length === 0) for (let attempt = 0; attempt < 12 && placed.length === 0; attempt += 1) placed = growClump(safe, sea, {
			x: Math.floor(rng() * safe),
			y: Math.floor(rng() * safe)
		}, quota, rng);
		if (placed.length > 0 && placed.length < 3) for (const id of placed) sea.delete(id);
	}
	if (sea.size < Math.min(target, Math.max(4, Math.floor(safe / 2)))) {
		const placed = growClump(safe, sea, {
			x: Math.floor(safe / 2),
			y: Math.floor(safe / 2)
		}, target - sea.size, rng);
		if (placed.length > 0 && placed.length < 3) for (const id of placed) sea.delete(id);
	}
	return [...sea];
}
function seaInBounds(cells, size) {
	const kept = [];
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
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/** Server-only. The service role never reaches the browser. */
var getCloudStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("2e4e2e783bb246870e6097d089aae873244479144435124771cdcd69f7a7d623"));
var COUNTRIES = [
	{
		iso: "br",
		name: "Brazil"
	},
	{
		iso: "jp",
		name: "Japan"
	},
	{
		iso: "fr",
		name: "France"
	},
	{
		iso: "mx",
		name: "Mexico"
	},
	{
		iso: "us",
		name: "United States"
	},
	{
		iso: "gb",
		name: "United Kingdom"
	},
	{
		iso: "de",
		name: "Germany"
	},
	{
		iso: "it",
		name: "Italy"
	},
	{
		iso: "es",
		name: "Spain"
	},
	{
		iso: "pt",
		name: "Portugal"
	},
	{
		iso: "cn",
		name: "China"
	},
	{
		iso: "in",
		name: "India"
	},
	{
		iso: "ru",
		name: "Russia"
	},
	{
		iso: "ca",
		name: "Canada"
	},
	{
		iso: "au",
		name: "Australia"
	},
	{
		iso: "kr",
		name: "South Korea"
	},
	{
		iso: "za",
		name: "South Africa"
	},
	{
		iso: "eg",
		name: "Egypt"
	},
	{
		iso: "tr",
		name: "Turkey"
	},
	{
		iso: "sa",
		name: "Saudi Arabia"
	},
	{
		iso: "ar",
		name: "Argentina"
	},
	{
		iso: "se",
		name: "Sweden"
	},
	{
		iso: "no",
		name: "Norway"
	},
	{
		iso: "pl",
		name: "Poland"
	},
	{
		iso: "nl",
		name: "Netherlands"
	},
	{
		iso: "gr",
		name: "Greece"
	},
	{
		iso: "ua",
		name: "Ukraine"
	},
	{
		iso: "id",
		name: "Indonesia"
	},
	{
		iso: "th",
		name: "Thailand"
	},
	{
		iso: "vn",
		name: "Vietnam"
	},
	{
		iso: "ng",
		name: "Nigeria"
	},
	{
		iso: "ke",
		name: "Kenya"
	},
	{
		iso: "nz",
		name: "New Zealand"
	},
	{
		iso: "ch",
		name: "Switzerland"
	},
	{
		iso: "at",
		name: "Austria"
	},
	{
		iso: "ie",
		name: "Ireland"
	},
	{
		iso: "fi",
		name: "Finland"
	},
	{
		iso: "dk",
		name: "Denmark"
	},
	{
		iso: "be",
		name: "Belgium"
	},
	{
		iso: "cl",
		name: "Chile"
	},
	{
		iso: "co",
		name: "Colombia"
	},
	{
		iso: "pe",
		name: "Peru"
	}
];
var byIso = new Map(COUNTRIES.map((c) => [c.iso, c]));
function countryByIso(iso) {
	return byIso.get(iso);
}
var GRID_SIZES = [
	10,
	15,
	20,
	25,
	30
];
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var GRID_LABEL = {
	10: "Small",
	15: "Medium",
	20: "Large",
	25: "Very large",
	30: "Maximum"
};
var ZONE_LIST = [
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
	"Pacific/Auckland"
];
function detectZone() {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (zone) return zone;
	} catch {}
	return "UTC";
}
function zoneOptions(current) {
	const zones = [...ZONE_LIST];
	if (current && !zones.includes(current)) zones.unshift(current);
	return zones;
}
function formatHour(hour) {
	const safe = clampHour(hour);
	return `${String(safe).padStart(2, "0")}:00`;
}
function gridLabel(size) {
	return `${GRID_LABEL[size]} · ${size}×${size} · ${size * size} squares`;
}
function clampHour(hour) {
	if (!Number.isFinite(hour)) return 8;
	return Math.min(23, Math.max(0, Math.round(hour)));
}
function clampCapacity(value, seated = 1) {
	const floor = Math.max(2, seated);
	if (!Number.isFinite(value)) return Math.min(30, Math.max(floor, 8));
	return Math.min(30, Math.max(floor, Math.round(value)));
}
function asGridSize(value) {
	return GRID_SIZES.find((size) => size === value) ?? 10;
}
function makeCode(length = 5) {
	const chars = [];
	const cryptoObj = globalThis.crypto;
	if (cryptoObj?.getRandomValues) {
		const bytes = new Uint8Array(length);
		cryptoObj.getRandomValues(bytes);
		for (const byte of bytes) chars.push(CODE_ALPHABET[byte % 32]);
		return chars.join("");
	}
	for (let index = 0; index < length; index += 1) chars.push(CODE_ALPHABET[Math.floor(Math.random() * 32)]);
	return chars.join("");
}
function uniqueCode(taken) {
	const used = new Set(Array.from(taken, (code) => code.toUpperCase()));
	for (let attempt = 0; attempt < 32; attempt += 1) {
		const code = makeCode();
		if (!used.has(code)) return code;
	}
	return `${makeCode(4)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}
function normalizeSettings(input, seated = 1) {
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
		seaCells: seas ? kept.length > 0 ? kept : generateSeaCells(gridSize) : []
	};
}
function createRoom(input) {
	const now = input.now ?? Date.now();
	const hostName = input.hostName.trim().slice(0, 24);
	return {
		id: uniqueCode(input.taken ?? []),
		createdAt: now,
		status: "waiting",
		settings: normalizeSettings(input.settings, 1),
		members: [{
			id: "host",
			name: hostName,
			iso: input.hostIso,
			isHost: true
		}]
	};
}
function isRoom(value) {
	if (!value || typeof value !== "object") return false;
	const room = value;
	return typeof room.id === "string" && room.id.length > 0 && (room.status === "waiting" || room.status === "countdown" || room.status === "active" || room.status === "finished") && typeof room.settings?.name === "string" && typeof room.settings.capacity === "number" && Array.isArray(room.members) && room.members.length > 0;
}
function statusLabel(status) {
	if (status === "waiting") return "Waiting";
	if (status === "countdown") return "Countdown";
	if (status === "active") return "Campaign";
	return "Decided";
}
function chebyshev(ax, ay, bx, by) {
	return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}
function isOrthogonalStep(ax, ay, bx, by) {
	return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
function directionName(dx, dy) {
	if (dx === 0 && dy < 0) return "north";
	if (dx === 0 && dy > 0) return "south";
	if (dx < 0 && dy === 0) return "west";
	if (dx > 0 && dy === 0) return "east";
	return "aside";
}
function nationLabel(nation) {
	return `${nation.name} of ${nation.country}`;
}
function victoryLine(game) {
	if (!game.finishedAt) return null;
	const winner = game.nations.find((n) => n.id === game.winnerId);
	if (!winner) return "The world is unclaimed.";
	return `${nationLabel(winner)} rules the world!`;
}
function chronicleOf(game) {
	return game.plies.flatMap((ply) => ply.chronicle ? [ply.chronicle] : []);
}
function living(nations) {
	return nations.filter((n) => n.alive);
}
function fail(toast) {
	return {
		ok: false,
		toast
	};
}
function snapshotPly(game, text, chronicle) {
	game.plies.push({
		n: game.plies.length,
		text,
		chronicle,
		hour: game.hour,
		snapshot: structuredClone(game.nations)
	});
}
function closeIfAlone(game, now) {
	const left = living(game.nations);
	if (left.length > 1) return false;
	game.finishedAt = now;
	game.winnerId = left[0]?.id ?? null;
	return true;
}
function pickSpawns(count, rng = Math.random) {
	const land = landCells();
	if (count > land.length) throw new Error("Too many nations for this map.");
	return spreadPicks(land, count, 2, rng);
}
function pickLandSpawns(size, sea, count, rng = Math.random) {
	const land = [];
	for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (!sea.has(cellKey(x, y))) land.push({
		x,
		y
	});
	if (count > land.length) throw new Error("Too many nations for this map.");
	return spreadPicks(land, count, Math.max(2, Math.floor(size / Math.max(2, Math.sqrt(count)))), rng);
}
function spreadPicks(land, count, ideal, rng) {
	if (count === 0) return [];
	const picks = [land[Math.floor(rng() * land.length)]];
	while (picks.length < count) {
		let best = land[0];
		let bestScore = Number.POSITIVE_INFINITY;
		for (const cell of land) {
			if (picks.some((picked) => picked.x === cell.x && picked.y === cell.y)) continue;
			let nearest = Number.POSITIVE_INFINITY;
			for (const picked of picks) nearest = Math.min(nearest, chebyshev(picked.x, picked.y, cell.x, cell.y));
			const score = Math.abs(nearest - ideal) + rng() * .15;
			if (score < bestScore) {
				bestScore = score;
				best = cell;
			}
		}
		picks.push(best);
	}
	return picks;
}
function createGame(opts) {
	const now = opts.now ?? Date.now();
	const size = opts.size;
	const seaCells = size ? [...opts.seaCells ?? []] : void 0;
	const sea = new Set(seaCells ?? []);
	const rng = opts.rng ?? Math.random;
	const cells = opts.cells ?? (size ? pickLandSpawns(size, sea, opts.seats.length, rng) : pickSpawns(opts.seats.length, rng));
	const nations = opts.seats.map((seat, index) => {
		const country = countryByIso(seat.iso);
		const cell = cells[index];
		const seated = cell ? size ? isWalkable(cell.x, cell.y, size, sea) : isLand(cell.x, cell.y) : false;
		if (!country || !cell || !seated) throw new Error("A nation could not be seated.");
		return {
			id: `n${index + 1}`,
			name: seat.name.trim(),
			country: country.name,
			iso: country.iso,
			x: cell.x,
			y: cell.y,
			hp: 3,
			ap: 3,
			reach: 1,
			alive: true,
			eliminatedBy: null
		};
	});
	const game = {
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
		local: opts.local === true ? true : void 0
	};
	snapshotPly(game, "The nations take their places.", null);
	return game;
}
function inField(game, x, y) {
	if (typeof game.size === "number") return x >= 0 && y >= 0 && x < game.size && y < game.size;
	return x >= 0 && y >= 0 && x < 8 && y < 6;
}
function squareOpen(game, x, y) {
	if (!inField(game, x, y)) return false;
	if (typeof game.size === "number") return isWalkable(x, y, game.size, new Set(game.seaCells ?? []));
	return isLand(x, y);
}
function actor(game, id) {
	if (game.finishedAt) return fail("This table has already ended.");
	const nation = game.nations.find((n) => n.id === id);
	if (!nation?.alive) return fail("That nation has already fallen.");
	return nation;
}
function applyAction(game, action, now = Date.now()) {
	const next = structuredClone(game);
	if (action.type === "bell") {
		if (next.finishedAt) return fail("This table has already ended.");
		next.hour += 1;
		for (const nation of next.nations) if (nation.alive) nation.ap = Math.min(8, nation.ap + 2);
		snapshotPly(next, `The bell sounds. Hour ${next.hour}. Living nations gain 2 AP.`, null);
		return {
			ok: true,
			game: next,
			toast: "The hour advances.",
			victory: false
		};
	}
	const found = actor(next, action.id);
	if (!("iso" in found)) return found;
	const self = found;
	if (action.type === "march") {
		if (self.ap < 1) return fail(`You need 1 AP to march.`);
		if (!isOrthogonalStep(self.x, self.y, action.x, action.y) || !inField(next, action.x, action.y)) return fail("That square is not beside you.");
		if (!squareOpen(next, action.x, action.y)) return fail("You can't move onto the sea.");
		const occupied = next.nations.find((n) => n.x === action.x && n.y === action.y);
		if (occupied?.alive) return fail("That square is occupied.");
		if (occupied) return fail("A gravestone holds that square.");
		const dir = directionName(action.x - self.x, action.y - self.y);
		self.x = action.x;
		self.y = action.y;
		self.ap -= 1;
		snapshotPly(next, `${nationLabel(self)} marches ${dir}.`, null);
		return {
			ok: true,
			game: next,
			toast: null,
			victory: false
		};
	}
	if (action.type === "extend") {
		if (self.reach >= 3) return fail("Reach cannot extend further.");
		if (self.ap < 2) return fail(`You need 2 AP to extend your reach.`);
		self.ap -= 2;
		self.reach += 1;
		snapshotPly(next, `${nationLabel(self)} extends reach to ${self.reach}.`, null);
		return {
			ok: true,
			game: next,
			toast: `Reach is now ${self.reach}.`,
			victory: false
		};
	}
	if (action.type === "strike") {
		if (self.ap < 1) return fail(`You need 1 AP to strike.`);
		const target = next.nations.find((n) => n.id === action.targetId);
		if (!target || target.id === self.id) return fail("Choose another nation.");
		if (!target.alive) return fail("That nation has already fallen.");
		if (chebyshev(self.x, self.y, target.x, target.y) > self.reach) return fail("They are outside your reach.");
		self.ap -= 1;
		target.hp -= 1;
		if (target.hp > 0) {
			snapshotPly(next, `${nationLabel(self)} strikes ${nationLabel(target)}. Health ${target.hp}.`, null);
			return {
				ok: true,
				game: next,
				toast: "Strike landed.",
				victory: false
			};
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
			victory
		};
	}
	if (action.type === "send") {
		if (self.ap < 1) return fail(`You need 1 AP to send.`);
		const target = next.nations.find((n) => n.id === action.targetId);
		if (!target || target.id === self.id) return fail("Choose another nation.");
		if (!target.alive) return fail("That nation has already fallen.");
		if (chebyshev(self.x, self.y, target.x, target.y) > self.reach) return fail("They are outside your reach.");
		if (target.ap >= 8) return fail("They cannot hold more AP.");
		self.ap -= 1;
		target.ap += 1;
		snapshotPly(next, `${nationLabel(self)} sends 1 AP to ${nationLabel(target)}.`, null);
		return {
			ok: true,
			game: next,
			toast: `Sent 1 AP to ${target.name}.`,
			victory: false
		};
	}
	const line = `${nationLabel(self)} is eliminated by abdication.`;
	self.alive = false;
	self.hp = 0;
	self.eliminatedBy = "abdication";
	snapshotPly(next, line, line);
	const victory = closeIfAlone(next, now);
	return {
		ok: true,
		game: next,
		toast: victory ? null : "Abdication is recorded.",
		victory
	};
}
function inReach(self, other) {
	return other.alive && other.id !== self.id && chebyshev(self.x, self.y, other.x, other.y) <= self.reach;
}
var KEY = "alliance.v1";
var ARCHIVE_LIMIT = 20;
var EMPTY_SAVE = {
	version: 2,
	confirm: false,
	live: null,
	archive: [],
	rooms: [],
	activeRoomId: null
};
function isGame(value) {
	if (!value || typeof value !== "object") return false;
	const game = value;
	return typeof game.id === "string" && Array.isArray(game.nations) && Array.isArray(game.plies) && game.plies.length > 0 && typeof game.hour === "number";
}
function loadSave() {
	if (typeof localStorage === "undefined") return EMPTY_SAVE;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return EMPTY_SAVE;
		const parsed = JSON.parse(raw);
		const rooms = Array.isArray(parsed.rooms) ? parsed.rooms.filter(isRoom).map(hydrateRoom) : [];
		const active = typeof parsed.activeRoomId === "string" && rooms.some((room) => room.id === parsed.activeRoomId) ? parsed.activeRoomId : null;
		return {
			version: 2,
			confirm: parsed.confirm === true,
			live: isGame(parsed.live) ? parsed.live : null,
			archive: Array.isArray(parsed.archive) ? parsed.archive.filter(isGame) : [],
			rooms,
			activeRoomId: active
		};
	} catch {
		return EMPTY_SAVE;
	}
}
function hydrateRoom(room) {
	const settings = room.settings;
	return {
		...room,
		settings: normalizeSettings({
			name: settings.name,
			password: settings.password ?? "",
			capacity: settings.capacity,
			gridSize: settings.gridSize,
			timezone: settings.timezone,
			apHour: settings.apHour,
			juryHour: settings.juryHour,
			seas: settings.seas === true,
			seaCells: Array.isArray(settings.seaCells) ? settings.seaCells : []
		}, room.members.length)
	};
}
function writeSave(save) {
	localStorage.setItem(KEY, JSON.stringify({
		...save,
		version: 2,
		archive: save.archive.slice(0, ARCHIVE_LIMIT)
	}));
}
function rememberGame(save, game) {
	if (!game.finishedAt) return {
		...save,
		live: game
	};
	const archive = [game, ...save.archive.filter((item) => item.id !== game.id)].slice(0, ARCHIVE_LIMIT);
	return {
		...save,
		live: game,
		archive
	};
}
function btn(kind = "ghost") {
	const base = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-40";
	if (kind === "solid") return `${base} bg-brass text-bg`;
	if (kind === "quiet") return `${base} text-muted`;
	return `${base} border border-line bg-surface text-fg`;
}
function Flag({ iso, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: `/flags/${iso}.svg`,
		alt: "",
		draggable: false,
		className: `object-cover ${className}`
	});
}
function AllianceApp() {
	const [booted, setBooted] = (0, import_react.useState)(false);
	const [phase, setPhase] = (0, import_react.useState)({ kind: "home" });
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	const [live, setLive] = (0, import_react.useState)(null);
	const [archive, setArchive] = (0, import_react.useState)([]);
	const [rooms, setRooms] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)(null);
	const [cloud, setCloud] = (0, import_react.useState)(null);
	const saveRef = (0, import_react.useRef)({
		version: 2,
		confirm: false,
		live: null,
		archive: [],
		rooms: [],
		activeRoomId: null
	});
	const liveRef = (0, import_react.useRef)(null);
	liveRef.current = live;
	(0, import_react.useEffect)(() => {
		const save = loadSave();
		saveRef.current = save;
		setConfirm(save.confirm);
		setLive(save.live);
		setArchive(save.archive);
		setRooms(save.rooms);
		setBooted(true);
		getCloudStatus().then((status) => setCloud(status.ready)).catch(() => setCloud(false));
	}, []);
	(0, import_react.useEffect)(() => {
		const probe = window;
		probe.__alliance = {
			phase: phase.kind,
			confirm,
			victory: live ? victoryLine(live) : null,
			chronicle: live ? chronicleOf(live) : []
		};
	}, [
		phase,
		confirm,
		live
	]);
	function store(next) {
		saveRef.current = next;
		liveRef.current = next.live;
		writeSave(next);
		setConfirm(next.confirm);
		setLive(next.live);
		setArchive(next.archive);
		setRooms(next.rooms);
	}
	function play(action, opts) {
		const current = liveRef.current;
		if (!current) return;
		const preview = applyAction(current, action);
		if (!preview.ok) {
			toast.error(preview.toast);
			return;
		}
		const run = () => {
			const latest = liveRef.current;
			const result = latest ? applyAction(latest, action) : preview;
			setPending(null);
			if (!result.ok) {
				toast.error(result.toast);
				return;
			}
			store(rememberGame(saveRef.current, result.game));
			if (result.toast) toast.success(result.toast);
			opts.onDone?.();
		};
		if (opts.always || saveRef.current.confirm) setPending({
			title: opts.title,
			detail: opts.detail,
			run
		});
		else run();
	}
	function openRoom(id) {
		store({
			...saveRef.current,
			activeRoomId: id
		});
		setPhase({
			kind: "room",
			id
		});
	}
	function beginLocal(game) {
		const run = () => {
			setPending(null);
			store({
				...saveRef.current,
				live: game
			});
			setPhase({ kind: "match" });
		};
		if (saveRef.current.live && !saveRef.current.live.finishedAt) {
			setPending({
				title: "Replace the open table?",
				detail: "The unfinished table on this device will be discarded.",
				run
			});
			return;
		}
		run();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				position: "top-center",
				duration: 2200
			}),
			phase.kind === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Home, {
				booted,
				live,
				rooms,
				archiveCount: archive.length,
				onCreate: () => setPhase({ kind: "create" }),
				onJoin: () => setPhase({ kind: "join" }),
				onTest: () => setPhase({ kind: "test" }),
				onOpenRoom: openRoom,
				onResume: () => setPhase({ kind: "match" }),
				onArchive: () => setPhase({ kind: "archive" }),
				onCodex: () => setPhase({ kind: "codex" }),
				onAnalyse: () => {
					if (!live) return;
					setPhase({
						kind: "analyse",
						game: live,
						cursor: live.plies.length - 1
					});
				}
			}),
			phase.kind === "create" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateRoom, {
				taken: rooms.map((room) => room.id),
				onCancel: () => setPhase({ kind: "home" }),
				onCreate: (room) => {
					store({
						...saveRef.current,
						rooms: [room, ...saveRef.current.rooms],
						activeRoomId: room.id
					});
					setPhase({
						kind: "room",
						id: room.id
					});
				}
			}),
			phase.kind === "join" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinRoom, {
				rooms,
				onCancel: () => setPhase({ kind: "home" }),
				onOpen: openRoom
			}),
			phase.kind === "test" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TestTable, {
				onCancel: () => setPhase({ kind: "home" }),
				onStart: (game) => beginLocal(game)
			}),
			phase.kind === "room" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomLobby, {
				room: rooms.find((room) => room.id === phase.id) ?? null,
				onHome: () => setPhase({ kind: "home" }),
				onSave: (settings) => {
					const current = saveRef.current.rooms.find((room) => room.id === phase.id);
					if (!current || current.status !== "waiting") {
						toast.error("Settings lock once the campaign begins.");
						return;
					}
					const nextRoom = {
						...current,
						settings: normalizeSettings(settings, current.members.length)
					};
					store({
						...saveRef.current,
						rooms: saveRef.current.rooms.map((room) => room.id === nextRoom.id ? nextRoom : room)
					});
					toast.success("Room settings saved.");
				},
				onClose: () => {
					store({
						...saveRef.current,
						rooms: saveRef.current.rooms.filter((room) => room.id !== phase.id),
						activeRoomId: saveRef.current.activeRoomId === phase.id ? null : saveRef.current.activeRoomId
					});
					setPhase({ kind: "home" });
				},
				onTest: (game) => beginLocal(game)
			}),
			phase.kind === "match" && live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Match, {
				game: live,
				confirm,
				locked: pending !== null,
				onToggleConfirm: () => store({
					...saveRef.current,
					confirm: !saveRef.current.confirm
				}),
				onPlay: play,
				onHome: () => setPhase({ kind: "home" }),
				onAnalyse: () => setPhase({
					kind: "analyse",
					game: live,
					cursor: live.plies.length - 1
				}),
				onDiscard: () => {
					store({
						...saveRef.current,
						live: null
					});
					setPhase({ kind: "home" });
				}
			}),
			phase.kind === "analyse" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Analyse, {
				game: phase.game,
				cursor: phase.cursor,
				onCursor: (cursor) => setPhase({
					...phase,
					cursor
				}),
				onHome: () => setPhase({ kind: "home" })
			}),
			phase.kind === "archive" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, {
				games: archive,
				onOpen: (game) => setPhase({
					kind: "analyse",
					game,
					cursor: game.plies.length - 1
				}),
				onHome: () => setPhase({ kind: "home" }),
				onImport: (game) => setPhase({
					kind: "analyse",
					game,
					cursor: game.plies.length - 1
				})
			}),
			phase.kind === "codex" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Codex, {
				cloud,
				onHome: () => setPhase({ kind: "home" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				pending,
				onCancel: () => setPending(null)
			})
		]
	});
}
function Home({ booted, live, rooms, archiveCount, onCreate, onJoin, onTest, onOpenRoom, onResume, onArchive, onCodex, onAnalyse }) {
	const ended = live?.finishedAt ? victoryLine(live) : null;
	const saved = [...rooms].sort((a, b) => b.createdAt - a.createdAt);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-brass",
				children: "Project"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-5xl leading-none",
				children: "Alliance"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-xs text-muted",
				children: "One map. Lives stay hidden. The last nation rules."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 flex flex-col gap-2",
				children: [
					booted && live && !live.finishedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn("solid"),
						onClick: onResume,
						children: "Resume table"
					}),
					booted && ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn("solid"),
						onClick: onAnalyse,
						children: ended
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn(live && !live.finishedAt ? "ghost" : "solid"),
						onClick: onCreate,
						children: "Open a room"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn(),
						onClick: onJoin,
						children: "Enter a room code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn(),
						onClick: onTest,
						children: "Test table"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: btn(),
						onClick: onArchive,
						children: ["Records", archiveCount ? ` · ${archiveCount}` : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn("quiet"),
						onClick: onCodex,
						children: "Codex"
					})
				]
			}),
			booted && saved.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm text-muted",
					children: "Rooms on this device"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col gap-2",
					children: saved.map((room) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "w-full rounded-lg border border-line bg-surface px-3 py-3 text-left",
						onClick: () => onOpenRoom(room.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-sm font-medium",
							children: room.settings.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-1 block text-xs text-muted",
							children: [
								room.id,
								" · ",
								room.members.length,
								"/",
								room.settings.capacity,
								" · ",
								statusLabel(room.status),
								room.settings.password ? " · passphrase" : ""
							]
						})]
					}) }, room.id))
				})]
			})
		]
	});
}
var fieldClass = "mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass";
function defaultSettings() {
	return {
		name: "Northern room",
		password: "",
		capacity: 8,
		gridSize: 10,
		timezone: zoneOptions()[0] === "UTC" ? "UTC" : zoneOptions()[0],
		apHour: 8,
		juryHour: 20,
		seas: false,
		seaCells: []
	};
}
function CreateRoom({ taken, onCancel, onCreate }) {
	const [settings, setSettings] = (0, import_react.useState)(() => ({
		...defaultSettings(),
		timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC" : "UTC"
	}));
	const [hostName, setHostName] = (0, import_react.useState)("");
	const [hostIso, setHostIso] = (0, import_react.useState)("gb");
	const [picker, setPicker] = (0, import_react.useState)(false);
	function patch(key, value) {
		setSettings((current) => ({
			...current,
			[key]: value
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onCancel,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none",
				children: "Open a room"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "You sit as one nation. The room keeps its field, hours, and passphrase for when others join from their own devices."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-5 flex flex-col gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					if (!hostName.trim()) {
						toast.error("The host needs a name.");
						return;
					}
					onCreate(createRoom({
						settings,
						hostName,
						hostIso,
						taken
					}));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						htmlFor: "room-name",
						children: ["Room name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "room-name",
							value: settings.name,
							maxLength: 40,
							required: true,
							onChange: (event) => patch("name", event.target.value),
							className: fieldClass
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						htmlFor: "host-name",
						children: ["Your name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "host-name",
							value: hostName,
							maxLength: 24,
							required: true,
							onChange: (event) => setHostName(event.target.value),
							className: fieldClass
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Your country"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${btn()} mt-1 w-full justify-start`,
						onClick: () => setPicker(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
							iso: hostIso,
							className: "h-4 w-6 rounded-sm"
						}), countryByIso(hostIso)?.name]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsFields, {
						settings,
						onChange: patch,
						onPatch: (partial) => setSettings((current) => ({
							...current,
							...partial
						}))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: `${btn("solid")} mt-2`,
						children: "Open the lobby"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountryPicker, {
				open: picker,
				taken: [],
				onClose: () => setPicker(false),
				onPick: (iso) => {
					setHostIso(iso);
					setPicker(false);
				}
			})
		]
	});
}
function JoinRoom({ rooms, onCancel, onOpen }) {
	const [code, setCode] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onCancel,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none",
				children: "Enter a room"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "A code reopens a room saved on this device. It does not seat a second nation here, and it does not reach another device yet."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-5 flex flex-col gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					const id = code.trim().toUpperCase().replace(/^WD-/, "");
					const room = rooms.find((item) => item.id.toUpperCase() === id);
					if (!room) {
						toast.error("No room with that code is on this device.");
						return;
					}
					if (room.settings.password && room.settings.password !== password) {
						toast.error("That passphrase does not match.");
						return;
					}
					onOpen(room.id);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						htmlFor: "room-code",
						children: ["Room code", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "room-code",
							value: code,
							autoComplete: "off",
							onChange: (event) => setCode(event.target.value.toUpperCase()),
							className: fieldClass,
							placeholder: "ABCDE"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						htmlFor: "room-pass",
						children: ["Passphrase, if it has one", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "room-pass",
							type: "password",
							value: password,
							autoComplete: "off",
							onChange: (event) => setPassword(event.target.value),
							className: fieldClass
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: btn("solid"),
						children: "Open room"
					})
				]
			})
		]
	});
}
function RoomLobby({ room, onHome, onSave, onClose, onTest }) {
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)(room?.settings ?? null);
	const [confirmClose, setConfirmClose] = (0, import_react.useState)(false);
	const host = room?.members.find((member) => member.isHost) ?? room?.members[0];
	(0, import_react.useEffect)(() => {
		if (room) setDraft(room.settings);
	}, [room]);
	if (!room || !host || !draft) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: `${btn("quiet")} self-start px-0`,
			onClick: onHome,
			children: "Back"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 text-sm text-muted",
			children: "That room is no longer on this device."
		})]
	});
	const locked = room.status !== "waiting";
	const shown = editing && draft ? draft : room.settings;
	const seaCells = shown.seas ? shown.seaCells : [];
	const spawn = landSpawn(shown.gridSize, new Set(seaCells));
	const preview = previewNation(host.name, host.iso, spawn.x, spawn.y);
	function applyShown(next) {
		if (locked) return;
		if (editing) setDraft(next);
		else onSave(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onHome,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-brass",
				children: statusLabel(room.status)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none",
				children: room.settings.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: `${btn()} mt-4 self-start`,
				onClick: () => {
					navigator.clipboard?.writeText(room.id).then(() => toast.success("Code copied."), () => toast.message(room.id));
				},
				children: ["Code ", room.id]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [
					gridLabel(shown.gridSize),
					" · ",
					shown.timezone,
					" · dawn ",
					formatHour(shown.apHour),
					" · jury",
					" ",
					formatHour(shown.juryHour),
					shown.password ? " · passphrase set" : " · open room",
					shown.seas ? " · seas" : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6 rounded-lg border border-line bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm text-muted",
						children: "Seated"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
							iso: host.iso,
							className: "h-6 w-8 rounded-sm"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-medium",
							children: [host.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: " · host"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: countryByIso(host.iso)?.name
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm text-muted",
						children: [
							room.members.length,
							" of ",
							room.settings.capacity,
							". Other nations join from their own devices. This room does not seat them on yours."
						]
					})
				]
			}),
			locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-muted",
				children: "Settings are locked. The campaign has already begun."
			}) : editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-4 flex flex-col gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					onSave(draft);
					setEditing(false);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-3xl leading-none",
						children: "Room settings"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						htmlFor: "edit-name",
						children: ["Room name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "edit-name",
							value: draft.name,
							maxLength: 40,
							onChange: (event) => setDraft({
								...draft,
								name: event.target.value
							}),
							className: fieldClass
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsFields, {
						settings: draft,
						onChange: (key, value) => setDraft({
							...draft,
							[key]: value
						}),
						onPatch: (partial) => setDraft({
							...draft,
							...partial
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: btn("solid"),
						children: "Save settings"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn()} mt-4`,
				onClick: () => setEditing(true),
				children: "Edit room settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl leading-none",
					children: "Field"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-pressed": shown.seas,
					disabled: locked,
					className: shown.seas ? btn("solid") : btn(),
					onClick: () => applyShown({
						...shown,
						seas: !shown.seas,
						seaCells: shown.seas ? [] : generateSeaCells(shown.gridSize)
					}),
					children: "Toggle Seas"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 max-h-[min(72dvh,640px)] overflow-auto rounded-lg border border-line bg-bg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					inert: true,
					"aria-hidden": "true",
					className: "flex w-max min-w-full justify-center p-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {
						size: shown.gridSize,
						sea: seaCells,
						nations: [preview],
						selectedId: null,
						sendMode: false,
						reveal: false,
						onCell: () => {},
						onHover: () => {}
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-muted",
				children: [
					shown.gridSize,
					"×",
					shown.gridSize,
					" square",
					shown.seas ? ". Sea sits in clumps. A march cannot step onto it, and land is never cut into an island." : ". Open water is off. Every square is land."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("solid")} mt-6`,
				onClick: () => onTest(localTestFromRoom(room)),
				children: "Test this field"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Plays on this device with several nations. You move each of them. A shared campaign still waits for someone else to join."
			}),
			confirmClose ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("solid")} mt-4`,
				onClick: onClose,
				children: "Close this room"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} mt-2 self-start px-0`,
				onClick: () => setConfirmClose(true),
				children: "Close room"
			})
		]
	});
}
function SettingsFields({ settings, onChange, onPatch }) {
	const zones = zoneOptions(settings.timezone);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			htmlFor: "room-passphrase",
			children: ["Passphrase, optional", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "mt-1 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "room-passphrase",
					type: "text",
					value: settings.password,
					maxLength: 40,
					autoComplete: "off",
					onChange: (event) => onChange("password", event.target.value),
					className: "h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: btn(),
					onClick: () => onChange("password", makePassphrase()),
					children: "Generate"
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			htmlFor: "room-capacity",
			children: ["Capacity, up to 30", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "room-capacity",
				type: "number",
				min: 2,
				max: 30,
				value: settings.capacity,
				onChange: (event) => onChange("capacity", Number(event.target.value)),
				className: fieldClass
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			htmlFor: "room-field",
			children: ["Battlefield", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "room-field",
				value: settings.gridSize,
				onChange: (event) => {
					const gridSize = Number(event.target.value);
					onPatch({
						gridSize,
						seaCells: settings.seas ? generateSeaCells(gridSize) : []
					});
				},
				className: fieldClass,
				children: [
					10,
					15,
					20,
					25,
					30
				].map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: size,
					children: gridLabel(size)
				}, size))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			htmlFor: "room-zone",
			children: ["Time zone", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "room-zone",
				value: settings.timezone,
				onChange: (event) => onChange("timezone", event.target.value),
				className: fieldClass,
				children: zones.map((zone) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: zone,
					children: zone
				}, zone))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				htmlFor: "room-dawn",
				children: ["Starting hour", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HourSelect, {
					id: "room-dawn",
					value: settings.apHour,
					onChange: (hour) => onChange("apHour", hour)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				htmlFor: "room-jury",
				children: ["Jury hour", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HourSelect, {
					id: "room-jury",
					value: settings.juryHour,
					onChange: (hour) => onChange("juryHour", hour)
				})]
			})]
		})
	] });
}
function HourSelect({ id, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		id,
		value,
		onChange: (event) => onChange(Number(event.target.value)),
		className: fieldClass,
		children: Array.from({ length: 24 }, (_, hour) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: hour,
			children: formatHour(hour)
		}, hour))
	});
}
function makePassphrase() {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const bytes = /* @__PURE__ */ new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => alphabet[byte % 32]).join("");
}
function previewNation(name, iso, x, y) {
	return {
		id: "host",
		name,
		country: countryByIso(iso)?.name ?? "",
		iso,
		x,
		y,
		hp: 3,
		ap: 3,
		reach: 1,
		alive: true,
		eliminatedBy: null
	};
}
var TEST_SEATS = [
	{
		name: "Ash Vale",
		iso: "br"
	},
	{
		name: "Kenji Mori",
		iso: "jp"
	},
	{
		name: "Claire Duval",
		iso: "fr"
	},
	{
		name: "Mateo Ruiz",
		iso: "mx"
	},
	{
		name: "Ingrid Solberg",
		iso: "no"
	},
	{
		name: "Amara Okonkwo",
		iso: "ng"
	},
	{
		name: "Leo Park",
		iso: "kr"
	},
	{
		name: "Nadia Hassan",
		iso: "eg"
	}
];
function localTestFromRoom(room) {
	const host = room.members.find((member) => member.isHost) ?? room.members[0];
	const seats = [{
		name: host.name,
		iso: host.iso
	}];
	for (const seat of TEST_SEATS) {
		if (seats.length >= Math.min(4, room.settings.capacity, TEST_SEATS.length)) break;
		if (seats.some((taken) => taken.iso === seat.iso)) continue;
		seats.push(seat);
	}
	while (seats.length < 2) {
		const extra = TEST_SEATS.find((seat) => !seats.some((taken) => taken.iso === seat.iso));
		if (!extra) break;
		seats.push(extra);
	}
	return createGame({
		title: `${room.settings.name} test`,
		seats,
		size: room.settings.gridSize,
		seaCells: room.settings.seas ? room.settings.seaCells : [],
		local: true
	});
}
function mulberry32(seed) {
	let state = seed >>> 0;
	return () => {
		state = state + 1831565813 | 0;
		let t = Math.imul(state ^ state >>> 15, 1 | state);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function TestTable({ onCancel, onStart }) {
	const [gridSize, setGridSize] = (0, import_react.useState)(10);
	const [seas, setSeas] = (0, import_react.useState)(false);
	const [seaCells, setSeaCells] = (0, import_react.useState)([]);
	const [count, setCount] = (0, import_react.useState)(4);
	const [seed, setSeed] = (0, import_react.useState)(7);
	const preview = seatedNations(gridSize, seas ? seaCells : [], count, seed);
	function chooseSize(next) {
		setGridSize(next);
		setSeed((value) => value + 1);
		setSeaCells(seas ? generateSeaCells(next) : []);
	}
	function toggleSeas() {
		const next = !seas;
		setSeas(next);
		setSeed((value) => value + 1);
		setSeaCells(next ? generateSeaCells(gridSize) : []);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onCancel,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none",
				children: "Test table"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "A local table. You sit every nation yourself. Nothing here waits on another device."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-sm text-muted",
					htmlFor: "test-field",
					children: ["Battlefield", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						id: "test-field",
						value: gridSize,
						onChange: (event) => chooseSize(Number(event.target.value)),
						className: fieldClass,
						children: [
							10,
							15,
							20,
							25,
							30
						].map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: size,
							children: gridLabel(size)
						}, size))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-sm text-muted",
					htmlFor: "test-nations",
					children: ["Nations on this device", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						id: "test-nations",
						value: count,
						onChange: (event) => {
							setCount(Number(event.target.value));
							setSeed((value) => value + 1);
						},
						className: fieldClass,
						children: Array.from({ length: 7 }, (_, index) => index + 2).map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value,
							children: value
						}, value))
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl leading-none",
					children: "Field"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-pressed": seas,
					className: seas ? btn("solid") : btn(),
					onClick: toggleSeas,
					children: "Toggle Seas"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldScroll, {
				inert: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {
					size: gridSize,
					sea: seas ? seaCells : [],
					nations: preview,
					selectedId: null,
					sendMode: false,
					reveal: false,
					onCell: () => {},
					onHover: () => {}
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-muted",
				children: [
					gridSize,
					"×",
					gridSize,
					" square",
					seas ? ". Sea is clumped. You cannot march onto it. Land stays one piece." : ". Open water is off. Every square is land."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("solid")} mt-6`,
				onClick: () => onStart(createGame({
					title: "Test table",
					seats: TEST_SEATS.slice(0, count),
					size: gridSize,
					seaCells: seas ? seaCells : [],
					local: true,
					rng: mulberry32(seed)
				})),
				children: "Sit down"
			})
		]
	});
}
function seatedNations(size, sea, count, seed) {
	const cells = pickLandSpawns(size, new Set(sea), count, mulberry32(seed));
	return TEST_SEATS.slice(0, count).map((seat, index) => {
		const cell = cells[index] ?? {
			x: 0,
			y: 0
		};
		return {
			...previewNation(seat.name, seat.iso, cell.x, cell.y),
			id: seat.iso
		};
	});
}
function FieldScroll({ children, inert = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-3 max-h-[min(72dvh,640px)] overflow-auto rounded-lg border border-line bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			inert: inert || void 0,
			"aria-hidden": inert || void 0,
			className: "flex w-max min-w-full justify-center p-2",
			children
		})
	});
}
function CountryPicker({ open, taken, onClose, onPick }) {
	const [query, setQuery] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (open) setQuery("");
	}, [open]);
	const shown = COUNTRIES.filter((country) => country.name.toLowerCase().includes(query.trim().toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (next) => !next && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-4 top-16 z-50 mx-auto flex max-h-96 max-w-md flex-col rounded-lg border border-line bg-surface p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "font-display text-2xl",
					children: "Country"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					autoFocus: true,
					value: query,
					onChange: (event) => setQuery(event.target.value),
					placeholder: "Search",
					className: "mt-2 h-11 rounded-lg border border-line bg-bg px-3 text-sm outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 overflow-auto",
					children: shown.map((country) => {
						const used = taken.includes(country.iso);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: used,
							className: "flex h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm disabled:opacity-40",
							onClick: () => onPick(country.iso),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
								iso: country.iso,
								className: "h-4 w-6 rounded-sm"
							}), country.name]
						}) }, country.iso);
					})
				})
			]
		})] })
	});
}
function Match({ game, confirm, locked, onToggleConfirm, onPlay, onHome, onAnalyse, onDiscard }) {
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [sendMode, setSendMode] = (0, import_react.useState)(false);
	const [chronicleOpen, setChronicleOpen] = (0, import_react.useState)(false);
	const [hover, setHover] = (0, import_react.useState)(null);
	const [pinned, setPinned] = (0, import_react.useState)(false);
	const selected = game.nations.find((nation) => nation.id === selectedId && nation.alive) ?? null;
	const ended = victoryLine(game);
	const lines = chronicleOf(game);
	(0, import_react.useEffect)(() => {
		if (!selected) setSendMode(false);
	}, [selected]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (locked || ended || !selected) return;
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
			const delta = {
				ArrowUp: [0, -1],
				ArrowDown: [0, 1],
				ArrowLeft: [-1, 0],
				ArrowRight: [1, 0]
			}[event.key];
			if (!delta) {
				if (event.key === "Escape") {
					setSelectedId(null);
					setSendMode(false);
				}
				return;
			}
			event.preventDefault();
			march(selected.x + delta[0], selected.y + delta[1], selected);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		locked,
		ended,
		selected,
		confirm
	]);
	function march(x, y, actor) {
		onPlay({
			type: "march",
			id: actor.id,
			x,
			y
		}, {
			title: `March ${directionName(x - actor.x, y - actor.y)}?`,
			detail: `${actor.name} spends 1 AP.`
		});
	}
	function onCell(x, y, point) {
		if (ended) return;
		const occupant = game.nations.find((nation) => nation.x === x && nation.y === y) ?? null;
		if (sendMode && selected) {
			if (occupant?.alive && occupant.id !== selected.id && inReach(selected, occupant)) onPlay({
				type: "send",
				id: selected.id,
				targetId: occupant.id
			}, {
				title: `Send 1 AP to ${occupant.name}?`,
				detail: `${selected.name} spends 1 AP.`,
				always: true,
				onDone: () => setSendMode(false)
			});
			else if (occupant?.alive) toast.error("They are outside your reach.");
			else toast.error("Choose a living nation.");
			return;
		}
		if (selected && occupant?.id === selected.id) {
			setSelectedId(null);
			setPinned(false);
			return;
		}
		if (selected && occupant?.alive) {
			if (inReach(selected, occupant)) onPlay({
				type: "strike",
				id: selected.id,
				targetId: occupant.id
			}, {
				title: `Strike ${occupant.country}?`,
				detail: `${selected.name} spends 1 AP.`
			});
			else {
				setSelectedId(occupant.id);
				setSendMode(false);
				setPinned(false);
			}
			return;
		}
		if (selected && isOrthogonalStep(selected.x, selected.y, x, y) && !insideField(game, x, y)) {
			toast.error("That square is not beside you.");
			return;
		}
		if (selected && openSquare(game, x, y) && !occupant && isOrthogonalStep(selected.x, selected.y, x, y)) {
			march(x, y, selected);
			return;
		}
		if (selected && !openSquare(game, x, y) && isOrthogonalStep(selected.x, selected.y, x, y)) {
			toast.error("You can't move onto the sea.");
			return;
		}
		if (selected && occupant && !occupant.alive && isOrthogonalStep(selected.x, selected.y, x, y)) {
			toast.error("A gravestone holds that square.");
			return;
		}
		if (selected) {
			toast.error("That square is not beside you.");
			return;
		}
		if (occupant?.alive) {
			setSelectedId(occupant.id);
			setPinned(false);
			setHover(null);
			return;
		}
		if (occupant) {
			setPinned(true);
			setHover({
				nation: occupant,
				x: point.clientX,
				y: point.clientY
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-2 border-b border-line px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "min-w-0 flex-1 text-left",
						onClick: onHome,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate font-display text-2xl leading-none",
							children: "Alliance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted",
							children: [
								game.local ? "Local test · " : "",
								"Hour ",
								game.hour,
								game.size ? ` · ${game.size}×${game.size}` : ""
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-pressed": confirm,
						onClick: onToggleConfirm,
						className: confirm ? btn("solid") : btn(),
						children: "Confirm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${btn()} w-11 px-0`,
						"aria-label": "Chronicle",
						"aria-expanded": chronicleOpen,
						onClick: () => setChronicleOpen((open) => !open),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollText, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${btn()} w-11 px-0`,
						"aria-label": "Sound the next bell",
						disabled: Boolean(ended),
						onClick: () => onPlay({ type: "bell" }, {
							title: "Sound the next bell?",
							detail: "Living nations gain 2 AP.",
							always: true
						}),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative min-h-0 flex-1 overflow-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex min-h-full w-max min-w-full items-center justify-center p-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {
						size: game.size,
						sea: game.seaCells ?? [],
						nations: game.nations,
						selectedId: selected?.id ?? null,
						sendMode,
						reveal: false,
						onCell,
						onHover: (next) => {
							if (next) {
								setPinned(false);
								setHover(next);
							} else if (!pinned) setHover(null);
						}
					})
				}), chronicleOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "absolute inset-y-2 right-2 z-20 flex w-64 max-w-[80%] flex-col rounded-lg border border-line bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium",
							children: "Chronicle"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${btn("quiet")} h-9 w-9 px-0`,
							"aria-label": "Close chronicle",
							onClick: () => setChronicleOpen(false),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-auto px-3 pb-3",
						children: lines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "No nation has fallen."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-3",
							children: lines.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-sm",
								children: line
							}, `${index}-${line}`))
						})
					})]
				})]
			}),
			selected && !ended && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2 border-t border-line px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
						iso: selected.iso,
						className: "h-6 w-8 rounded-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-sm font-medium",
							children: selected.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted",
							children: [
								selected.country,
								" · ",
								selected.ap,
								" AP"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex flex-wrap items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { onStep: (dx, dy) => march(selected.x + dx, selected.y + dy, selected) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn(),
								onClick: () => onPlay({
									type: "extend",
									id: selected.id
								}, {
									title: "Extend reach?",
									detail: `${selected.name} spends 2 AP.`
								}),
								children: "Reach"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": sendMode,
								className: sendMode ? btn("solid") : btn(),
								onClick: () => setSendMode((value) => !value),
								children: "Send"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn(),
								onClick: () => onPlay({
									type: "abdicate",
									id: selected.id
								}, {
									title: "Abdicate?",
									detail: `${nationLabel(selected)} leaves the map.`,
									always: true,
									onDone: () => setSelectedId(null)
								}),
								children: "Abdicate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn("quiet"),
								onClick: () => setSelectedId(null),
								children: "Stand up"
							})
						]
					})
				]
			}),
			hover && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverCard, {
				nation: hover.nation,
				x: hover.x,
				y: hover.y,
				reveal: false
			}),
			ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 flex items-center justify-center bg-bg/75 px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-lg border border-line bg-surface p-5 text-center",
					role: "dialog",
					"aria-labelledby": "victory-title",
					children: [
						game.winnerId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
							iso: game.nations.find((nation) => nation.id === game.winnerId)?.iso ?? "br",
							className: "mx-auto mb-3 h-12 w-16 rounded-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "victory-title",
							className: "font-display text-3xl leading-tight",
							children: ended
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: btn("solid"),
									onClick: onAnalyse,
									children: "Analyse the record"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: btn(),
									onClick: onHome,
									children: "Leave the table"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: btn("quiet"),
									onClick: onDiscard,
									children: "Discard"
								})
							]
						})
					]
				})
			})
		]
	});
}
function Compass({ onStep }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex gap-1",
		children: [
			{
				label: "March north",
				dx: 0,
				dy: -1,
				icon: ChevronUp
			},
			{
				label: "March west",
				dx: -1,
				dy: 0,
				icon: ChevronLeft
			},
			{
				label: "March south",
				dx: 0,
				dy: 1,
				icon: ChevronDown
			},
			{
				label: "March east",
				dx: 1,
				dy: 0,
				icon: ChevronRight
			}
		].map((pad) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: `${btn()} w-11 px-0`,
			"aria-label": pad.label,
			onClick: () => onStep(pad.dx, pad.dy),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pad.icon, { className: "size-4" })
		}, pad.label))
	});
}
function insideField(game, x, y) {
	if (typeof game.size === "number") return x >= 0 && y >= 0 && x < game.size && y < game.size;
	return x >= 0 && y >= 0 && x < 8 && y < 6;
}
function openSquare(game, x, y) {
	if (!insideField(game, x, y)) return false;
	if (typeof game.size === "number") return isWalkable(x, y, game.size, new Set(game.seaCells ?? []));
	return isLand(x, y);
}
function Board({ nations, selectedId, sendMode, reveal, onCell, onHover, size, sea = [] }) {
	const selected = nations.find((nation) => nation.id === selectedId && nation.alive) ?? null;
	const width = size ?? 8;
	const height = size ?? 6;
	const tile = size == null ? 46 : 32;
	const seaSet = new Set(sea);
	const dense = tile <= 32 && width >= 18;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid overflow-hidden rounded-lg border border-line",
		style: {
			width: width * tile,
			height: height * tile,
			gridTemplateColumns: `repeat(${width}, ${tile}px)`,
			gridTemplateRows: `repeat(${height}, ${tile}px)`
		},
		children: Array.from({ length: height * width }, (_, index) => {
			const x = index % width;
			const y = Math.floor(index / width);
			const occupant = nations.find((nation) => nation.x === x && nation.y === y) ?? null;
			const land = size == null ? isLand(x, y) : !seaSet.has(cellKey(x, y));
			const beside = selected !== null && land && !occupant && isOrthogonalStep(selected.x, selected.y, x, y);
			const strike = selected !== null && !sendMode && occupant !== null && occupant.alive && inReach(selected, occupant);
			const send = sendMode && selected !== null && occupant !== null && occupant.alive && inReach(selected, occupant);
			const mine = occupant?.id === selectedId && occupant.alive;
			let tone = "bg-sea";
			if (land) tone = (x + y) % 2 === 0 ? "bg-land" : "bg-land-deep";
			if (beside) tone = "bg-land-bright";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": occupant ? `${occupant.name}, ${occupant.country}${occupant.alive ? "" : ", fallen"}` : land ? "Land" : "Sea",
				className: `relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden border border-line p-0 ${tone} ${mine || send ? "ring-2 ring-brass ring-inset" : ""} ${strike ? "ring-2 ring-blood ring-inset" : ""}`,
				onClick: (event) => onCell(x, y, event),
				onPointerEnter: (event) => {
					if (occupant) onHover({
						nation: occupant,
						x: event.clientX,
						y: event.clientY
					});
				},
				onPointerMove: (event) => {
					if (occupant) onHover({
						nation: occupant,
						x: event.clientX,
						y: event.clientY
					});
				},
				onPointerLeave: () => onHover(null),
				children: occupant && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
					nation: occupant,
					reveal,
					dense
				})
			}, `${x}-${y}`);
		})
	});
}
function Token({ nation, reveal, dense }) {
	if (!nation.alive) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "flex flex-col items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `block rounded-t-lg rounded-b-sm bg-surface-2 ${dense ? "h-2 w-3" : "h-4 w-5"}` }), reveal && !dense && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "mt-0.5 text-xs leading-none text-muted",
			children: ["0·", nation.ap]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "relative flex max-h-full max-w-full flex-col items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
			iso: nation.iso,
			className: dense ? "h-3 w-4 max-h-full rounded-sm" : "h-6 w-8 rounded-sm"
		}), reveal && !dense && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "mt-0.5 rounded bg-bg px-1 text-xs leading-none text-fg",
			children: [
				nation.hp,
				"·",
				nation.ap
			]
		})]
	});
}
function HoverCard({ nation, x, y, reveal }) {
	const left = typeof window === "undefined" ? x : Math.max(8, Math.min(x + 14, window.innerWidth - 188));
	const top = typeof window === "undefined" ? y : Math.max(8, Math.min(y + 14, window.innerHeight - 132));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none fixed z-30 w-44 rounded-lg border border-line bg-surface p-2",
		style: {
			left,
			top
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
				iso: nation.iso,
				className: "mb-2 h-8 w-12 rounded-sm"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium leading-tight",
				children: nation.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted",
				children: nation.country
			}),
			reveal && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 text-sm",
				children: [
					nation.hp,
					" health · ",
					nation.ap,
					" AP · reach ",
					nation.reach
				]
			})
		]
	});
}
function Analyse({ game, cursor, onCursor, onHome }) {
	const last = game.plies.length - 1;
	const safe = Math.max(0, Math.min(cursor, last));
	const ply = game.plies[safe];
	const [hover, setHover] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (event.key === "ArrowLeft") onCursor(Math.max(0, safe - 1));
			if (event.key === "ArrowRight") onCursor(Math.min(last, safe + 1));
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		last,
		onCursor,
		safe
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-2 border-b border-line px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "min-w-0 flex-1 text-left",
					onClick: onHome,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-display text-2xl leading-none",
						children: "Record"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-xs text-muted",
						children: victoryLine(game) ?? game.title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: btn(),
					onClick: () => downloadRecord(game),
					children: "Download"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 overflow-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex w-max min-w-full justify-center p-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {
						size: game.size,
						sea: game.seaCells ?? [],
						nations: ply.snapshot,
						selectedId: null,
						sendMode: false,
						reveal: true,
						onCell: (x, y, point) => {
							const occupant = ply.snapshot.find((nation) => nation.x === x && nation.y === y);
							setHover(occupant ? {
								nation: occupant,
								x: point.clientX,
								y: point.clientY
							} : null);
						},
						onHover: setHover
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-3 max-w-3xl px-2 text-xs text-muted",
					children: "Health · AP on each flag. Hover for reach."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-line px-3 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-3xl flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${btn()} w-11 px-0`,
								"aria-label": "Opening",
								onClick: () => onCursor(0),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsLeft, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${btn()} w-11 px-0`,
								"aria-label": "Previous action",
								onClick: () => onCursor(Math.max(0, safe - 1)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-14 text-center text-sm",
								children: [
									safe,
									" / ",
									last
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${btn()} w-11 px-0`,
								"aria-label": "Next action",
								onClick: () => onCursor(Math.min(last, safe + 1)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${btn()} w-11 px-0`,
								"aria-label": "Latest",
								onClick: () => onCursor(last),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsRight, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "ply",
								children: "Action"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "ply",
								className: "min-w-0 flex-1",
								type: "range",
								min: 0,
								max: last,
								value: safe,
								onChange: (event) => onCursor(Number(event.target.value))
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							"Hour ",
							ply.hour,
							". ",
							ply.text
						]
					})]
				})
			}),
			hover && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverCard, {
				nation: hover.nation,
				x: hover.x,
				y: hover.y,
				reveal: true
			})
		]
	});
}
function Archive({ games, onOpen, onHome, onImport }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onHome,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Records"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: `${btn()} mt-4`,
				children: ["Open a record", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "application/json",
					className: "sr-only",
					onChange: async (event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (!file) return;
						try {
							const parsed = JSON.parse(await file.text());
							if (!isGame(parsed)) {
								toast.error("That record could not be read.");
								return;
							}
							onImport(parsed);
						} catch {
							toast.error("That record could not be read.");
						}
					}
				})]
			}),
			games.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: "Finished tables are kept here, ready to step through."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 flex flex-col gap-2",
				children: games.map((game) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "w-full rounded-lg border border-line bg-surface px-3 py-3 text-left",
					onClick: () => onOpen(game),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium",
						children: victoryLine(game)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-1 block text-xs text-muted",
						children: [
							game.title,
							" · ",
							Math.max(0, game.plies.length - 1),
							" actions"
						]
					})]
				}) }, game.id))
			})
		]
	});
}
function Codex({ cloud, onHome }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn("quiet")} self-start px-0`,
				onClick: onHome,
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Codex"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 flex flex-col gap-3",
				children: [
					"March to a neighboring land square for 1 AP. You cannot move onto a sea tile. Nations and gravestones also block the step.",
					"Toggle Seas lays water in clumps, the way nations are scattered, then grown together. Land stays one piece: peninsulas and narrow landways can appear, islands do not.",
					"Strike a nation inside your reach for 1 AP. The third blow eliminates them. Lives are never shown.",
					"Extend reach for 2 AP. Send 1 AP to a nation inside your reach. Abdicate to leave the map.",
					"Sound the bell to advance the hour. Living nations gain 2 AP.",
					"A room keeps its name, code, capacity, battlefield size, time zone, starting hour, and jury hour. The host can change them only while the room is waiting.",
					"A test table seats several nations on this device so the field can be tried without another player. You move each nation in turn.",
					"The chronicle names only the blow that ends a nation.",
					"When one nation remains, they rule the world. The record can be analysed with health, AP, and reach visible.",
					"Confirm asks before an action. Abdication, sending AP, and the bell always ask."
				].map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-sm text-fg",
					children: rule
				}, rule))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: cloud ? "Shared tables are connected. Health and action points stay off the public board." : "Room settings stay on this device for now. When shared rooms connect, the same settings travel with the room, and dawn and the jury run even if nobody has the page open."
			})
		]
	});
}
function ConfirmDialog({ pending, onCancel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
		open: pending !== null,
		onOpenChange: (open) => !open && onCancel(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
			className: "fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-lg border border-line bg-surface p-4",
			onKeyDown: (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					pending?.run();
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, {
					className: "font-display text-3xl leading-tight",
					children: pending?.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, {
					className: "mt-1 text-sm text-muted",
					children: pending?.detail
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
						className: btn(),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
						className: btn("solid"),
						onClick: () => pending?.run(),
						children: "Confirm"
					})]
				})
			]
		})] })
	});
}
function downloadRecord(game) {
	const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${game.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "alliance"}-record.json`;
	link.click();
	URL.revokeObjectURL(url);
}
var SplitComponent = AllianceApp;
//#endregion
export { SplitComponent as component };
