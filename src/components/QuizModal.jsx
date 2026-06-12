import { useState, useEffect, useRef } from "react";
import { generateQuestion } from "../lib/quiz";
import { useI18n } from "../lib/i18n";
import { playQuizCorrect, playQuizWrong } from "../lib/sounds";

function ClockFace({ hour }) {
  const a = (((hour % 12) * 30 - 90) * Math.PI) / 180;
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const ang = (((i + 1) * 30 - 90) * Math.PI) / 180;
    return { n: i + 1, x: 50 + 38 * Math.cos(ang), y: 50 + 38 * Math.sin(ang) };
  });
  return (
    <svg
      width={140}
      height={140}
      viewBox="0 0 100 100"
      style={{ marginBottom: 8 }}
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="#fffbe9"
        stroke="#ff6b35"
        strokeWidth="3"
      />
      {numbers.map(({ n, x, y }) => (
        <text
          key={n}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontWeight="bold"
          fill="#333"
        >
          {n}
        </text>
      ))}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="20"
        stroke="#888"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2={50 + 20 * Math.cos(a)}
        y2={50 + 20 * Math.sin(a)}
        stroke="#222"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="2.5" fill="#222" />
    </svg>
  );
}

const FRAC_KEYS = {
  half: "fracHalf",
  third: "fracThird",
  quarter: "fracQuarter",
};

function QuestionDisplay({ q, t }) {
  // Symbolic questions render LTR even in Hebrew; sentences follow the language.
  const symbolic = (text, full) => (
    <div
      style={{
        ...styles.question,
        direction: "ltr",
        ...(text.length > 8 ? { fontSize: 36, letterSpacing: 2 } : {}),
      }}
    >
      {full ? text : `${text} = ?`}
    </div>
  );
  switch (q.kind) {
    case "missing":
    case "pattern":
      return symbolic(q.text, true);
    case "count":
      return (
        <>
          <div style={styles.emojis}>{q.emojis}</div>
          <div style={styles.sentence} dir={t.dir}>
            {t.quizHowMany}
          </div>
        </>
      );
    case "halfDouble":
      return (
        <div style={styles.sentence} dir={t.dir}>
          {q.mode === "half"
            ? t.quizFraction(t.fracHalf, q.n)
            : t.quizDouble(q.n)}
        </div>
      );
    case "fraction":
      return (
        <div style={styles.sentence} dir={t.dir}>
          {t.quizFraction(t[FRAC_KEYS[q.frac]], q.n)}
        </div>
      );
    case "money":
      return (
        <div style={styles.story} dir={t.dir}>
          {q.mode === "left"
            ? t.quizMoneyLeft(q.x, q.y)
            : t.quizMoneyTotal(q.x, q.y)}
        </div>
      );
    case "clock":
      return (
        <>
          <ClockFace hour={q.hour} />
          <div style={styles.sentence} dir={t.dir}>
            {t.quizClock}
          </div>
        </>
      );
    default:
      return symbolic(q.text);
  }
}

export default function QuizModal({
  enabledOps,
  onSuccess,
  onCancel,
  prompt: promptText,
}) {
  const { t } = useI18n();
  const [question] = useState(() => generateQuestion(enabledOps));
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Expose the answer for automated tests (scripts/screenshot/) — only when
  // the page is loaded with a #debug or #test hash
  useEffect(() => {
    if (!/debug|test/.test(window.location.hash)) return;
    window.__quizAnswer = question.answer;
    return () => {
      delete window.__quizAnswer;
    };
  }, [question]);

  useEffect(() => {
    if (!onCancel) return;
    const onKey = (e) => {
      if (e.code === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function submit() {
    if (parseInt(input, 10) === question.answer) {
      playQuizCorrect();
      onSuccess();
    } else {
      playQuizWrong();
      setShake(true);
      setWrong(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") submit();
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  }

  return (
    <div style={{ ...styles.backdrop, fontFamily: t.font }}>
      <div
        style={{
          ...styles.box,
          animation: shake ? "shake 0.45s ease" : "none",
          fontFamily: t.font,
        }}
      >
        <div style={{ ...styles.prompt, fontSize: 18 }}>
          {promptText || "🗺️ Unlock the map!"}
        </div>
        <QuestionDisplay q={question} t={t} />
        {wrong && (
          <div style={{ ...styles.wrong, fontSize: 16 }}>{t.wrongAnswer}</div>
        )}
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setWrong(false);
          }}
          onKeyDown={onKeyDown}
          style={styles.input}
          placeholder=""
        />
        <div style={styles.buttons}>
          <button style={styles.btn} onClick={submit}>
            {t.check}
          </button>
          {onCancel && (
            <button
              style={{ ...styles.btn, ...styles.cancelBtn }}
              onClick={onCancel}
            >
              {t.cancel}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-10px) }
          40%      { transform: translateX(10px) }
          60%      { transform: translateX(-8px) }
          80%      { transform: translateX(8px) }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  box: {
    background: "#111",
    border: "2px solid #ff6b35",
    borderRadius: 12,
    padding: "36px 44px",
    textAlign: "center",
    fontFamily: "inherit",
    minWidth: 300,
  },
  prompt: {
    color: "#aaa",
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 16,
  },
  question: {
    color: "#fff",
    fontSize: 52,
    fontWeight: "bold",
    letterSpacing: 4,
    marginBottom: 12,
  },
  emojis: {
    fontSize: 30,
    lineHeight: 1.5,
    maxWidth: 320,
    margin: "0 auto 8px",
  },
  sentence: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 12,
  },
  story: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 1.5,
    maxWidth: 340,
    margin: "0 auto 12px",
  },
  wrong: {
    color: "#ff4444",
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    fontSize: 36,
    width: 120,
    textAlign: "center",
    background: "#222",
    color: "#ff6b35",
    border: "2px solid #444",
    borderRadius: 6,
    padding: "8px 0",
    fontFamily: "inherit",
    marginBottom: 24,
    outline: "none",
  },
  buttons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  btn: {
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    padding: "10px 28px",
    fontSize: 16,
    fontFamily: "inherit",
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 4,
  },
  cancelBtn: {
    background: "#333",
  },
};
