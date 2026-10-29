import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { breathPhase, clock } from "./lib/state";
export function Breath({
  reduced,
  vibrate,
  close,
}: {
  reduced: boolean;
  vibrate: boolean;
  close: () => void;
}) {
  const [steps, setSteps] = useState([4, 0, 6]),
    [minutes, setMinutes] = useState(3),
    [mode, setMode] = useState("easy"),
    [status, setStatus] = useState<"idle" | "running" | "paused">("idle"),
    [elapsed, setElapsed] = useState(0);
  const origin = useRef(0),
    saved = useRef(0),
    phaseRef = useRef(-1);
  useEffect(() => {
    if (status !== "running") return;
    const tick = () => {
      const e = Date.now() - origin.current;
      if (e >= minutes * 60000) {
        setElapsed(minutes * 60000);
        setStatus("idle");
        saved.current = 0;
        return;
      }
      setElapsed(e);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [status, minutes]);
  const phase = breathPhase(elapsed, steps);
  useEffect(() => {
    if (status === "running" && phaseRef.current !== phase.index) {
      phaseRef.current = phase.index;
      if (vibrate) navigator.vibrate?.(40);
    }
  }, [phase.index, status, vibrate]);
  const start = () => {
    if (status === "idle") saved.current = 0;
    origin.current = Date.now() - saved.current;
    setStatus("running");
  };
  const pause = () => {
    saved.current = Date.now() - origin.current;
    setElapsed(saved.current);
    setStatus("paused");
  };
  return (
    <div className="breath-content">
      <p className="eyebrow">나에게 돌아오는 시간</p>
      <h2>천천히, 숨을 쉬어보세요.</h2>
      <p className="muted">잘하려고 애쓰지 않아도 괜찮아요.</p>
      <div className={`orb-wrap ${reduced ? "still-orb" : ""}`}>
        <div
          className="orb"
          style={{
            transform:
              status === "running" && phase.index === 0
                ? "scale(1.17)"
                : "scale(.85)",
            transitionDuration: `${phase.index === 0 ? steps[0] : steps[2]}s`,
          }}
        />
        <div className="orb-label" aria-live="polite">
          <strong>
            {status === "idle"
              ? "편안하게"
              : status === "paused"
                ? "잠시 쉬어요"
                : ["들이마셔요", "쉬어가요", "내쉬어요"][phase.index]}
          </strong>
          <span>{status === "running" ? `${phase.left}초` : ""}</span>
        </div>
      </div>
      <p className="time-display">
        {clock(Math.max(0, minutes * 60000 - elapsed))}
      </p>
      <fieldset disabled={status !== "idle"}>
        <label>
          호흡 방식
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              if (e.target.value === "easy") setSteps([4, 0, 6]);
              if (e.target.value === "slow") setSteps([4, 2, 6]);
            }}
          >
            <option value="easy">편안한 호흡 · 4초 / 6초</option>
            <option value="slow">천천히 호흡 · 4초 / 2초 / 6초</option>
            <option value="custom">직접 설정</option>
          </select>
        </label>
        {mode === "custom" && (
          <div className="row">
            {["들숨", "쉬기", "날숨"].map((s, i) => (
              <label key={s}>
                {s} (초)
                <input
                  type="number"
                  min={i === 1 ? 0 : 1}
                  max={20}
                  value={steps[i]}
                  onChange={(e) =>
                    setSteps(
                      steps.map((v, j) =>
                        j === i
                          ? Math.max(
                              i === 1 ? 0 : 1,
                              Math.min(20, Number(e.target.value)),
                            )
                          : v,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
        <label>
          진행 시간
          <select
            value={[1, 3, 5].includes(minutes) ? minutes : "custom"}
            onChange={(e) =>
              setMinutes(
                e.target.value === "custom" ? 2 : Number(e.target.value),
              )
            }
          >
            <option value="1">1분</option>
            <option value="3">3분</option>
            <option value="5">5분</option>
            <option value="custom">직접 설정</option>
          </select>
        </label>
        {![1, 3, 5].includes(minutes) && (
          <label>
            시간 (분)
            <input
              type="number"
              min="1"
              max="60"
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(1, Math.min(60, Number(e.target.value))))
              }
            />
          </label>
        )}
      </fieldset>
      <div className="row actions">
        <button
          className="primary"
          onClick={status === "running" ? pause : start}
        >
          {status === "running" ? <Pause /> : <Play />}
          {status === "running"
            ? "일시정지"
            : status === "paused"
              ? "재개"
              : "시작"}
        </button>
        <button onClick={close}>
          <Square />
          종료
        </button>
      </div>
      <p className="fine">호흡이 불편하거나 어지러우면 언제든 중단해 주세요.</p>
    </div>
  );
}
