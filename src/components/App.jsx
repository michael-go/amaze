import { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import MazeScene from "./MazeScene";
import HUD from "./HUD";
import QuizModal from "./QuizModal";
import { useI18n } from "../lib/i18n";
import TouchControls from "./TouchControls";
import { generateMaze, CELL_SIZE } from "../lib/maze";
import DebugPanel from "./DebugPanel";
import SettingsModal from "./SettingsModal";

const MAZE_SIZES = [
  { w: 6, h: 6 },
  { w: 8, h: 8 },
  { w: 10, h: 10 },
  { w: 12, h: 12 },
  { w: 15, h: 15 },
];

function newGame(level) {
  const size = MAZE_SIZES[Math.min(level, MAZE_SIZES.length - 1)];
  const cells = generateMaze(size.w, size.h);
  return {
    cells,
    width: size.w,
    height: size.h,
    startPos: [CELL_SIZE / 2, 0, CELL_SIZE / 2],
    exitPos: [
      (size.w - 1) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (size.h - 1) * CELL_SIZE + CELL_SIZE / 2,
    ],
  };
}

function Key({ children }) {
  return <span style={styles.keyCap}>{children}</span>;
}

export default function App() {
  const { t, toggle: toggleLang } = useI18n();
  const [level, setLevel] = useState(0);
  const [game, setGame] = useState(() => newGame(0));
  const [topView, setTopView] = useState(false);
  const [won, setWon] = useState(false);
  const [screen, setScreen] = useState("title"); // 'title' | 'countdown' | 'playing' | 'won'
  const [countdown, setCountdown] = useState(0);
  const [quizInfo, setQuizInfo] = useState(null); // { onSuccess, onCancel?, prompt? }
  const [maxSteps, setMaxSteps] = useState(0);
  const [stepsRemaining, setStepsRemaining] = useState(0);
  const [enabledOps, setEnabledOps] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("amaze:ops"));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return ["+", "-"];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [savedLevel] = useState(() => {
    const n = parseInt(localStorage.getItem("amaze:level"), 10);
    return n > 0 ? n : 0;
  });

  const saveOps = useCallback((ops) => {
    setEnabledOps(ops);
    localStorage.setItem("amaze:ops", JSON.stringify(ops));
  }, []);

  const beginLevel = useCallback((lvl, g) => {
    setLevel(lvl);
    localStorage.setItem("amaze:level", String(lvl));
    setGame(g);
    setWon(false);
    setTopView(true);
    setCountdown(10);
    setScreen("countdown");
    // Steps proportional to maze area — enough to walk ~45% of cells
    const ms = Math.ceil(g.width * g.height * CELL_SIZE * 0.45);
    setMaxSteps(ms);
    setStepsRemaining(ms);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "KeyT" && screen === "playing" && !quizInfo) {
        if (topView) setTopView(false);
        else
          setQuizInfo({
            onSuccess: () => setTopView(true),
            canCancel: true,
            prompt: t.quizMapPrompt,
          });
      }
      if (e.code === "Space" && screen === "title") {
        beginLevel(0, newGame(0));
      }
      if (e.code === "Space" && screen === "countdown") {
        setTopView(false);
        setScreen("playing");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, topView, quizInfo, beginLevel, t]);

  // Countdown timer
  useEffect(() => {
    if (screen !== "countdown") return;
    if (countdown <= 0) {
      setTopView(false);
      setScreen("playing");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  // Auto-trigger mandatory quiz when steps run out
  useEffect(() => {
    if (
      stepsRemaining <= 0 &&
      maxSteps > 0 &&
      screen === "playing" &&
      !quizInfo
    ) {
      setQuizInfo({
        onSuccess: () =>
          setStepsRemaining((prev) => prev + Math.ceil(maxSteps * 0.4)),
        canCancel: false,
        prompt: t.quizStepsPrompt,
      });
    }
  }, [stepsRemaining, maxSteps, screen, quizInfo, t]);

  const onStepUsed = useCallback(() => {
    setStepsRemaining((prev) => Math.max(0, prev - 1));
  }, []);

  const startGame = useCallback(() => {
    beginLevel(0, newGame(0));
  }, [beginLevel]);

  const nextLevel = useCallback(() => {
    const next = level + 1;
    beginLevel(next, newGame(next));
  }, [level, beginLevel]);

  const handleWin = useCallback(() => {
    setWon(true);
    setScreen("won");
    setTopView(true);
  }, []);

  const jumpToLevel = useCallback(
    (lvl) => {
      beginLevel(lvl, newGame(lvl));
    },
    [beginLevel],
  );

  const langButton = (
    <button style={styles.langBtn} onClick={toggleLang}>
      {t.langToggle}
    </button>
  );

  const font = t.font;

  if (screen === "title") {
    return (
      <div style={{ ...styles.overlay, direction: t.dir, fontFamily: font }}>
        <div style={styles.titleBox}>
          <h1 style={{ ...styles.title, fontFamily: font }}>{t.title}</h1>
          <p style={{ ...styles.subtitle, fontFamily: font, fontSize: 18 }}>
            {t.subtitle}
          </p>
          <div
            style={{ ...styles.instructions, fontFamily: font, fontSize: 16 }}
          >
            <div style={styles.instrRow}>
              <Key>↑</Key> <span style={styles.instrDash}>—</span> {t.instrMove}
            </div>
            <div style={styles.instrRow}>
              <Key>←</Key> <Key>→</Key> <span style={styles.instrDash}>—</span>{" "}
              {t.instrTurn}
            </div>
            <div style={styles.instrRow}>
              <Key>↓</Key> <span style={styles.instrDash}>—</span>{" "}
              {t.instrUpDown}
            </div>
            <div style={styles.instrRow}>
              <Key>T</Key> <span style={styles.instrDash}>—</span>{" "}
              {t.instrToggle}
            </div>
          </div>
          <p
            style={{
              color: "#ccc",
              fontSize: 17,
              fontFamily: font,
              marginBottom: 28,
            }}
          >
            {t.instrExit}
          </p>
          {savedLevel > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button
                style={{ ...styles.btn, fontFamily: font, fontSize: 20 }}
                onClick={() => beginLevel(savedLevel, newGame(savedLevel))}
              >
                {t.continueFrom(savedLevel + 1)}
              </button>
              <button
                style={{
                  ...styles.btn,
                  fontFamily: font,
                  fontSize: 16,
                  background: "#333",
                }}
                onClick={startGame}
              >
                {t.startFromBeginning}
              </button>
            </div>
          ) : (
            <button
              style={{ ...styles.btn, fontFamily: font, fontSize: 20 }}
              onClick={startGame}
            >
              {t.startGame}
            </button>
          )}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {langButton}
            <button
              style={{ ...styles.langBtn, position: "static", fontSize: 24 }}
              onClick={() => setShowSettings(true)}
            >
              &#9881;
            </button>
          </div>
        </div>
        {showSettings && (
          <SettingsModal
            enabledOps={enabledOps}
            onSave={saveOps}
            onClose={() => setShowSettings(false)}
          />
        )}
        <DebugPanel level={level} onJumpToLevel={jumpToLevel} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        fontFamily: font,
      }}
    >
      <Canvas
        gl={{ antialias: true }}
        style={{ background: "#0a0a0a" }}
        camera={topView ? undefined : { fov: 75, near: 0.5, far: 200 }}
      >
        <MazeScene
          game={game}
          level={level}
          topView={topView}
          onWin={handleWin}
          won={won}
          frozen={
            screen === "countdown" ||
            (stepsRemaining <= 0 && screen === "playing")
          }
          onStepUsed={onStepUsed}
        />
      </Canvas>

      <HUD
        level={level + 1}
        topView={topView}
        onToggleView={() =>
          topView
            ? setTopView(false)
            : setQuizInfo({
                onSuccess: () => setTopView(true),
                canCancel: true,
                prompt: t.quizMapPrompt,
              })
        }
        won={won}
        stepsRemaining={stepsRemaining}
        maxSteps={maxSteps}
      />

      {quizInfo && (
        <QuizModal
          enabledOps={enabledOps}
          onSuccess={() => {
            quizInfo.onSuccess();
            setQuizInfo(null);
          }}
          onCancel={quizInfo.canCancel ? () => setQuizInfo(null) : undefined}
          prompt={quizInfo.prompt}
        />
      )}

      {showSettings && (
        <SettingsModal
          enabledOps={enabledOps}
          onSave={saveOps}
          onClose={() => setShowSettings(false)}
        />
      )}

      {screen === "countdown" && (
        <div
          style={styles.countdownOverlay}
          onClick={() => {
            setTopView(false);
            setScreen("playing");
          }}
        >
          <div
            style={{ ...styles.countdownText, fontFamily: font, fontSize: 32 }}
          >
            {t.memorize}
          </div>
          <div style={styles.countdownNumber}>{countdown}</div>
          <div style={styles.skipHint}>{t.tapToSkip}</div>
        </div>
      )}

      {screen === "won" && (
        <div style={{ ...styles.overlay, direction: t.dir, fontFamily: font }}>
          <div style={styles.titleBox}>
            <h1
              style={{
                ...styles.title,
                fontFamily: font,
                color: "#00ff88",
                fontSize: "clamp(28px, 6vw, 52px)",
              }}
            >
              {t.levelComplete(level + 1)}
            </h1>
            <p style={{ ...styles.subtitle, fontFamily: font, fontSize: 18 }}>
              {t.youFoundExit}
            </p>
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <button
                style={{ ...styles.btn, fontFamily: font, fontSize: 20 }}
                onClick={nextLevel}
              >
                {t.nextLevel}
              </button>
              <button
                style={{
                  ...styles.btn,
                  fontFamily: font,
                  fontSize: 20,
                  background: "#333",
                }}
                onClick={startGame}
              >
                {t.restart}
              </button>
            </div>
          </div>
        </div>
      )}

      {langButton}
      <button style={styles.settingsBtn} onClick={() => setShowSettings(true)}>
        &#9881;
      </button>
      <TouchControls />
      <DebugPanel level={level} onJumpToLevel={jumpToLevel} />
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  titleBox: {
    textAlign: "center",
    color: "#fff",
    maxWidth: 520,
    padding: "40px 32px",
    border: "1px solid #333",
    borderRadius: 8,
    background: "#111",
  },
  title: {
    fontSize: 64,
    fontFamily: "Courier New, monospace",
    letterSpacing: 12,
    color: "#ff6b35",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888",
    fontSize: 16,
    marginBottom: 24,
  },
  instructions: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 32,
    background: "#0a0a0a",
    padding: "20px 28px",
    borderRadius: 4,
  },
  instrRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    justifyContent: "center",
  },
  instrDash: {
    color: "#555",
    margin: "0 2px",
  },
  keyCap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 36,
    padding: "0 8px",
    background: "#222",
    border: "1px solid #555",
    borderBottom: "3px solid #444",
    borderRadius: 6,
    color: "#fff",
    fontSize: 18,
    fontFamily: "sans-serif",
    fontWeight: "bold",
    boxShadow: "0 2px 0 #333",
  },
  countdownOverlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 50,
  },
  countdownText: {
    color: "#fff",
    fontFamily: "Courier New, monospace",
    fontSize: 28,
    letterSpacing: 4,
    textShadow: "0 0 20px rgba(255,107,53,0.8)",
    marginBottom: 16,
  },
  countdownNumber: {
    color: "#ff6b35",
    fontFamily: "Courier New, monospace",
    fontSize: 96,
    fontWeight: "bold",
    textShadow: "0 0 40px rgba(255,107,53,0.6)",
  },
  skipHint: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Courier New, monospace",
    fontSize: 14,
    marginTop: 20,
    letterSpacing: 2,
  },
  btn: {
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    padding: "12px 32px",
    fontSize: 18,
    fontFamily: "Courier New, monospace",
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 4,
  },
  settingsBtn: {
    position: "fixed",
    bottom: 80,
    left: 20,
    background: "rgba(0,0,0,0.5)",
    color: "#aaa",
    border: "1px solid #555",
    padding: "6px 14px",
    fontFamily: "Courier New, monospace",
    fontSize: 24,
    cursor: "pointer",
    borderRadius: 4,
    zIndex: 200,
    pointerEvents: "all",
  },
  langBtn: {
    position: "fixed",
    bottom: 40,
    left: 20,
    background: "rgba(0,0,0,0.5)",
    color: "#aaa",
    border: "1px solid #555",
    padding: "6px 14px",
    fontFamily: "Courier New, monospace",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 4,
    zIndex: 200,
    pointerEvents: "all",
  },
};
