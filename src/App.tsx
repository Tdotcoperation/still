import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Menu,
  Image as ImageIcon,
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Timer as TimerIcon,
  X,
  ChevronRight,
  Heart,
  Shuffle,
  Sun,
  Wind,
  Sparkles,
  SlidersHorizontal,
  Download,
  Upload,
  Trash2,
  Check,
  CloudOff,
  Headphones,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import scenes from "./scenes.json";
import { audio } from "./lib/audio";
import {
  blankTimer,
  clock,
  defaults,
  initial,
  persist,
  readSettings,
  readTimer,
  remaining,
  trackIds,
  trackNames,
  validateSettings,
  type Settings,
  type Timer,
} from "./lib/state";
import {
  clearMedia,
  removeMedia,
  saved,
  saveMedia,
  type Saved,
} from "./lib/offline";
import { Breath } from "./Breath";
import { Worry } from "./Worry";
import "./App.css";

type Panel =
  | "menu"
  | "sounds"
  | "breath"
  | "worry"
  | "timer"
  | "library"
  | "settings"
  | null;
const titles = {
  menu: "조용한 나만의 공간",
  sounds: "힐링 사운드",
  breath: "호흡 가이드",
  worry: "고민 흘려보내기",
  timer: "휴식 타이머",
  library: "어디에서 쉬어볼까요?",
  settings: "나에게 맞는 쉼",
};
const categories = [
  "전체",
  "바다",
  "자연",
  "고요한 공간",
  "밤의 꿈",
  "즐겨찾기",
];
const messages = [
  "잠시, 쉬어가도 괜찮아요.",
  "지금 이 순간만큼은 천천히.",
  "오늘도 수고 많으셨어요.",
  "아무것도 하지 않아도 괜찮아요.",
];
const file = (id: number, mobile: boolean, small = false) =>
  `/media/${String(id).padStart(2, "0")}-${mobile ? "mobile" : "desktop"}${small ? "-thumb" : ""}.webp`;
function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="range-label">
      <span>
        {label}
        <small>{max === 1 ? `${Math.round(value * 100)}%` : value}</small>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
function Dialog({
  panel,
  close,
  back,
  children,
  immersive,
  setImmersive,
}: {
  panel: Exclude<Panel, null>;
  close: () => void;
  back: () => void;
  children: ReactNode;
  immersive: boolean;
  setImmersive: (b: boolean) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className={`shade ${immersive ? "immersive" : ""}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        className={`panel glass panel-${panel}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
          if (e.key === "Tab") {
            const els = Array.from(
              ref.current!.querySelectorAll<HTMLElement>(
                "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
              ),
            ).filter((el) => el.offsetParent !== null);
            const first = els[0],
              last = els.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="panel-header">
          {panel !== "menu" && (
            <button
              className="icon"
              aria-label="메뉴로 돌아가기"
              onClick={back}
            >
              <ArrowLeft />
            </button>
          )}
          <h2 id="panel-title">{titles[panel]}</h2>
          {(panel === "breath" || panel === "worry") && (
            <button
              className="icon"
              aria-label={immersive ? "작은 창으로 보기" : "몰입 화면으로 보기"}
              onClick={() => setImmersive(!immersive)}
            >
              {immersive ? <Minimize /> : <Maximize />}
            </button>
          )}
          <button className="icon" aria-label="창 닫기" onClick={close}>
            <X />
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}
export default function App() {
  const [settings, setSettings] = useState<Settings>(readSettings),
    [panel, setPanel] = useState<Panel>(null),
    [immersive, setImmersive] = useState(false),
    [visible, setVisible] = useState(true),
    [onlyBackground, setOnlyBackground] = useState(false),
    [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [mobile, setMobile] = useState(
      matchMedia("(orientation: portrait)").matches,
    ),
    [systemReduced, setSystemReduced] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [message, setMessage] = useState(0),
    [category, setCategory] = useState("전체"),
    [timer, setTimer] = useState<Timer>(readTimer),
    [now, setNow] = useState(Date.now),
    [timerMinutes, setTimerMinutes] = useState(5),
    [presetName, setPresetName] = useState(""),
    [savedFiles, setSavedFiles] = useState<Saved[]>([]),
    [cacheBusy, setCacheBusy] = useState(false),
    [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null),
    [deleteConfirm, setDeleteConfirm] = useState(false);
  const [background, setBackground] = useState<{
      url: string;
      id: number;
    } | null>(null),
    [previousBg, setPreviousBg] = useState<string | null>(null);
  const displayedScene = useRef<number | null>(null);
  const loadSequence = useRef(0),
    activity = useRef(0),
    keyboardMode = useRef(false),
    storageWarned = useRef(false),
    timerDone = useRef(false),
    bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = settings.reduced || systemReduced;
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const inform = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!persist("still.settings.v1", settings) && !storageWarned.current) {
      storageWarned.current = true;
      inform("설정을 저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.");
    }
  }, [settings, inform]);
  useEffect(() => {
    persist("still.timer.v1", timer);
  }, [timer]);
  useEffect(() => {
    const missing = () =>
      inform("저장하지 않은 음원이에요. 연결 후 재생을 다시 시작해 주세요.");
    window.addEventListener("still-audio-missing", missing);
    return () => window.removeEventListener("still-audio-missing", missing);
  }, [inform]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const media = matchMedia("(orientation: portrait)"),
      rm = matchMedia("(prefers-reduced-motion: reduce)");
    const orient = () => setMobile(media.matches),
      motion = () => setSystemReduced(rm.matches);
    media.addEventListener("change", orient);
    rm.addEventListener("change", motion);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      media.removeEventListener("change", orient);
      rm.removeEventListener("change", motion);
    };
  }, []);
  useEffect(() => {
    const id = setInterval(
      () => setMessage((n) => (n + 1) % messages.length),
      18000,
    );
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const wake = () => {
      keyboardMode.current = false;
      activity.current = Date.now();
      setVisible(true);
    };
    const keyWake = () => {
      wake();
      keyboardMode.current = true;
      setOnlyBackground(false);
    };
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", keyWake);
    const id = setInterval(() => {
      const keyboardFocus =
        keyboardMode.current &&
        document.activeElement?.matches("button,input,select,textarea,a");
      if (
        settings.hide &&
        !panel &&
        !keyboardFocus &&
        Date.now() - activity.current > 5000
      )
        setVisible(false);
    }, 500);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", keyWake);
    };
  }, [settings.hide, panel]);
  useEffect(() => {
    const token = ++loadSequence.current;
    const url = file(settings.scene, mobile, settings.dataSaver);
    const img = new Image();
    img.src = url;
    img
      .decode()
      .then(() => {
        if (token !== loadSequence.current) return;
        displayedScene.current = settings.scene;
        setBackground((old) => {
          setPreviousBg(old?.url || null);
          return { url, id: settings.scene };
        });
        if (bgTimer.current) clearTimeout(bgTimer.current);
        bgTimer.current = setTimeout(() => setPreviousBg(null), 1800);
        if (!settings.dataSaver) {
          const next = new Image();
          next.src = file((settings.scene % 32) + 1, mobile);
        }
      })
      .catch(() => {
        if (token === loadSequence.current) {
          inform("풍경을 불러오지 못했어요. 이전 풍경을 유지합니다.");
          if (displayedScene.current !== null)
            setSettings((s) => ({ ...s, scene: displayedScene.current! }));
        }
      });
  }, [settings.scene, mobile, settings.dataSaver, inform]);
  useEffect(() => {
    if (!settings.auto) return;
    const id = setInterval(
      () => setSettings((s) => ({ ...s, scene: (s.scene % 32) + 1 })),
      settings.auto * 60000,
    );
    return () => clearInterval(id);
  }, [settings.auto, settings.scene]);
  useEffect(() => {
    audio.set(
      settings.levels.map((v, i) => (settings.muted[i] ? 0 : v)),
      settings.master,
    );
  }, [settings.levels, settings.muted, settings.master]);
  useEffect(() => {
    if (timer.status !== "running") return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    window.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("visibilitychange", tick);
    };
  }, [timer.status]);
  useEffect(() => {
    if (
      timer.status === "running" &&
      remaining(timer, now) === 0 &&
      !timerDone.current
    ) {
      timerDone.current = true;
      // A wall-clock deadline is an external event that must update persisted timer state.
      // oxlint-disable-next-line react/set-state-in-effect
      setTimer((t) => ({ ...t, status: "idle", remaining: 0, deadline: 0 }));
      if (timer.action === "stop") {
        audio.pause(settings.fade);
        // oxlint-disable-next-line react/set-state-in-effect
        setPlaying(false);
      }
      if (timer.action === "chime")
        void audio.chime().then((ok) => {
          if (!ok)
            inform(
              "휴식 시간이 끝났어요. 브라우저가 알림음을 제한해 화면으로 알려드려요.",
            );
        });
      inform("휴식 시간이 끝났어요. 충분히 쉬셨나요?");
    }
  }, [timer, now, settings.fade, inform]);
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          if (r.waiting) setUpdate(r);
          r.addEventListener("updatefound", () => {
            r.installing?.addEventListener("statechange", () => {
              if (r.waiting && navigator.serviceWorker.controller) setUpdate(r);
            });
          });
        })
        .catch(() =>
          inform(
            "오프라인 준비에 실패했어요. 온라인으로 계속 이용할 수 있어요.",
          ),
        );
    }
  }, [inform]);
  useEffect(() => {
    if (panel === "settings")
      void saved()
        .then(setSavedFiles)
        .catch(() => inform("이 브라우저에서 오프라인 저장소를 열 수 없어요."));
  }, [panel, inform]);
  const toggleAudio = useCallback(async () => {
    if (loading) return;
    if (playing) {
      audio.pause(settings.fade);
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const ok = await audio.play(
        settings.levels.map((v, i) => (settings.muted[i] ? 0 : v)),
        settings.master,
        settings.fade,
      );
      setPlaying(ok);
    } catch {
      inform(
        "믹스의 음원을 재생하지 못했어요. 오프라인에서는 저장한 음원만 켜 주세요. 온라인에서는 소리 권한과 연결을 확인해 주세요.",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, playing, settings, inform]);
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        inform(
          "이 브라우저는 전체 화면을 지원하지 않아요. 홈 화면에 추가하면 넓게 사용할 수 있어요.",
        );
    } catch {
      inform("전체 화면으로 전환할 수 없어요.");
    }
  }, [inform]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,select") ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (e.key === "Escape") {
        setPanel(null);
        setOnlyBackground(false);
      }
      if (panel) return;
      if (e.code === "Space") {
        e.preventDefault();
        void toggleAudio();
      }
      if (e.key.toLowerCase() === "m") setPanel("menu");
      if (e.key.toLowerCase() === "b") setPanel("library");
      if (e.key.toLowerCase() === "f") void fullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panel, toggleAudio, fullscreen]);
  const open = (p: Panel) => {
    setPanel(p);
    setImmersive(false);
    setVisible(true);
  };
  const choose = (id: number) => {
    change("scene", id);
    inform(
      settings.auto
        ? `선택한 풍경을 준비하고 있어요. ${settings.auto}분 자동 변경은 계속됩니다.`
        : "선택한 풍경을 준비하고 있어요. 자동 변경은 꺼져 있어요.",
    );
  };
  const recommended = () => {
    const h = new Date().getHours();
    choose(h >= 20 || h < 5 ? 25 : h < 9 ? 4 : h < 17 ? 14 : 2);
  };
  const save = async (url: string, name: string) => {
    setCacheBusy(true);
    try {
      await saveMedia(url, name);
      setSavedFiles(await saved());
      inform("오프라인에서도 사용할 수 있도록 저장했어요.");
    } catch (e) {
      inform(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setCacheBusy(false);
    }
  };
  const applyPreset = (id: string) => {
    const p = [...defaults, ...settings.presets].find((p) => p.id === id);
    if (p)
      setSettings((s) => ({
        ...s,
        levels: [...p.levels],
        muted: Array(6).fill(false),
      }));
  };
  const beginTimer = async () => {
    timerDone.current = false;
    setNow(Date.now());
    const ms =
      timer.status === "paused"
        ? timer.remaining
        : Math.max(1, Math.min(1440, timerMinutes)) * 60000;
    setTimer((t) => ({
      ...t,
      status: "running",
      duration: t.status === "paused" ? t.duration : ms,
      remaining: ms,
      deadline: Date.now() + ms,
    }));
    if (timer.action === "chime")
      try {
        await audio.unlock();
      } catch {
        inform("알림음이 제한될 수 있어요. 종료 시 화면 안내는 표시됩니다.");
      }
  };
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({ version: 1, settings }, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "still-settings.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importSettings = async (f?: File) => {
    if (!f) return;
    try {
      if (f.size > 100000) throw new Error("설정 파일이 너무 큽니다.");
      const data = JSON.parse(await f.text());
      if (data.version !== 1) throw new Error("지원하지 않는 설정 버전입니다.");
      setSettings(validateSettings(data.settings));
      inform("설정을 가져왔어요.");
    } catch (e) {
      inform(e instanceof Error ? e.message : "설정을 가져오지 못했어요.");
    }
  };
  const clearAll = async () => {
    audio.dispose();
    setPlaying(false);
    setTimer({ ...blankTimer });
    try {
      for (const key of ["still.settings.v1", "still.timer.v1"])
        localStorage.removeItem(key);
      await clearMedia();
      setSavedFiles([]);
      setSettings({ ...initial });
      setDeleteConfirm(false);
      inform("저장한 풍경, 음원, 프리셋과 설정을 삭제했어요.");
    } catch {
      inform(
        "일부 데이터를 지우지 못했어요. 브라우저 사이트 데이터 설정을 확인해 주세요.",
      );
    }
  };
  const currentScene = scenes.find(
    (s) => s.id === (background?.id || settings.scene),
  )!;
  return (
    <main
      className={`${reduced ? "reduced " : ""}${settings.contrast ? "contrast " : ""}${settings.transition ? "" : "no-transition"}`}
      onPointerDown={() => {
        if (onlyBackground) setOnlyBackground(false);
      }}
    >
      <div
        className={`landscape ${settings.motion && !reduced ? "drifting" : ""}`}
        style={{ filter: `brightness(${settings.brightness})` }}
      >
        {previousBg && (
          <img className="landscape-image" src={previousBg} alt="" />
        )}
        {background && (
          <img
            key={background.url}
            className="landscape-image incoming"
            src={background.url}
            alt={currentScene.name}
          />
        )}
      </div>
      <div className="vignette" />
      {!background && (
        <div className="loading-background" role="status">
          {online
            ? "조용한 풍경을 불러오고 있어요."
            : "저장된 풍경이 없어요. 인터넷 연결 후 풍경을 저장해 주세요."}
          <button onClick={() => open("library")}>배경 선택</button>
        </div>
      )}
      <div
        className={`controls ${(!visible && settings.hide) || onlyBackground ? "hidden-controls" : ""}`}
        inert={Boolean(panel) || (!visible && settings.hide) || onlyBackground}
      >
        <header>
          <a className="brand" href="/" aria-label="STILL 처음으로">
            STILL<span>잠시, 머무는 곳</span>
          </a>
          <nav aria-label="화면 메뉴">
            <button
              className="glass nav-background"
              onClick={() => open("library")}
            >
              <ImageIcon size={17} />
              <span>배경</span>
            </button>
            <button
              className="glass icon"
              aria-label="전체 화면"
              onClick={() => void fullscreen()}
            >
              <Maximize size={18} />
            </button>
            <button
              className="glass icon"
              aria-label="메뉴 열기"
              onClick={() => open("menu")}
            >
              <Menu size={21} />
            </button>
          </nav>
        </header>
        <div className="hero-copy">
          <div className="tiny-line" />
          <p className="eyebrow">오롯이, 나를 위한 시간</p>
          <h1 key={message}>{messages[message]}</h1>
          <p>어디에도 서두르지 않아도 되는 시간</p>
        </div>
        <footer>
          <div className="scene-caption">
            <span className="scene-dot" />
            {currentScene.name}
            <small>{String(currentScene.id).padStart(2, "0")} / 32</small>
          </div>
          <div className="dock glass">
            <button
              className="play-button"
              aria-label={playing ? "사운드 일시정지" : "사운드 재생"}
              onClick={() => void toggleAudio()}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="spin" />
              ) : playing ? (
                <Pause fill="currentColor" />
              ) : (
                <Play fill="currentColor" />
              )}
            </button>
            <button className="playing-info" onClick={() => open("sounds")}>
              <span>
                {loading
                  ? "소리를 준비하고 있어요"
                  : playing
                    ? "나만의 소리가 흐르는 중"
                    : "고요함에 소리를 더해보세요"}
              </span>
              <small>
                {playing ? "여섯 가지 소리, 하나의 쉼" : "힐링 사운드"}
              </small>
            </button>
            <div className="dock-divider" />
            <Volume2 size={17} className="dock-volume-icon" />
            <input
              className="master-slider"
              type="range"
              aria-label="전체 볼륨"
              min="0"
              max="1"
              step=".01"
              value={settings.master}
              onChange={(e) => change("master", Number(e.target.value))}
            />
            <div className="dock-divider" />
            <button
              className="timer-button"
              onClick={() => open("timer")}
              aria-label="휴식 타이머"
            >
              <TimerIcon size={19} />
              <span>
                {timer.status === "idle"
                  ? "타이머"
                  : clock(remaining(timer, now))}
              </span>
            </button>
          </div>
          <p className="footer-note">아무것도 하지 않아도 괜찮아요.</p>
        </footer>
      </div>
      {onlyBackground && (
        <button
          className="restore glass"
          onClick={() => setOnlyBackground(false)}
        >
          컨트롤 보기
        </button>
      )}
      {!online && (
        <div className="offline-badge glass" role="status">
          <CloudOff size={14} />
          오프라인 · 저장한 콘텐츠를 이용하세요
        </div>
      )}
      {notice && (
        <div className="toast glass" role="status">
          {notice}
          <button
            className="icon"
            aria-label="안내 닫기"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {update && (
        <div className="update glass">
          새 버전이 준비됐어요.
          <button
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
              update.waiting?.postMessage("SKIP_WAITING");
            }}
          >
            업데이트
          </button>
          <button onClick={() => setUpdate(null)}>나중에</button>
        </div>
      )}
      {panel && (
        <Dialog
          panel={panel}
          close={() => open(null)}
          back={() => open("menu")}
          immersive={immersive}
          setImmersive={setImmersive}
        >
          {panel === "menu" && (
            <>
              <p className="muted intro">지금, 어떤 쉼이 필요하신가요?</p>
              <div className="menu-list">
                {(
                  [
                    [
                      "sounds",
                      Headphones,
                      "힐링 사운드",
                      "마음에 맞는 소리를 섞어보세요",
                    ],
                    ["breath", Wind, "호흡 가이드", "천천히, 나의 속도로"],
                    [
                      "worry",
                      Sparkles,
                      "고민 흘려보내기",
                      "무거운 마음을 잠시 내려놓으세요",
                    ],
                    ["timer", TimerIcon, "휴식 타이머", "온전히 쉬어가는 시간"],
                    [
                      "library",
                      ImageIcon,
                      "배경 라이브러리",
                      "32개의 조용한 풍경",
                    ],
                    [
                      "settings",
                      SlidersHorizontal,
                      "설정",
                      "나에게 맞는 편안함",
                    ],
                  ] as const
                ).map(([key, Icon, title, sub]) => (
                  <button key={key} onClick={() => open(key)}>
                    <span className="menu-icon">
                      <Icon />
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <small>{sub}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
              <div className="menu-signature">
                STILL <span>잠시, 아무것도 하지 않아도 괜찮아.</span>
              </div>
            </>
          )}
          {panel === "library" && (
            <>
              <p className="muted">마음이 머무는 풍경을 골라보세요.</p>
              <div className="chips" role="group" aria-label="배경 분류">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={category === c ? "selected" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="row">
                <button
                  onClick={() =>
                    choose(
                      ((settings.scene + Math.floor(Math.random() * 31)) % 32) +
                        1,
                    )
                  }
                >
                  <Shuffle size={16} />
                  무작위
                </button>
                <button onClick={recommended}>
                  <Sun size={16} />
                  지금 추천
                </button>
                <button
                  onClick={() => {
                    open(null);
                    setOnlyBackground(true);
                  }}
                >
                  배경만 보기
                </button>
              </div>
              <label>
                자동 변경
                <select
                  value={settings.auto}
                  onChange={(e) => change("auto", Number(e.target.value))}
                >
                  {[0, 5, 10, 30, 60].map((n) => (
                    <option key={n} value={n}>
                      {n ? `${n}분마다` : "사용하지 않음"}
                    </option>
                  ))}
                </select>
              </label>
              <Range
                label="배경 밝기"
                value={settings.brightness}
                min={0.2}
                onChange={(n) => change("brightness", n)}
              />
              <div className="scene-grid">
                {scenes
                  .filter(
                    (s) =>
                      category === "전체" ||
                      (category === "즐겨찾기" &&
                        settings.favorites.includes(s.id)) ||
                      categories[s.category + 1] === category,
                  )
                  .map((s) => (
                    <article
                      key={s.id}
                      className={`scene-card ${settings.scene === s.id ? "chosen" : ""}`}
                    >
                      <button
                        className="scene-select"
                        onClick={() => choose(s.id)}
                        aria-pressed={settings.scene === s.id}
                      >
                        <img
                          loading="lazy"
                          src={file(s.id, false, true)}
                          alt=""
                        />
                        <span>
                          {s.name}
                          {settings.scene === s.id && <Check size={14} />}
                        </span>
                      </button>
                      <button
                        className="favorite"
                        aria-label={`${s.name} 즐겨찾기`}
                        aria-pressed={settings.favorites.includes(s.id)}
                        onClick={() =>
                          change(
                            "favorites",
                            settings.favorites.includes(s.id)
                              ? settings.favorites.filter((id) => id !== s.id)
                              : [...settings.favorites, s.id],
                          )
                        }
                      >
                        <Heart
                          size={15}
                          fill={
                            settings.favorites.includes(s.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </article>
                  ))}
              </div>
              {category === "즐겨찾기" && !settings.favorites.length && (
                <p className="muted">마음에 드는 풍경의 하트를 눌러 주세요.</p>
              )}
              <button
                className="wide"
                disabled={cacheBusy || !background}
                onClick={() =>
                  background && void save(background.url, currentScene.name)
                }
              >
                <Download size={16} />
                현재 풍경 오프라인 저장
              </button>
            </>
          )}
          {panel === "sounds" && (
            <>
              <p className="muted">소리를 겹쳐, 나만의 풍경을 만들어보세요.</p>
              <div className="chips">
                {defaults.map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="tracks">
                {trackNames.map((name, i) => (
                  <div className="track" key={name}>
                    <button
                      className="icon"
                      aria-label={`${name} ${settings.muted[i] ? "음소거 해제" : "음소거"}`}
                      aria-pressed={settings.muted[i]}
                      onClick={() =>
                        change(
                          "muted",
                          settings.muted.map((v, j) => (j === i ? !v : v)),
                        )
                      }
                    >
                      {settings.muted[i] ? <VolumeX /> : <Volume2 />}
                    </button>
                    <Range
                      label={name}
                      value={settings.levels[i]}
                      onChange={(n) =>
                        change(
                          "levels",
                          settings.levels.map((v, j) => (i === j ? n : v)),
                        )
                      }
                    />
                    <button
                      className="icon"
                      disabled={cacheBusy}
                      aria-label={`${name} 오프라인 저장`}
                      onClick={() =>
                        void save(`/audio/${trackIds[i]}.mp3`, name)
                      }
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <Range
                label="마스터 볼륨"
                value={settings.master}
                onChange={(n) => change("master", n)}
              />
              <button
                className="primary wide"
                disabled={loading}
                onClick={() => void toggleAudio()}
              >
                {playing ? <Pause /> : <Play />}
                {loading ? "준비 중…" : playing ? "일시정지" : "소리 재생"}
              </button>
              <h3>나의 프리셋</h3>
              <label>
                프리셋 이름
                <input
                  value={presetName}
                  maxLength={40}
                  placeholder="예: 나의 조용한 저녁"
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </label>
              <button
                disabled={!presetName.trim() || settings.presets.length >= 30}
                onClick={() => {
                  change("presets", [
                    ...settings.presets,
                    {
                      id: crypto.randomUUID(),
                      name: presetName.trim(),
                      levels: [...settings.levels],
                    },
                  ]);
                  setPresetName("");
                }}
              >
                현재 믹스 저장
              </button>
              {settings.presets.map((p) => (
                <div className="preset-row" key={p.id}>
                  <button onClick={() => applyPreset(p.id)}>{p.name}</button>
                  <button
                    aria-label={`${p.name} 현재 믹스로 수정`}
                    onClick={() => {
                      change(
                        "presets",
                        settings.presets.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                levels: [...settings.levels],
                                name: presetName.trim() || x.name,
                              }
                            : x,
                        ),
                      );
                      inform("현재 볼륨으로 프리셋을 수정했어요.");
                    }}
                  >
                    수정
                  </button>
                  <button
                    className="icon"
                    aria-label={`${p.name} 삭제`}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        presets: s.presets.filter((x) => x.id !== p.id),
                        defaultPreset:
                          s.defaultPreset === p.id ? "ocean" : s.defaultPreset,
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <p className="fine">
                STILL 오리지널 합성 사운드 · CC0
                <br />
                현장 녹음이 아닌, 휴식을 위해 만든 소리예요.
              </p>
            </>
          )}
          {panel === "breath" && (
            <Breath
              reduced={reduced}
              vibrate={settings.vibrate}
              close={() => open(null)}
            />
          )}
          {panel === "worry" && <Worry close={() => open(null)} />}
          {panel === "timer" && (
            <>
              <p className="muted">시간은 잠시 맡겨두세요.</p>
              <div className="timer-ring">
                <span>
                  {clock(
                    timer.status === "idle"
                      ? timerMinutes * 60000
                      : remaining(timer, now),
                  )}
                </span>
                <small>
                  {timer.status === "running"
                    ? "천천히 쉬고 있어요"
                    : timer.status === "paused"
                      ? "잠시 멈췄어요"
                      : "나를 위한 시간"}
                </small>
              </div>
              <fieldset disabled={timer.status !== "idle"}>
                <div className="chips">
                  {[5, 10, 15, 30].map((n) => (
                    <button
                      key={n}
                      className={timerMinutes === n ? "selected" : ""}
                      onClick={() => setTimerMinutes(n)}
                    >
                      {n}분
                    </button>
                  ))}
                </div>
                <label>
                  직접 설정 (분)
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={timerMinutes}
                    onChange={(e) =>
                      setTimerMinutes(
                        Math.max(1, Math.min(1440, Number(e.target.value))),
                      )
                    }
                  />
                </label>
                <label>
                  시간이 끝나면
                  <select
                    value={timer.action}
                    onChange={(e) =>
                      setTimer((t) => ({
                        ...t,
                        action: e.target.value as Timer["action"],
                      }))
                    }
                  >
                    <option value="stop">
                      소리를 천천히 줄이고 종료해 주세요
                    </option>
                    <option value="continue">소리를 계속 재생해 주세요</option>
                    <option value="chime">작은 알림음을 들려주세요</option>
                  </select>
                </label>
              </fieldset>
              <div className="row actions">
                <button
                  className="primary"
                  onClick={() => {
                    if (timer.status === "running")
                      setTimer((t) => ({
                        ...t,
                        status: "paused",
                        remaining: remaining(t),
                        deadline: 0,
                      }));
                    else void beginTimer();
                  }}
                >
                  {timer.status === "running" ? <Pause /> : <Play />}
                  {timer.status === "running"
                    ? "일시정지"
                    : timer.status === "paused"
                      ? "재개"
                      : "시작"}
                </button>
                <button
                  onClick={() => {
                    timerDone.current = false;
                    setTimer((t) => ({
                      ...t,
                      status: "idle",
                      remaining: t.duration,
                      deadline: 0,
                    }));
                  }}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    setTimer({ ...blankTimer });
                    setTimerMinutes(5);
                    timerDone.current = false;
                  }}
                >
                  초기화
                </button>
              </div>
              <p className="fine">
                브라우저를 다시 열어도 남은 시간을 이어갑니다.
                <br />
                앱이 완전히 닫히면 종료 동작은 다시 열었을 때 적용됩니다.
              </p>
            </>
          )}
          {panel === "settings" && (
            <>
              <h3>화면</h3>
              <Toggle
                label="배경의 부드러운 움직임"
                value={settings.motion}
                onChange={(v) => change("motion", v)}
              />
              <Toggle
                label="컨트롤 자동 숨김"
                value={settings.hide}
                onChange={(v) => change("hide", v)}
              />
              <Toggle
                label="부드러운 풍경 전환"
                value={settings.transition}
                onChange={(v) => change("transition", v)}
              />
              <Toggle
                label="데이터 절약 (저해상도 풍경)"
                value={settings.dataSaver}
                onChange={(v) => change("dataSaver", v)}
              />
              <Range
                label="배경 밝기"
                value={settings.brightness}
                min={0.2}
                onChange={(n) => change("brightness", n)}
              />
              <h3>사운드</h3>
              <label>
                기본 프리셋
                <select
                  value={settings.defaultPreset}
                  onChange={(e) => {
                    change("defaultPreset", e.target.value);
                    applyPreset(e.target.value);
                  }}
                >
                  {[...defaults, ...settings.presets].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Range
                label="마스터 볼륨"
                value={settings.master}
                onChange={(n) => change("master", n)}
              />
              <Range
                label="페이드 시간 (초)"
                value={settings.fade}
                min={0}
                max={10}
                step={0.5}
                onChange={(n) => change("fade", n)}
              />
              <h3>접근성</h3>
              <Toggle
                label="움직임 줄이기"
                value={settings.reduced}
                onChange={(v) => change("reduced", v)}
              />
              <Toggle
                label="고대비 패널"
                value={settings.contrast}
                onChange={(v) => change("contrast", v)}
              />
              <Toggle
                label="호흡 단계 진동 (지원 기기)"
                value={settings.vibrate}
                onChange={(v) => change("vibrate", v)}
              />
              <p className="fine">
                시스템의 동작 줄이기 설정도 적용합니다.
                <br />
                단축키: Space 재생 · M 메뉴 · B 배경 · F 전체 화면 · Esc 닫기
              </p>
              <h3>데이터와 오프라인</h3>
              <div className="row">
                <button onClick={exportSettings}>
                  <Download size={16} />
                  설정 내보내기
                </button>
                <label className="file-button">
                  <Upload size={16} />
                  설정 가져오기
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      void importSettings(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="fine">
                저장된 미디어{" "}
                {(
                  savedFiles.reduce((n, s) => n + s.bytes, 0) /
                  1024 /
                  1024
                ).toFixed(1)}{" "}
                / 100 MB
                <br />
                풍경과 음원 옆의 저장 버튼으로 필요한 파일만 보관하세요.
              </p>
              {savedFiles.map((f) => (
                <div className="preset-row" key={f.url}>
                  <span>
                    {f.name}
                    <small>{(f.bytes / 1024 / 1024).toFixed(1)} MB</small>
                  </span>
                  <button
                    aria-label={`${f.name} 오프라인 파일 삭제`}
                    onClick={() =>
                      void removeMedia(f.url)
                        .then(() => saved())
                        .then(setSavedFiles)
                        .catch(() => inform("파일을 삭제하지 못했어요."))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {deleteConfirm ? (
                <div className="confirm">
                  <p>설정, 프리셋과 저장한 미디어를 모두 지울까요?</p>
                  <div className="row">
                    <button className="danger" onClick={() => void clearAll()}>
                      모두 삭제
                    </button>
                    <button onClick={() => setDeleteConfirm(false)}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="danger wide"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                  모든 로컬 데이터 삭제
                </button>
              )}
              <p className="fine">
                STILL v1.0 · 회원가입 없이, 조용하게.
                <br />
                고민 내용은 저장하거나 전송하지 않습니다.
              </p>
            </>
          )}
        </Dialog>
      )}
    </main>
  );
}
