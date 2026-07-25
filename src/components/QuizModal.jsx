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

function PictureTerm({ term }) {
  const isPicture = typeof term === "string" && Number.isNaN(Number(term));
  return (
    <span style={isPicture ? styles.pictureIcon : styles.pictureNumber}>
      {term}
    </span>
  );
}

function PictureEquation({ line }) {
  return (
    <div style={styles.pictureEquation}>
      <div style={styles.pictureSide}>
        {line.terms.map((term, index) => (
          <span key={`${term}-${index}`} style={styles.pictureGroup}>
            {index > 0 && (
              <span style={styles.pictureOperator}>{line.ops[index - 1]}</span>
            )}
            <PictureTerm term={term} />
          </span>
        ))}
      </div>
      <span style={styles.pictureEquals}>=</span>
      {line.resultTerms ? (
        <div style={styles.pictureSide}>
          <PictureTerm term={line.result} />
          <span style={styles.pictureOperator}>+</span>
          {line.resultTerms.map((term, index) => (
            <PictureTerm key={`${term}-${index}`} term={term} />
          ))}
        </div>
      ) : (
        <span
          style={{
            ...styles.pictureResult,
            ...(line.result === "?" ? styles.pictureQuestionMark : {}),
          }}
        >
          {line.result}
        </span>
      )}
    </div>
  );
}

function PicturePuzzle({ equations, label }) {
  return (
    <div style={styles.picturePuzzle} aria-label={label}>
      {equations.map((line, index) => (
        <PictureEquation key={index} line={line} />
      ))}
    </div>
  );
}

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
    case "picture":
      return (
        <PicturePuzzle equations={q.equations} label={t.quizPictureLabel} />
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
  picturePuzzle: {
    direction: "ltr",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(7px, 1vw, 10px)",
    minWidth: 300,
    padding: "clamp(10px, 3vw, 18px) clamp(10px, 3vw, 22px)",
    margin: "0 auto 18px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  pictureEquation: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    gap: "clamp(3px, 1vw, 10px)",
  },
  pictureSide: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(3px, 1vw, 10px)",
  },
  pictureGroup: {
    display: "contents",
  },
  pictureIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "clamp(36px, 5vw, 46px)",
    height: "clamp(36px, 5vw, 46px)",
    borderRadius: 13,
    background: "rgba(255,255,255,0.09)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
    fontSize: "clamp(23px, 3.3vw, 29px)",
    lineHeight: 1,
  },
  pictureNumber: {
    minWidth: 24,
    color: "#fff",
    fontSize: "clamp(23px, 3vw, 27px)",
    fontWeight: 800,
  },
  pictureOperator: {
    color: "var(--text-dim)",
    fontSize: "clamp(18px, 3vw, 25px)",
    fontWeight: 800,
  },
  pictureEquals: {
    color: "var(--accent-soft)",
    fontSize: "clamp(21px, 3vw, 27px)",
    fontWeight: 900,
  },
  pictureResult: {
    minWidth: 38,
    color: "#fff",
    fontSize: "clamp(24px, 3vw, 28px)",
    fontWeight: 900,
  },
  pictureQuestionMark: {
    color: "var(--accent-soft)",
    fontSize: 34,
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
