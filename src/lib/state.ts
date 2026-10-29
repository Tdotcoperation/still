export const trackNames = [
  "파도",
  "빗소리",
  "바람",
  "모닥불",
  "피아노",
  "밤의 자연음",
];
export const trackIds = ["ocean", "rain", "wind", "fire", "piano", "night"];
export type Preset = { id: string; name: string; levels: number[] };
export const defaults: Preset[] = [
  { id: "ocean", name: "꿈속의 바다", levels: [0.7, 0, 0.2, 0, 0.18, 0] },
  { id: "rain", name: "비 오는 오후", levels: [0, 0.65, 0.1, 0, 0.25, 0] },
  { id: "dawn", name: "고요한 새벽", levels: [0.2, 0, 0.15, 0, 0.2, 0.4] },
  { id: "warm", name: "따뜻한 밤", levels: [0, 0, 0.1, 0.7, 0.2, 0.15] },
  { id: "deep", name: "깊은 휴식", levels: [0.25, 0.2, 0.15, 0, 0.25, 0.1] },
];
export type Settings = {
  scene: number;
  favorites: number[];
  auto: number;
  brightness: number;
  master: number;
  fade: number;
  levels: number[];
  muted: boolean[];
  presets: Preset[];
  defaultPreset: string;
  hide: boolean;
  motion: boolean;
  transition: boolean;
  reduced: boolean;
  contrast: boolean;
  dataSaver: boolean;
  vibrate: boolean;
};
export const initial: Settings = {
  scene: 1,
  favorites: [],
  auto: 0,
  brightness: 0.85,
  master: 0.6,
  fade: 2,
  levels: [...defaults[0].levels],
  muted: Array(6).fill(false),
  presets: [],
  defaultPreset: "ocean",
  hide: true,
  motion: true,
  transition: true,
  reduced: false,
  contrast: false,
  dataSaver: false,
  vibrate: false,
};
const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.max(min, Math.min(max, n))
    : fallback;
export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("설정 파일 형식이 올바르지 않습니다.");
  const v = value as Record<string, unknown>,
    s = {
      ...initial,
      levels: [...initial.levels],
      favorites: [],
      presets: [],
    } as Settings;
  for (const key of [
    "hide",
    "motion",
    "transition",
    "reduced",
    "contrast",
    "dataSaver",
    "vibrate",
  ] as const)
    if (typeof v[key] === "boolean") s[key] = v[key];
  s.scene = Math.round(clamp(v.scene, 1, 32, 1));
  s.brightness = clamp(v.brightness, 0.2, 1, 0.85);
  s.master = clamp(v.master, 0, 1, 0.6);
  s.fade = clamp(v.fade, 0, 10, 2);
  s.auto = [0, 5, 10, 30, 60].includes(Number(v.auto)) ? Number(v.auto) : 0;
  if (Array.isArray(v.favorites))
    s.favorites = [
      ...new Set(
        v.favorites.filter(
          (x): x is number => Number.isInteger(x) && x >= 1 && x <= 32,
        ),
      ),
    ];
  if (Array.isArray(v.levels) && v.levels.length === 6)
    s.levels = v.levels.map((x) => clamp(x, 0, 1, 0));
  if (Array.isArray(v.muted) && v.muted.length === 6)
    s.muted = v.muted.map((x) => x === true);
  if (Array.isArray(v.presets))
    s.presets = v.presets
      .slice(0, 30)
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.levels) &&
          p.levels.length === 6,
      )
      .map((p) => ({
        id: p.id.slice(0, 80),
        name: p.name.trim().slice(0, 40),
        levels: p.levels.map((x: unknown) => clamp(x, 0, 1, 0)),
      }));
  if (
    typeof v.defaultPreset === "string" &&
    [...defaults, ...s.presets].some((p) => p.id === v.defaultPreset)
  )
    s.defaultPreset = v.defaultPreset;
  return s;
}
export function readSettings() {
  try {
    return validateSettings(
      JSON.parse(localStorage.getItem("still.settings.v1") || "{}"),
    );
  } catch {
    return { ...initial };
  }
}
export function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export type Timer = {
  status: "idle" | "running" | "paused";
  duration: number;
  remaining: number;
  deadline: number;
  action: "stop" | "continue" | "chime";
};
export const blankTimer: Timer = {
  status: "idle",
  duration: 300000,
  remaining: 300000,
  deadline: 0,
  action: "stop",
};
export function remaining(t: Timer, now = Date.now()) {
  return t.status === "running" ? Math.max(0, t.deadline - now) : t.remaining;
}
export function readTimer(): Timer {
  try {
    const t = JSON.parse(localStorage.getItem("still.timer.v1") || "null");
    if (
      t &&
      ["idle", "running", "paused"].includes(t.status) &&
      ["stop", "continue", "chime"].includes(t.action) &&
      [t.duration, t.remaining, t.deadline].every(
        (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0,
      ) &&
      t.duration <= 86400000
    )
      return t;
  } catch {
    /* unavailable storage */
  }
  return { ...blankTimer };
}
export function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function breathPhase(elapsed: number, steps: number[]) {
  const total = steps.reduce((a, b) => a + b, 0);
  let point = (elapsed / 1000) % total;
  for (let i = 0; i < steps.length; i++) {
    if (point < steps[i])
      return { index: i, left: Math.ceil(steps[i] - point) };
    point -= steps[i];
  }
  return { index: 0, left: steps[0] };
}
