import { useEffect, useState } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
export function Worry({ close }: { close: () => void }) {
  const [text, setText] = useState(""),
    [stage, setStage] = useState<"write" | "release" | "done">("write");
  useEffect(() => {
    if (stage !== "release") return;
    const id = setTimeout(() => setStage("done"), 3800);
    return () => clearTimeout(id);
  }, [stage]);
  return (
    <div className="worry-content">
      <p className="eyebrow">마음에 작은 여백을</p>
      <h2>
        {stage === "done"
          ? "조금은 가벼워지셨나요?"
          : "잠시, 내려놓아도 괜찮아요."}
      </h2>
      <p className="muted">
        {stage === "done"
          ? "모든 답을 지금 찾지 않아도 괜찮아요."
          : "마음에 머무는 생각을 적고, 멀리 흘려보내세요."}
      </p>
      {stage === "write" ? (
        <>
          <label className="sr-only" htmlFor="worry">
            흘려보낼 고민
          </label>
          <textarea
            id="worry"
            value={text}
            maxLength={500}
            rows={7}
            placeholder="어떤 마음이 머물고 있나요?"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row between">
            <small>{text.length} / 500</small>
            <button onClick={() => setText("")} aria-label="입력 내용 삭제">
              <Trash2 size={16} />
              삭제
            </button>
          </div>
          <button
            className="primary wide"
            disabled={!text.trim()}
            onClick={() => {
              setText("");
              setStage("release");
            }}
          >
            흘려보내기
            <ArrowUpRight />
          </button>
        </>
      ) : stage === "release" ? (
        <div
          className="release"
          aria-label="빛이 수평선 너머로 흘러갑니다"
          role="status"
        >
          {Array.from({ length: 22 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  "--x": `${(i * 37) % 100}%`,
                  "--delay": `${i * 0.055}s`,
                  "--drift": `${(i % 2 ? 1 : -1) * (30 + i * 4)}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : (
        <div className="released">
          <span>✧</span>
          <p>지금 이 순간은, 온전히 당신의 것이에요.</p>
          <button onClick={() => setStage("write")}>다시 적기</button>
        </div>
      )}
      <button
        className="wide quiet"
        onClick={() => {
          setText("");
          close();
        }}
      >
        {stage === "write" ? "취소하고 돌아가기" : "돌아가기"}
      </button>
      <p className="fine">
        적으신 내용은 전송하거나 저장하지 않으며,
        <br />
        흘려보내거나 닫으면 바로 지워집니다.
      </p>
    </div>
  );
}
