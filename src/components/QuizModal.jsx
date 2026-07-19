import { useState, useEffect, useRef } from "react";
import { generateQuestion } from "../lib/quiz";
import { useI18n } from "../lib/i18n";
import { playQuizCorrect, playQuizWrong } from "../lib/sounds";

function ClockFace({ hour, minutes = 0 }) {
  // Hour hand advances with the minutes (3:30 points halfway between 3 and 4)
  const ha = ((((hour % 12) + minutes / 60) * 30 - 90) * Math.PI) / 180;
  const ma = ((minutes * 6 - 90) * Math.PI) / 180;
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
      {/* minute ticks help read quarter/half hours */}
      {Array.from({ length: 12 }, (_, i) => {
        const ang = ((i * 30 - 90) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + 43 * Math.cos(ang)}
            y1={50 + 43 * Math.sin(ang)}
            x2={50 + 46 * Math.cos(ang)}
            y2={50 + 46 * Math.sin(ang)}
            stroke="#c9a"
            strokeWidth="1.5"
          />
        );
      })}
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
        x2={50 + 30 * Math.cos(ma)}
        y2={50 + 30 * Math.sin(ma)}
        stroke="#888"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2={50 + 20 * Math.cos(ha)}
        y2={50 + 20 * Math.sin(ha)}
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
            ? t.quizMoneyLeft(q.x, q.y, q.format)
            : t.quizMoneyTotal(q.x, q.y, q.format)}
        </div>
      );
    case "clock":
      return (
        <>
          <ClockFace hour={q.hour} minutes={q.minutes} />
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
  const [input2, setInput2] = useState("");
  const [shake, setShake] = useState(false);
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef();
  const minutesRef = useRef();

  // Clock answers are entered digital-style: hours and minutes fields
  const isClock = question.kind === "clock";

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
    const correct = isClock
      ? parseInt(input, 10) === question.hour &&
        parseInt(input2, 10) === question.minutes
      : question.kind === "money"
        ? Math.round(parseFloat(input) * 100) ===
          Math.round(question.answer * 100)
        : parseInt(input, 10) === question.answer;
    if (correct) {
      playQuizCorrect();
      onSuccess();
    } else {
      playQuizWrong();
      setShake(true);
      setWrong(true);
      setInput("");
      setInput2("");
      inputRef.current?.focus();
      setTimeout(() => setShake(false), 500);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      // On the clock's hours field, Enter moves on to the minutes
      if (isClock && e.target === inputRef.current) minutesRef.current?.focus();
      else submit();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  }

  return (
    <div style={{ ...styles.backdrop, fontFamily: t.font }}>
      <div
        className="glass"
        style={{
          ...styles.box,
          animation: shake ? "shake 0.45s ease" : "fade-up 0.3s ease both",
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
        {isClock ? (
          <div style={styles.clockRow}>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setWrong(false);
                // Hours are 1-12: a second digit or 2-9 means it's complete
                const v = e.target.value;
                if (v.length >= 2 || (v.length === 1 && parseInt(v, 10) >= 2))
                  minutesRef.current?.focus();
              }}
              onKeyDown={onKeyDown}
              className="quiz-input"
              style={styles.clockInput}
              placeholder="––"
            />
            <span style={styles.clockColon}>:</span>
            <input
              ref={minutesRef}
              type="number"
              value={input2}
              onChange={(e) => {
                setInput2(e.target.value);
                setWrong(false);
              }}
              onKeyDown={onKeyDown}
              className="quiz-input"
              style={styles.clockInput}
              placeholder="––"
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="number"
            step={question.kind === "money" ? "0.1" : "1"}
            inputMode={question.kind === "money" ? "decimal" : "numeric"}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setWrong(false);
            }}
            onKeyDown={onKeyDown}
            className="quiz-input"
            style={styles.input}
            placeholder=""
          />
        )}
        <div style={styles.buttons}>
          <button
            className="btn btn-primary"
            style={styles.btn}
            onClick={submit}
          >
            {t.check}
          </button>
          {onCancel && (
            <button
              className="btn btn-ghost"
              style={styles.btn}
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
    // The scene render loop pauses while a quiz is open, so this blur is a
    // one-time composite, not a per-frame cost.
    background: "rgba(4, 6, 14, 0.6)",
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  box: {
    padding: "36px 48px",
    textAlign: "center",
    fontFamily: "inherit",
    minWidth: 320,
  },
  prompt: {
    color: "var(--text-dim)",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 16,
  },
  question: {
    color: "#fff",
    fontSize: 52,
    fontWeight: 800,
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
    color: "#ff6a6a",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 24,
  },
  clockRow: {
    direction: "ltr", // digital time reads hours:minutes even in Hebrew
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  clockInput: {
    width: 92,
  },
  clockColon: {
    fontSize: 40,
    fontWeight: 800,
    color: "var(--text-dim)",
  },
  buttons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  btn: {
    padding: "11px 28px",
    fontSize: 16,
    fontFamily: "inherit",
  },
};
