import { useEffect, useRef, useState, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ScrollText,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { HEIGHT, WIDTH, cellKey, generateSeaCells, isLand, isWalkable, landSpawn } from "./board.ts";
import { getCloudStatus } from "./cloud.ts";
import { COUNTRIES, countryByIso } from "./countries.ts";
import {
  createRoom,
  formatHour,
  gridLabel,
  normalizeSettings,
  statusLabel,
  zoneOptions,
  type GridSize,
  type Room,
  type RoomSettings,
} from "./room.ts";
import {
  applyAction,
  chronicleOf,
  createGame,
  chebyshev,
  directionName,
  inReach,
  isOrthogonalStep,
  nationLabel,
  pickLandSpawns,
  victoryLine,
  type Action,
  type Game,
  type Nation,
  type Result,
  type Seat,
} from "./rules.ts";
import { isGame, loadSave, rememberGame, writeSave, type SaveFile } from "./storage.ts";

type Phase =
  | { kind: "home" }
  | { kind: "create" }
  | { kind: "room"; id: string }
  | { kind: "join" }
  | { kind: "test" }
  | { kind: "match" }
  | { kind: "archive" }
  | { kind: "codex" }
  | { kind: "analyse"; game: Game; cursor: number };

type Pending = { title: string; detail: string; run: () => void };
type Hover = { nation: Nation; x: number; y: number };
type PlayOptions = { title: string; detail: string; always?: boolean; onDone?: () => void };

function btn(kind: "solid" | "ghost" | "quiet" = "ghost") {
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-40";
  if (kind === "solid") return `${base} bg-brass text-bg`;
  if (kind === "quiet") return `${base} text-muted`;
  return `${base} border border-line bg-surface text-fg`;
}

function Flag({ iso, className = "" }: { iso: string; className?: string }) {
  return (
    <img
      src={`/flags/${iso}.svg`}
      alt=""
      draggable={false}
      className={`object-cover ${className}`}
    />
  );
}

export function AllianceApp() {
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "home" });
  const [confirm, setConfirm] = useState(false);
  const [live, setLive] = useState<Game | null>(null);
  const [archive, setArchive] = useState<Game[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const saveRef = useRef<SaveFile>({
    version: 2,
    confirm: false,
    live: null,
    archive: [],
    rooms: [],
    activeRoomId: null,
  });
  const liveRef = useRef<Game | null>(null);
  liveRef.current = live;

  useEffect(() => {
    const save = loadSave();
    saveRef.current = save;
    setConfirm(save.confirm);
    setLive(save.live);
    setArchive(save.archive);
    setRooms(save.rooms);
    setBooted(true);
    getCloudStatus()
      .then((status) => setCloud(status.ready))
      .catch(() => setCloud(false));
  }, []);

  useEffect(() => {
    const probe = window as Window & {
      __alliance?: {
        phase: string;
        confirm: boolean;
        victory: string | null;
        chronicle: string[];
      };
    };
    probe.__alliance = {
      phase: phase.kind,
      confirm,
      victory: live ? victoryLine(live) : null,
      chronicle: live ? chronicleOf(live) : [],
    };
  }, [phase, confirm, live]);

  function store(next: SaveFile) {
    saveRef.current = next;
    liveRef.current = next.live;
    writeSave(next);
    setConfirm(next.confirm);
    setLive(next.live);
    setArchive(next.archive);
    setRooms(next.rooms);
  }

  function play(action: Action, opts: PlayOptions) {
    const current = liveRef.current;
    if (!current) return;
    const preview = applyAction(current, action);
    if (!preview.ok) {
      toast.error(preview.toast);
      return;
    }
    const run = () => {
      const latest = liveRef.current;
      const result: Result = latest ? applyAction(latest, action) : preview;
      setPending(null);
      if (!result.ok) {
        toast.error(result.toast);
        return;
      }
      store(rememberGame(saveRef.current, result.game));
      if (result.toast) toast.success(result.toast);
      opts.onDone?.();
    };
    if (opts.always || saveRef.current.confirm) setPending({ title: opts.title, detail: opts.detail, run });
    else run();
  }

  function openRoom(id: string) {
    store({ ...saveRef.current, activeRoomId: id });
    setPhase({ kind: "room", id });
  }

  function beginLocal(game: Game) {
    const run = () => {
      setPending(null);
      store({ ...saveRef.current, live: game });
      setPhase({ kind: "match" });
    };
    if (saveRef.current.live && !saveRef.current.live.finishedAt) {
      setPending({
        title: "Replace the open table?",
        detail: "The unfinished table on this device will be discarded.",
        run,
      });
      return;
    }
    run();
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Toaster position="top-center" duration={2200} />
      {phase.kind === "home" && (
        <Home
          booted={booted}
          live={live}
          rooms={rooms}
          archiveCount={archive.length}
          onCreate={() => setPhase({ kind: "create" })}
          onJoin={() => setPhase({ kind: "join" })}
          onTest={() => setPhase({ kind: "test" })}
          onOpenRoom={openRoom}
          onResume={() => setPhase({ kind: "match" })}
          onArchive={() => setPhase({ kind: "archive" })}
          onCodex={() => setPhase({ kind: "codex" })}
          onAnalyse={() => {
            if (!live) return;
            setPhase({ kind: "analyse", game: live, cursor: live.plies.length - 1 });
          }}
        />
      )}
      {phase.kind === "create" && (
        <CreateRoom
          taken={rooms.map((room) => room.id)}
          onCancel={() => setPhase({ kind: "home" })}
          onCreate={(room) => {
            store({ ...saveRef.current, rooms: [room, ...saveRef.current.rooms], activeRoomId: room.id });
            setPhase({ kind: "room", id: room.id });
          }}
        />
      )}
      {phase.kind === "join" && (
        <JoinRoom
          rooms={rooms}
          onCancel={() => setPhase({ kind: "home" })}
          onOpen={openRoom}
        />
      )}
      {phase.kind === "test" && (
        <TestTable
          onCancel={() => setPhase({ kind: "home" })}
          onStart={(game) => beginLocal(game)}
        />
      )}
      {phase.kind === "room" && (
        <RoomLobby
          room={rooms.find((room) => room.id === phase.id) ?? null}
          onHome={() => setPhase({ kind: "home" })}
          onSave={(settings) => {
            const current = saveRef.current.rooms.find((room) => room.id === phase.id);
            if (!current || current.status !== "waiting") {
              toast.error("Settings lock once the campaign begins.");
              return;
            }
            const nextRoom: Room = {
              ...current,
              settings: normalizeSettings(settings, current.members.length),
            };
            store({
              ...saveRef.current,
              rooms: saveRef.current.rooms.map((room) => (room.id === nextRoom.id ? nextRoom : room)),
            });
            toast.success("Room settings saved.");
          }}
          onClose={() => {
            store({
              ...saveRef.current,
              rooms: saveRef.current.rooms.filter((room) => room.id !== phase.id),
              activeRoomId: saveRef.current.activeRoomId === phase.id ? null : saveRef.current.activeRoomId,
            });
            setPhase({ kind: "home" });
          }}
          onTest={(game) => beginLocal(game)}
        />
      )}
      {phase.kind === "match" && live && (
        <Match
          game={live}
          confirm={confirm}
          locked={pending !== null}
          onToggleConfirm={() => store({ ...saveRef.current, confirm: !saveRef.current.confirm })}
          onPlay={play}
          onHome={() => setPhase({ kind: "home" })}
          onAnalyse={() => setPhase({ kind: "analyse", game: live, cursor: live.plies.length - 1 })}
          onDiscard={() => {
            store({ ...saveRef.current, live: null });
            setPhase({ kind: "home" });
          }}
        />
      )}
      {phase.kind === "analyse" && (
        <Analyse
          game={phase.game}
          cursor={phase.cursor}
          onCursor={(cursor) => setPhase({ ...phase, cursor })}
          onHome={() => setPhase({ kind: "home" })}
        />
      )}
      {phase.kind === "archive" && (
        <Archive
          games={archive}
          onOpen={(game) => setPhase({ kind: "analyse", game, cursor: game.plies.length - 1 })}
          onHome={() => setPhase({ kind: "home" })}
          onImport={(game) => setPhase({ kind: "analyse", game, cursor: game.plies.length - 1 })}
        />
      )}
      {phase.kind === "codex" && <Codex cloud={cloud} onHome={() => setPhase({ kind: "home" })} />}
      <ConfirmDialog pending={pending} onCancel={() => setPending(null)} />
    </div>
  );
}

function previewNation(name: string, iso: string, x: number, y: number): Nation {
  return {
    id: "host",
    name,
    country: countryByIso(iso)?.name ?? "",
    iso,
    x,
    y,
    hp: 3,
    ap: 1,
    reach: 2,
    alive: true,
    eliminatedBy: null,
  };
}

function Home({
  booted,
  live,
  rooms,
  archiveCount,
  onCreate,
  onJoin,
  onTest,
  onOpenRoom,
  onResume,
  onArchive,
  onCodex,
  onAnalyse,
}: {
  booted: boolean;
  live: Game | null;
  rooms: Room[];
  archiveCount: number;
  onCreate: () => void;
  onJoin: () => void;
  onTest: () => void;
  onOpenRoom: (id: string) => void;
  onResume: () => void;
  onArchive: () => void;
  onCodex: () => void;
  onAnalyse: () => void;
}) {
  const ended = live?.finishedAt ? victoryLine(live) : null;
  const saved = [...rooms].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-12">
      <p className="text-sm text-brass">Project</p>
      <h1 className="font-display text-5xl leading-none">Alliance</h1>
      <p className="mt-3 max-w-xs text-muted">One map. Lives stay hidden. The last nation rules.</p>
      <div className="mt-8 flex flex-col gap-2">
        {booted && live && !live.finishedAt && (
          <button type="button" className={btn("solid")} onClick={onResume}>
            Resume table
          </button>
        )}
        {booted && ended && (
          <button type="button" className={btn("solid")} onClick={onAnalyse}>
            {ended}
          </button>
        )}
        <button type="button" className={btn(live && !live.finishedAt ? "ghost" : "solid")} onClick={onCreate}>
          Open a room
        </button>
        <button type="button" className={btn()} onClick={onJoin}>
          Enter a room code
        </button>
        <button type="button" className={btn()} onClick={onTest}>
          Test table
        </button>
        <button type="button" className={btn()} onClick={onArchive}>
          Records{archiveCount ? ` · ${archiveCount}` : ""}
        </button>
        <button type="button" className={btn("quiet")} onClick={onCodex}>
          Codex
        </button>
      </div>
      {booted && saved.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm text-muted">Rooms on this device</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {saved.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-3 text-left"
                  onClick={() => onOpenRoom(room.id)}
                >
                  <span className="block text-sm font-medium">{room.settings.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {room.id} · {room.members.length}/{room.settings.capacity} · {statusLabel(room.status)}
                    {room.settings.password ? " · passphrase" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

const fieldClass =
  "mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass";

function defaultSettings(): RoomSettings {
  return {
    name: "Northern room",
    password: "",
    capacity: 8,
    gridSize: 10,
    timezone: zoneOptions()[0] === "UTC" ? "UTC" : zoneOptions()[0]!,
    apHour: 8,
    juryHour: 20,
    seas: false,
    seaCells: [],
  };
}

function CreateRoom({
  taken,
  onCancel,
  onCreate,
}: {
  taken: string[];
  onCancel: () => void;
  onCreate: (room: Room) => void;
}) {
  const [settings, setSettings] = useState<RoomSettings>(() => ({
    ...defaultSettings(),
    timezone: typeof Intl !== "undefined" ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC") : "UTC",
  }));
  const [hostName, setHostName] = useState("");
  const [hostIso, setHostIso] = useState("gb");
  const [picker, setPicker] = useState(false);

  function patch<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onCancel}>
        Back
      </button>
      <h1 className="font-display text-4xl leading-none">Open a room</h1>
      <p className="mt-3 text-sm text-muted">
        You sit as one nation. The room keeps its field, hours, and passphrase for when others join from their own
        devices.
      </p>
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hostName.trim()) {
            toast.error("The host needs a name.");
            return;
          }
          onCreate(createRoom({ settings, hostName, hostIso, taken }));
        }}
      >
        <label className="text-sm text-muted" htmlFor="room-name">
          Room name
          <input
            id="room-name"
            value={settings.name}
            maxLength={40}
            required
            onChange={(event) => patch("name", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-muted" htmlFor="host-name">
          Your name
          <input
            id="host-name"
            value={hostName}
            maxLength={24}
            required
            onChange={(event) => setHostName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <div>
          <p className="text-sm text-muted">Your country</p>
          <button type="button" className={`${btn()} mt-1 w-full justify-start`} onClick={() => setPicker(true)}>
            <Flag iso={hostIso} className="h-4 w-6 rounded-sm" />
            {countryByIso(hostIso)?.name}
          </button>
        </div>
        <SettingsFields
          settings={settings}
          onChange={patch}
          onPatch={(partial) => setSettings((current) => ({ ...current, ...partial }))}
        />
        <button type="submit" className={`${btn("solid")} mt-2`}>
          Open the lobby
        </button>
      </form>
            <CountryPicker open={picker} taken={[]} onClose={() => setPicker(false)} onPick={(iso) => {
        setHostIso(iso);
        setPicker(false);
      }} />
    </main>
  );
}
function JoinRoom({
  rooms,
  onCancel,
  onOpen,
}: {
  rooms: Room[];
  onCancel: () => void;
  onOpen: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onCancel}>
        Back
      </button>
      <h1 className="font-display text-4xl leading-none">Enter a room</h1>
      <p className="mt-3 text-sm text-muted">
        A code reopens a room saved on this device. It does not seat a second nation here, and it does not reach
        another device yet.
      </p>
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(event) => {
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
        }}
      >
        <label className="text-sm text-muted" htmlFor="room-code">
          Room code
          <input
            id="room-code"
            value={code}
            autoComplete="off"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className={fieldClass}
            placeholder="ABCDE"
          />
        </label>
        <label className="text-sm text-muted" htmlFor="room-pass">
          Passphrase, if it has one
          <input
            id="room-pass"
            type="password"
            value={password}
            autoComplete="off"
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </label>
        <button type="submit" className={btn("solid")}>
          Open room
        </button>
      </form>
    </main>
  );
}

function RoomLobby({
  room,
  onHome,
  onSave,
  onClose,
  onTest,
}: {
  room: Room | null;
  onHome: () => void;
  onSave: (settings: RoomSettings) => void;
  onClose: () => void;
  onTest: (game: Game) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoomSettings | null>(room?.settings ?? null);
  const [confirmClose, setConfirmClose] = useState(false);
  const host = room?.members.find((member) => member.isHost) ?? room?.members[0];

  useEffect(() => {
    if (room) setDraft(room.settings);
  }, [room]);

  if (!room || !host || !draft) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
        <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onHome}>
          Back
        </button>
        <p className="mt-6 text-sm text-muted">That room is no longer on this device.</p>
      </main>
    );
  }

  const locked = room.status !== "waiting";
  const shown = editing && draft ? draft : room.settings;
  const seaCells = shown.seas ? shown.seaCells : [];
  const spawn = landSpawn(shown.gridSize, new Set(seaCells));
  const preview = previewNation(host.name, host.iso, spawn.x, spawn.y);

  function applyShown(next: RoomSettings) {
    if (locked) return;
    if (editing) setDraft(next);
    else onSave(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onHome}>
        Back
      </button>
      <p className="mt-2 text-sm text-brass">{statusLabel(room.status)}</p>
      <h1 className="font-display text-4xl leading-none">{room.settings.name}</h1>
      <button
        type="button"
        className={`${btn()} mt-4 self-start`}
        onClick={() => {
          void navigator.clipboard?.writeText(room.id).then(
            () => toast.success("Code copied."),
            () => toast.message(room.id),
          );
        }}
      >
        Code {room.id}
      </button>
      <p className="mt-3 text-sm text-muted">
        {gridLabel(shown.gridSize)} · {shown.timezone} · dawn {formatHour(shown.apHour)} · jury{" "}
        {formatHour(shown.juryHour)}
        {shown.password ? " · passphrase set" : " · open room"}
        {shown.seas ? " · seas" : ""}
      </p>

      <section className="mt-6 rounded-lg border border-line bg-surface p-3">
        <h2 className="text-sm text-muted">Seated</h2>
        <div className="mt-2 flex items-center gap-2">
          <Flag iso={host.iso} className="h-6 w-8 rounded-sm" />
          <div>
            <p className="text-sm font-medium">
              {host.name}
              <span className="text-muted"> · host</span>
            </p>
            <p className="text-xs text-muted">{countryByIso(host.iso)?.name}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {room.members.length} of {room.settings.capacity}. Other nations join from their own devices. This room does
          not seat them on yours.
        </p>
      </section>

      {locked ? (
        <p className="mt-4 text-sm text-muted">Settings are locked. The campaign has already begun.</p>
      ) : editing ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
            setEditing(false);
          }}
        >
          <h2 className="font-display text-3xl leading-none">Room settings</h2>
          <label className="text-sm text-muted" htmlFor="edit-name">
            Room name
            <input
              id="edit-name"
              value={draft.name}
              maxLength={40}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className={fieldClass}
            />
          </label>
          <SettingsFields
            settings={draft}
            onChange={(key, value) => setDraft({ ...draft, [key]: value })}
            onPatch={(partial) => setDraft({ ...draft, ...partial })}
          />
          <button type="submit" className={btn("solid")}>
            Save settings
          </button>
        </form>
      ) : (
        <button type="button" className={`${btn()} mt-4`} onClick={() => setEditing(true)}>
          Edit room settings
        </button>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl leading-none">Field</h2>
        <button
          type="button"
          aria-pressed={shown.seas}
          disabled={locked}
          className={shown.seas ? btn("solid") : btn()}
          onClick={() =>
            applyShown({
              ...shown,
              seas: !shown.seas,
              seaCells: shown.seas ? [] : generateSeaCells(shown.gridSize),
            })
          }
        >
          Toggle Seas
        </button>
      </div>
      <div className="mt-3 max-h-[min(72dvh,640px)] overflow-auto rounded-lg border border-line bg-bg">
        <div inert aria-hidden="true" className="flex w-max min-w-full justify-center p-2">
          <Board
            size={shown.gridSize}
            sea={seaCells}
            nations={[preview]}
            selectedId={null}
            sendMode={false}
            reveal={false}
            onCell={() => {}}
            onHover={() => {}}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {shown.gridSize}×{shown.gridSize} square
        {shown.seas
          ? ". Sea sits in clumps. A march cannot step onto it, and land is never cut into an island."
          : ". Open water is off. Every square is land."}
      </p>

      <button
        type="button"
        className={`${btn("solid")} mt-6`}
        onClick={() => onTest(localTestFromRoom(room))}
      >
        Test this field
      </button>
      <p className="mt-2 text-xs text-muted">
        Plays on this device with several nations. You move each of them. A shared campaign still waits for someone
        else to join.
      </p>

      {confirmClose ? (
        <button type="button" className={`${btn("solid")} mt-4`} onClick={onClose}>
          Close this room
        </button>
      ) : (
        <button type="button" className={`${btn("quiet")} mt-2 self-start px-0`} onClick={() => setConfirmClose(true)}>
          Close room
        </button>
      )}
    </main>
  );
}

function SettingsFields({
  settings,
  onChange,
  onPatch,
}: {
  settings: RoomSettings;
  onChange: <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => void;
  onPatch: (partial: Partial<RoomSettings>) => void;
}) {
  const zones = zoneOptions(settings.timezone);
  return (
    <>
      <label className="text-sm text-muted" htmlFor="room-passphrase">
        Passphrase, optional
        <span className="mt-1 flex gap-2">
          <input
            id="room-passphrase"
            type="text"
            value={settings.password}
            maxLength={40}
            autoComplete="off"
            onChange={(event) => onChange("password", event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
          />
          <button
            type="button"
            className={btn()}
            onClick={() => onChange("password", makePassphrase())}
          >
            Generate
          </button>
        </span>
      </label>
      <label className="text-sm text-muted" htmlFor="room-capacity">
        Capacity, up to 30
        <input
          id="room-capacity"
          type="number"
          min={2}
          max={30}
          value={settings.capacity}
          onChange={(event) => onChange("capacity", Number(event.target.value))}
          className={fieldClass}
        />
      </label>
      <label className="text-sm text-muted" htmlFor="room-field">
        Battlefield
        <select
          id="room-field"
          value={settings.gridSize}
          onChange={(event) => {
            const gridSize = Number(event.target.value) as GridSize;
            onPatch({
              gridSize,
              seaCells: settings.seas ? generateSeaCells(gridSize) : [],
            });
          }}
          className={fieldClass}
        >
          {([10, 15, 20, 25, 30] as const).map((size) => (
            <option key={size} value={size}>
              {gridLabel(size)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-muted" htmlFor="room-zone">
        Time zone
        <select
          id="room-zone"
          value={settings.timezone}
          onChange={(event) => onChange("timezone", event.target.value)}
          className={fieldClass}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm text-muted" htmlFor="room-dawn">
          Starting hour
          <HourSelect id="room-dawn" value={settings.apHour} onChange={(hour) => onChange("apHour", hour)} />
        </label>
        <label className="text-sm text-muted" htmlFor="room-jury">
          Jury hour
          <HourSelect id="room-jury" value={settings.juryHour} onChange={(hour) => onChange("juryHour", hour)} />
        </label>
      </div>
    </>
  );
}

function HourSelect({ id, value, onChange }: { id: string; value: number; onChange: (hour: number) => void }) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))} className={fieldClass}>
      {Array.from({ length: 24 }, (_, hour) => (
        <option key={hour} value={hour}>
          {formatHour(hour)}
        </option>
      ))}
    </select>
  );
}

function makePassphrase() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const TEST_SEATS: Seat[] = [
  { name: "Ash Vale", iso: "br" },
  { name: "Kenji Mori", iso: "jp" },
  { name: "Claire Duval", iso: "fr" },
  { name: "Mateo Ruiz", iso: "mx" },
  { name: "Ingrid Solberg", iso: "no" },
  { name: "Amara Okonkwo", iso: "ng" },
  { name: "Leo Park", iso: "kr" },
  { name: "Nadia Hassan", iso: "eg" },
];

function localTestFromRoom(room: Room): Game {
  const host = room.members.find((member) => member.isHost) ?? room.members[0]!;
  const seats: Seat[] = [{ name: host.name, iso: host.iso }];
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
    local: true,
  });
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function TestTable({ onCancel, onStart }: { onCancel: () => void; onStart: (game: Game) => void }) {
  const [gridSize, setGridSize] = useState<GridSize>(10);
  const [seas, setSeas] = useState(false);
  const [seaCells, setSeaCells] = useState<string[]>([]);
  const [count, setCount] = useState(4);
  const [seed, setSeed] = useState(7);

  const preview = seatedNations(gridSize, seas ? seaCells : [], count, seed);

  function chooseSize(next: GridSize) {
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onCancel}>
        Back
      </button>
      <h1 className="font-display text-4xl leading-none">Test table</h1>
      <p className="mt-3 text-sm text-muted">
        A local table. You sit every nation yourself. Nothing here waits on another device.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <label className="text-sm text-muted" htmlFor="test-field">
          Battlefield
          <select
            id="test-field"
            value={gridSize}
            onChange={(event) => chooseSize(Number(event.target.value) as GridSize)}
            className={fieldClass}
          >
            {([10, 15, 20, 25, 30] as const).map((size) => (
              <option key={size} value={size}>
                {gridLabel(size)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted" htmlFor="test-nations">
          Nations on this device
          <select
            id="test-nations"
            value={count}
            onChange={(event) => {
              setCount(Number(event.target.value));
              setSeed((value) => value + 1);
            }}
            className={fieldClass}
          >
            {Array.from({ length: 7 }, (_, index) => index + 2).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl leading-none">Field</h2>
        <button
          type="button"
          aria-pressed={seas}
          className={seas ? btn("solid") : btn()}
          onClick={toggleSeas}
        >
          Toggle Seas
        </button>
      </div>
      <FieldScroll inert>
        <Board
          size={gridSize}
          sea={seas ? seaCells : []}
          nations={preview}
          selectedId={null}
          sendMode={false}
          reveal={false}
          onCell={() => {}}
          onHover={() => {}}
        />
      </FieldScroll>
      <p className="mt-2 text-xs text-muted">
        {gridSize}×{gridSize} square
        {seas
          ? ". Sea is clumped. You cannot march onto it. Land stays one piece."
          : ". Open water is off. Every square is land."}
      </p>
      <button
        type="button"
        className={`${btn("solid")} mt-6`}
        onClick={() =>
          onStart(
            createGame({
              title: "Test table",
              seats: TEST_SEATS.slice(0, count),
              size: gridSize,
              seaCells: seas ? seaCells : [],
              local: true,
              rng: mulberry32(seed),
            }),
          )
        }
      >
        Sit down
      </button>
    </main>
  );
}

function seatedNations(size: number, sea: string[], count: number, seed: number): Nation[] {
  const cells = pickLandSpawns(size, new Set(sea), count, mulberry32(seed));
  return TEST_SEATS.slice(0, count).map((seat, index) => {
    const cell = cells[index] ?? { x: 0, y: 0 };
    const nation = previewNation(seat.name, seat.iso, cell.x, cell.y);
    return { ...nation, id: seat.iso };
  });
}

function FieldScroll({ children, inert = false }: { children: ReactNode; inert?: boolean }) {
  return (
    <div className="mt-3 max-h-[min(72dvh,640px)] overflow-auto rounded-lg border border-line bg-bg">
      <div inert={inert || undefined} aria-hidden={inert || undefined} className="flex w-max min-w-full justify-center p-2">
        {children}
      </div>
    </div>
  );
}

function CountryPicker({
  open,
  taken,
  onClose,
  onPick,
}: {
  open: boolean;
  taken: string[];
  onClose: () => void;
  onPick: (iso: string) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  const shown = COUNTRIES.filter((country) => country.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Dialog.Content className="fixed inset-x-4 top-16 z-50 mx-auto flex max-h-96 max-w-md flex-col rounded-lg border border-line bg-surface p-3">
          <Dialog.Title className="font-display text-2xl">Country</Dialog.Title>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="mt-2 h-11 rounded-lg border border-line bg-bg px-3 text-sm outline-none"
          />
          <ul className="mt-2 overflow-auto">
            {shown.map((country) => {
              const used = taken.includes(country.iso);
              return (
                <li key={country.iso}>
                  <button
                    type="button"
                    disabled={used}
                    className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm disabled:opacity-40"
                    onClick={() => onPick(country.iso)}
                  >
                    <Flag iso={country.iso} className="h-4 w-6 rounded-sm" />
                    {country.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Match({
  game,
  confirm,
  locked,
  onToggleConfirm,
  onPlay,
  onHome,
  onAnalyse,
  onDiscard,
}: {
  game: Game;
  confirm: boolean;
  locked: boolean;
  onToggleConfirm: () => void;
  onPlay: (action: Action, opts: PlayOptions) => void;
  onHome: () => void;
  onAnalyse: () => void;
  onDiscard: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [pinned, setPinned] = useState(false);
  const selected = game.nations.find((nation) => nation.id === selectedId && nation.alive) ?? null;
  const ended = victoryLine(game);
  const lines = chronicleOf(game);

  useEffect(() => {
    if (!selected) setSendMode(false);
  }, [selected]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (locked || ended || !selected) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const step: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const delta = step[event.key];
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
  }, [locked, ended, selected, confirm]);

  function march(x: number, y: number, actor: Nation) {
    onPlay(
      { type: "march", id: actor.id, x, y },
      { title: `March ${directionName(x - actor.x, y - actor.y)}?`, detail: `${actor.name} spends 1 AP.` },
    );
  }

  function onCell(x: number, y: number, point: { clientX: number; clientY: number }) {
    if (ended) return;
    const occupant = game.nations.find((nation) => nation.x === x && nation.y === y) ?? null;
    if (sendMode && selected) {
      if (occupant?.alive && occupant.id !== selected.id && inReach(selected, occupant)) {
        onPlay(
          { type: "send", id: selected.id, targetId: occupant.id },
          {
            title: `Send 1 AP to ${occupant.name}?`,
            detail: `${selected.name} spends 1 AP.`,
            always: true,
            onDone: () => setSendMode(false),
          },
        );
      } else if (occupant?.alive) toast.error("They are outside your reach.");
      else toast.error("Choose a living nation.");
      return;
    }
    if (selected && occupant?.id === selected.id) {
      setSelectedId(null);
      setPinned(false);
      return;
    }
    if (selected && occupant?.alive) {
      if (inReach(selected, occupant)) {
        onPlay(
          { type: "strike", id: selected.id, targetId: occupant.id },
          { title: `Strike ${occupant.country}?`, detail: `${selected.name} spends 1 AP.` },
        );
      } else {
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
      setHover({ nation: occupant, x: point.clientX, y: point.clientY });
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onHome}>
          <span className="block truncate font-display text-2xl leading-none">Alliance</span>
          <span className="text-xs text-muted">
            {game.local ? "Local test · " : ""}Hour {game.hour}
            {game.size ? ` · ${game.size}×${game.size}` : ""}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={confirm}
          onClick={onToggleConfirm}
          className={confirm ? btn("solid") : btn()}
        >
          Confirm
        </button>
        <button
          type="button"
          className={`${btn()} w-11 px-0`}
          aria-label="Chronicle"
          aria-expanded={chronicleOpen}
          onClick={() => setChronicleOpen((open) => !open)}
        >
          <ScrollText className="size-4" />
        </button>
        <button
          type="button"
          className={`${btn()} w-11 px-0`}
          aria-label="Sound the next bell"
          disabled={Boolean(ended)}
          onClick={() =>
            onPlay(
              { type: "bell" },
              { title: "Sound the next bell?", detail: "Living nations gain 1 AP.", always: true },
            )
          }
        >
          <Bell className="size-4" />
        </button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full w-max min-w-full items-center justify-center p-2">
          <Board
            size={game.size}
            sea={game.seaCells ?? []}
            nations={game.nations}
            selectedId={selected?.id ?? null}
            sendMode={sendMode}
            reveal={false}
            onCell={onCell}
            onHover={(next) => {
              if (next) {
                setPinned(false);
                setHover(next);
              } else if (!pinned) setHover(null);
            }}
          />
        </div>
        {chronicleOpen && (
          <aside className="absolute inset-y-2 right-2 z-20 flex w-64 max-w-[80%] flex-col rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-medium">Chronicle</h2>
              <button type="button" className={`${btn("quiet")} h-9 w-9 px-0`} aria-label="Close chronicle" onClick={() => setChronicleOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-auto px-3 pb-3">
              {lines.length === 0 ? (
                <p className="text-sm text-muted">No nation has fallen.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lines.map((line, index) => (
                    <li key={`${index}-${line}`} className="text-sm">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>
      {selected && !ended && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
          <Flag iso={selected.iso} className="h-6 w-8 rounded-sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{selected.name}</div>
            <div className="text-xs text-muted">
              {selected.country} · {selected.ap} AP
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Compass
              onStep={(dx, dy) => march(selected.x + dx, selected.y + dy, selected)}
            />
            <button
              type="button"
              className={btn()}
              onClick={() =>
                onPlay(
                  { type: "extend", id: selected.id },
                  { title: "Extend reach?", detail: `${selected.name} spends 2 AP.` },
                )
              }
            >
              Reach
            </button>
            <button
              type="button"
              aria-pressed={sendMode}
              className={sendMode ? btn("solid") : btn()}
              onClick={() => setSendMode((value) => !value)}
            >
              Send
            </button>
            <button
              type="button"
              className={btn()}
              onClick={() =>
                onPlay(
                  { type: "abdicate", id: selected.id },
                  {
                    title: "Abdicate?",
                    detail: `${nationLabel(selected)} leaves the map.`,
                    always: true,
                    onDone: () => setSelectedId(null),
                  },
                )
              }
            >
              Abdicate
            </button>
            <button type="button" className={btn("quiet")} onClick={() => setSelectedId(null)}>
              Stand up
            </button>
          </div>
        </div>
      )}
      {hover && <HoverCard nation={hover.nation} x={hover.x} y={hover.y} reveal={false} />}
      {ended && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/75 px-4">
          <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 text-center" role="dialog" aria-labelledby="victory-title">
            {game.winnerId && (
              <Flag
                iso={game.nations.find((nation) => nation.id === game.winnerId)?.iso ?? "br"}
                className="mx-auto mb-3 h-12 w-16 rounded-sm"
              />
            )}
            <h2 id="victory-title" className="font-display text-3xl leading-tight">
              {ended}
            </h2>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className={btn("solid")} onClick={onAnalyse}>
                Analyse the record
              </button>
              <button type="button" className={btn()} onClick={onHome}>
                Leave the table
              </button>
              <button type="button" className={btn("quiet")} onClick={onDiscard}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Compass({ onStep }: { onStep: (dx: number, dy: number) => void }) {
  const pads = [
    { label: "March north", dx: 0, dy: -1, icon: ChevronUp },
    { label: "March west", dx: -1, dy: 0, icon: ChevronLeft },
    { label: "March south", dx: 0, dy: 1, icon: ChevronDown },
    { label: "March east", dx: 1, dy: 0, icon: ChevronRight },
  ];
  return (
    <div className="flex gap-1">
      {pads.map((pad) => (
        <button key={pad.label} type="button" className={`${btn()} w-11 px-0`} aria-label={pad.label} onClick={() => onStep(pad.dx, pad.dy)}>
          <pad.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function insideField(game: Game, x: number, y: number) {
  if (typeof game.size === "number") return x >= 0 && y >= 0 && x < game.size && y < game.size;
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
}

function openSquare(game: Game, x: number, y: number) {
  if (!insideField(game, x, y)) return false;
  if (typeof game.size === "number") return isWalkable(x, y, game.size, new Set(game.seaCells ?? []));
  return isLand(x, y);
}

function Board({
  nations,
  selectedId,
  sendMode,
  reveal,
  onCell,
  onHover,
  size,
  sea = [],
}: {
  nations: Nation[];
  selectedId: string | null;
  sendMode: boolean;
  reveal: boolean;
  onCell: (x: number, y: number, point: { clientX: number; clientY: number }) => void;
  onHover: (hover: Hover | null) => void;
  size?: number;
  sea?: readonly string[];
}) {
  const selected = nations.find((nation) => nation.id === selectedId && nation.alive) ?? null;
  const width = size ?? WIDTH;
  const height = size ?? HEIGHT;
  const tile = size == null ? 46 : 32;
  const seaSet = new Set(sea);
  const dense = tile <= 32 && width >= 18;
  return (
    <div
      className="grid overflow-hidden rounded-lg border border-line"
      style={{
        width: width * tile,
        height: height * tile,
        gridTemplateColumns: `repeat(${width}, ${tile}px)`,
        gridTemplateRows: `repeat(${height}, ${tile}px)`,
      }}
    >
      {Array.from({ length: height * width }, (_, index) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const occupant = nations.find((nation) => nation.x === x && nation.y === y) ?? null;
        const land = size == null ? isLand(x, y) : !seaSet.has(cellKey(x, y));
        const sphere =
          selected !== null &&
          land &&
          chebyshev(selected.x, selected.y, x, y) <= selected.reach;
        const beside =
          selected !== null && land && !occupant && isOrthogonalStep(selected.x, selected.y, x, y);
        const strike =
          selected !== null && !sendMode && occupant !== null && occupant.alive && inReach(selected, occupant);
        const send =
          sendMode && selected !== null && occupant !== null && occupant.alive && inReach(selected, occupant);
        const mine = occupant?.id === selectedId && occupant.alive;
        let tone = "bg-sea";
        if (land) tone = (x + y) % 2 === 0 ? "bg-land" : "bg-land-deep";
        if (sphere) tone = "bg-land-bright";
        if (beside) tone = "bg-land-bright ring-1 ring-brass/50 ring-inset";
        return (
          <button
            key={`${x}-${y}`}
            type="button"
            aria-label={
              occupant
                ? `${occupant.name}, ${occupant.country}${occupant.alive ? "" : ", fallen"}`
                : land
                  ? "Land"
                  : "Sea"
            }
            className={`relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden border border-line p-0 ${tone} ${
              mine || send ? "ring-2 ring-brass ring-inset" : ""
            } ${strike ? "ring-2 ring-blood ring-inset" : ""}`}
            onClick={(event) => onCell(x, y, event)}
            onPointerEnter={(event) => {
              if (occupant) onHover({ nation: occupant, x: event.clientX, y: event.clientY });
            }}
            onPointerMove={(event) => {
              if (occupant) onHover({ nation: occupant, x: event.clientX, y: event.clientY });
            }}
            onPointerLeave={() => onHover(null)}
          >
            {occupant && <Token nation={occupant} reveal={reveal} dense={dense} />}
          </button>
        );
      })}
    </div>
  );
}

function Token({ nation, reveal, dense }: { nation: Nation; reveal: boolean; dense?: boolean }) {
  if (!nation.alive) {
    return (
      <span className="flex flex-col items-center">
        <span className={`block rounded-t-lg rounded-b-sm bg-surface-2 ${dense ? "h-2 w-3" : "h-4 w-5"}`} />
        {reveal && !dense && <span className="mt-0.5 text-xs leading-none text-muted">0·{nation.ap}</span>}
      </span>
    );
  }
  return (
    <span className="relative flex max-h-full max-w-full flex-col items-center">
      <Flag iso={nation.iso} className={dense ? "h-3 w-4 max-h-full rounded-sm" : "h-6 w-8 rounded-sm"} />
      {reveal && !dense && (
        <span className="mt-0.5 rounded bg-bg px-1 text-xs leading-none text-fg">
          {nation.hp}·{nation.ap}
        </span>
      )}
    </span>
  );
}

function HoverCard({ nation, x, y, reveal }: Hover & { reveal: boolean }) {
  const left = typeof window === "undefined" ? x : Math.max(8, Math.min(x + 14, window.innerWidth - 188));
  const top = typeof window === "undefined" ? y : Math.max(8, Math.min(y + 14, window.innerHeight - 132));
  return (
    <div
      className="pointer-events-none fixed z-30 w-44 rounded-lg border border-line bg-surface p-2"
      style={{ left, top }}
    >
      <Flag iso={nation.iso} className="mb-2 h-8 w-12 rounded-sm" />
      <div className="text-sm font-medium leading-tight">{nation.name}</div>
      <div className="text-sm text-muted">{nation.country}</div>
      {reveal && (
        <div className="mt-1 text-sm">
          {nation.hp} health · {nation.ap} AP · reach {nation.reach}
        </div>
      )}
    </div>
  );
}

function Analyse({
  game,
  cursor,
  onCursor,
  onHome,
}: {
  game: Game;
  cursor: number;
  onCursor: (cursor: number) => void;
  onHome: () => void;
}) {
  const last = game.plies.length - 1;
  const safe = Math.max(0, Math.min(cursor, last));
  const ply = game.plies[safe]!;
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") onCursor(Math.max(0, safe - 1));
      if (event.key === "ArrowRight") onCursor(Math.min(last, safe + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onCursor, safe]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onHome}>
          <span className="block font-display text-2xl leading-none">Record</span>
          <span className="block truncate text-xs text-muted">{victoryLine(game) ?? game.title}</span>
        </button>
        <button type="button" className={btn()} onClick={() => downloadRecord(game)}>
          Download
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-max min-w-full justify-center p-2">
          <Board
            size={game.size}
            sea={game.seaCells ?? []}
            nations={ply.snapshot}
            selectedId={null}
            sendMode={false}
            reveal
            onCell={(x, y, point) => {
              const occupant = ply.snapshot.find((nation) => nation.x === x && nation.y === y);
              setHover(occupant ? { nation: occupant, x: point.clientX, y: point.clientY } : null);
            }}
            onHover={setHover}
          />
        </div>
        <p className="mx-auto mt-3 max-w-3xl px-2 text-xs text-muted">Health · AP on each flag. Hover for reach.</p>
      </div>
      <footer className="border-t border-line px-3 py-2">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-1">
            <button type="button" className={`${btn()} w-11 px-0`} aria-label="Opening" onClick={() => onCursor(0)}>
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              className={`${btn()} w-11 px-0`}
              aria-label="Previous action"
              onClick={() => onCursor(Math.max(0, safe - 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-14 text-center text-sm">
              {safe} / {last}
            </span>
            <button
              type="button"
              className={`${btn()} w-11 px-0`}
              aria-label="Next action"
              onClick={() => onCursor(Math.min(last, safe + 1))}
            >
              <ChevronRight className="size-4" />
            </button>
            <button type="button" className={`${btn()} w-11 px-0`} aria-label="Latest" onClick={() => onCursor(last)}>
              <ChevronsRight className="size-4" />
            </button>
            <label className="sr-only" htmlFor="ply">
              Action
            </label>
            <input
              id="ply"
              className="min-w-0 flex-1"
              type="range"
              min={0}
              max={last}
              value={safe}
              onChange={(event) => onCursor(Number(event.target.value))}
            />
          </div>
          <p className="text-sm">
            Hour {ply.hour}. {ply.text}
          </p>
        </div>
      </footer>
      {hover && <HoverCard nation={hover.nation} x={hover.x} y={hover.y} reveal />}
    </div>
  );
}

function Archive({
  games,
  onOpen,
  onHome,
  onImport,
}: {
  games: Game[];
  onOpen: (game: Game) => void;
  onHome: () => void;
  onImport: (game: Game) => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onHome}>
        Back
      </button>
      <h1 className="font-display text-4xl">Records</h1>
      <label className={`${btn()} mt-4`}>
        Open a record
        <input
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              const parsed: unknown = JSON.parse(await file.text());
              if (!isGame(parsed)) {
                toast.error("That record could not be read.");
                return;
              }
              onImport(parsed);
            } catch {
              toast.error("That record could not be read.");
            }
          }}
        />
      </label>
      {games.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Finished tables are kept here, ready to step through.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {games.map((game) => (
            <li key={game.id}>
              <button type="button" className="w-full rounded-lg border border-line bg-surface px-3 py-3 text-left" onClick={() => onOpen(game)}>
                <span className="block text-sm font-medium">{victoryLine(game)}</span>
                <span className="mt-1 block text-xs text-muted">
                  {game.title} · {Math.max(0, game.plies.length - 1)} actions
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Codex({ cloud, onHome }: { cloud: boolean | null; onHome: () => void }) {
  const rules = [
    "March to a neighboring land square for 1 AP. You cannot move onto a sea tile. Nations and gravestones also block the step.",
    "Toggle Seas lays water in clumps, the way nations are scattered, then grown together. Land stays one piece: peninsulas and narrow landways can appear, islands do not.",
    "Strike a nation inside your reach for 1 AP. The third blow eliminates them. Lives are never shown.",
    "Extend reach for 2 AP. Send 1 AP to a nation inside your reach. Abdicate to leave the map.",
    "Sound the bell to advance the hour. Living nations gain 1 AP.",
    "A room keeps its name, code, capacity, battlefield size, time zone, starting hour, and jury hour. The host can change them only while the room is waiting.",
    "A test table seats several nations on this device so the field can be tried without another player. You move each nation in turn.",
    "The chronicle names only the blow that ends a nation.",
    "When one nation remains, they rule the world. The record can be analysed with health, AP, and reach visible.",
    "Confirm asks before an action. Abdication, sending AP, and the bell always ask.",
  ];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <button type="button" className={`${btn("quiet")} self-start px-0`} onClick={onHome}>
        Back
      </button>
      <h1 className="font-display text-4xl">Codex</h1>
      <ul className="mt-4 flex flex-col gap-3">
        {rules.map((rule) => (
          <li key={rule} className="text-sm text-fg">
            {rule}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">
        {cloud
          ? "Shared tables are connected. Health and action points stay off the public board."
          : "Room settings stay on this device for now. When shared rooms connect, the same settings travel with the room, and dawn and the jury run even if nobody has the page open."}
      </p>
    </main>
  );
}

function ConfirmDialog({ pending, onCancel }: { pending: Pending | null; onCancel: () => void }) {
  return (
    <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <AlertDialog.Content
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-lg border border-line bg-surface p-4"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              pending?.run();
            }
          }}
        >
          <AlertDialog.Title className="font-display text-3xl leading-tight">{pending?.title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted">{pending?.detail}</AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel className={btn()}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action className={btn("solid")} onClick={() => pending?.run()}>
              Confirm
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function downloadRecord(game: Game) {
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const slug = game.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.download = `${slug || "alliance"}-record.json`;
  link.click();
  URL.revokeObjectURL(url);
}
