import {
  lazy,
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import MazeScene from "./MazeScene";
import HUD from "./HUD";
import { useI18n } from "../lib/i18n";
import TouchControls from "./TouchControls";
import {
  generateMaze,
  generateShapeMask,
  addLoops,
  chooseStartExit,
  setRng,
  CELL_SIZE,
  placeMagicItems,
  placeSingleItem,
  MAGIC_STEPS,
  MAGIC_TRAIL,
  MAGIC_GHOST,
  MAGIC_FLY,
  MAGIC_MAP,
} from "../lib/maze";
import {
  getLevelConfig,
  defaultMazeSeed,
  defaultItemsSeed,
} from "../lib/levelConfig";
import { createRng } from "../lib/rng";
import { ALL_TYPES } from "../lib/quiz";
import { ITEM_COLORS } from "./MagicItem";
import {
  playMagicPickup,
  playTreasureWin,
  playCountdownTick,
  playCountdownGo,
  playFlyWhoosh,
} from "../lib/sounds";

// These screens are not needed for the first render. In particular, keeping
// DebugPanel lazy prevents the sizeable Leva dependency from entering the
// production startup bundle for normal players.
const QuizModal = lazy(() => import("./QuizModal"));
const DebugPanel = lazy(() => import("./DebugPanel"));
const SettingsModal = lazy(() => import("./SettingsModal"));
const ConfirmModal = lazy(() => import("./ConfirmModal"));
const LevelPicker = lazy(() => import("./LevelPicker"));
const DEBUG_ENABLED = window.location.hash.includes("debug");

const ACTIVE_FPS = 60;
const IDLE_FPS = 24;
const IDLE_AFTER_MS = 1800;

function AdaptiveFrameLoop({ paused }) {
  const advance = useThree((state) => state.advance);
  const activeUntil = useRef(performance.now() + IDLE_AFTER_MS);
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    const markActive = () => {
      activeUntil.current = performance.now() + IDLE_AFTER_MS;
    };
    const onKeyDown = (event) => {
      pressedKeys.current.add(event.code);
      markActive();
    };
    const onKeyUp = (event) => {
      pressedKeys.current.delete(event.code);
      markActive();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("touchstart", markActive, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("touchstart", markActive);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let lastFrame = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const active = pressedKeys.current.size > 0 || now < activeUntil.current;
      const interval = 1000 / (active ? ACTIVE_FPS : IDLE_FPS);
      if (now - lastFrame < interval) return;
      lastFrame = now - ((now - lastFrame) % interval);
      // R3F's manual clock uses seconds, while requestAnimationFrame supplies
      // milliseconds. Passing milliseconds makes every delta hit the movement
      // clamp and causes speed to depend on the chosen frame rate.
      advance(now / 1000, true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [advance, paused]);

  return null;
}

function newGame(level, mazeSeed, itemsSeed) {
  // Maze structure RNG
  const mazeRng = createRng(mazeSeed);
  setRng(mazeRng);

  const config = getLevelConfig(level, mazeRng);
  const mask = generateShapeMask(config.width, config.height, config.shape);
  const cells = generateMaze(config.width, config.height, {
    algorithm: config.algorithm,
    mask,
  });
  addLoops(cells, config.loopFactor, mask);
  const { start, exit, startYaw } = chooseStartExit(
    cells,
    mask,
    config.width,
    config.height,
  );

  // Items placement RNG
  setRng(createRng(itemsSeed));

  return {
    cells,
    mask,
    width: config.width,
    height: config.height,
    startPos: [
      start.x * CELL_SIZE + CELL_SIZE / 2,
      0,
      start.y * CELL_SIZE + CELL_SIZE / 2,
    ],
    exitPos: [
      exit.x * CELL_SIZE + CELL_SIZE / 2,
      0,
      exit.y * CELL_SIZE + CELL_SIZE / 2,
    ],
    startYaw,
    startCell: start,
    exitCell: exit,
  };
}

function TitleBackground() {
  const canvasRef = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const cellSize = 32;
    const cols = Math.ceil(w / cellSize) + 2;
    const rows = Math.ceil(h / cellSize) + 2;
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);
    // Generate a real maze for the background
    const cells = generateMaze(cols, rows);
    ctx.strokeStyle = "#4488cc40";
    ctx.lineWidth = 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cellSize;
        const py = y * cellSize;
        const cell = cells[y][x];
        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }
        if (x === cols - 1 && cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
        if (y === rows - 1 && cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
      }
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        filter: "blur(2px)",
        opacity: 0.7,
      }}
    />
  );
}

function Key({ children }) {
  return <span style={styles.keyCap}>{children}</span>;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" };

export default function App() {
  const { t, toggle: toggleLang } = useI18n();
  const [level, setLevel] = useState(0);
  const [mazeSeed, setMazeSeed] = useState(() => defaultMazeSeed(0));
  const [itemsSeed, setItemsSeed] = useState(() => defaultItemsSeed(0));
  const [game, setGame] = useState(() =>
    newGame(0, defaultMazeSeed(0), defaultItemsSeed(0)),
  );
  const [topView, setTopView] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [won, setWon] = useState(false);
  const [screen, setScreen] = useState("title"); // 'title' | 'loading' | 'countdown' | 'playing' | 'won'
  const [countdown, setCountdown] = useState(0);
  const [quizInfo, setQuizInfo] = useState(null); // { onSuccess, onCancel?, prompt? }
  const [maxSteps, setMaxSteps] = useState(0);
  const [stepsRemaining, setStepsRemaining] = useState(0);
  // Everything is enabled by default; we persist only the types the user has
  // explicitly turned off. New quiz types are therefore enabled automatically.
  const [enabledOps, setEnabledOps] = useState(() => {
    let disabled = [];
    try {
      const saved = JSON.parse(localStorage.getItem("amaze:opsDisabled"));
      if (Array.isArray(saved)) disabled = saved;
    } catch {}
    return ALL_TYPES.filter((t) => !disabled.includes(t));
  });
  const [magicItems, setMagicItems] = useState([]);
  const [activePower, setActivePower] = useState(null);
  const [powerSecs, setPowerSecs] = useState(0);
  const [trailActive, setTrailActive] = useState(false);
  const [mapActive, setMapActive] = useState(false);
  // Cell key ("x,y") of an item whose pickup quiz was cancelled
  const [skippedItem, setSkippedItem] = useState(null);
  const playerInfoRef = useRef(null);
  const [stepsDepleted, setStepsDepleted] = useState(0);
  const [stepsUsed, setStepsUsed] = useState(0);
  const bonusSpawnsRef = useRef(0);
  const [burst, setBurst] = useState(null);
  const burstId = useRef(0);
  const winTimer = useRef(null);
  useEffect(() => () => clearTimeout(winTimer.current), []);
  const levelStartRef = useRef(null);
  const [winStats, setWinStats] = useState(null);

  // Level timer starts when gameplay actually begins (after the countdown)
  useEffect(() => {
    if (screen === "playing" && levelStartRef.current === null) {
      levelStartRef.current = Date.now();
    }
  }, [screen]);
  const [showSettings, setShowSettings] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  // Progression: `next` = furthest not-yet-completed level, `last` = last
  // level actually played. Migrates the old single "amaze:level" key.
  const [progress, setProgress] = useState(() => {
    const read = (k) => {
      const n = parseInt(localStorage.getItem(k), 10);
      return n > 0 ? n : 0;
    };
    const legacy = read("amaze:level");
    return {
      next: read("amaze:levelNext") || legacy,
      last: read("amaze:levelLast") || legacy,
    };
  });

  const saveOps = useCallback((ops) => {
    setEnabledOps(ops);
    const disabled = ALL_TYPES.filter((t) => !ops.includes(t));
    localStorage.setItem("amaze:opsDisabled", JSON.stringify(disabled));
  }, []);

  const beginLevel = useCallback((lvl, g) => {
    clearTimeout(winTimer.current);
    setLevel(lvl);
    localStorage.setItem("amaze:levelLast", String(lvl));
    setProgress((p) => ({ ...p, last: lvl }));
    setGame(g);
    setWon(false);
    setTopView(true);
    setCountdown(10);
    setScreen("loading");
    // Steps proportional to valid cell count, scaled by level config
    const config = getLevelConfig(lvl);
    const validCells = g.mask
      ? g.mask.flat().filter(Boolean).length
      : g.width * g.height;
    const ms = Math.ceil(validCells * CELL_SIZE * config.stepBudgetRatio);
    setMaxSteps(ms);
    setStepsRemaining(ms);
    setMagicItems(
      placeMagicItems(
        g.cells,
        config.magicItemCount,
        g.mask,
        g.startCell,
        g.exitCell,
      ),
    );
    setActivePower(null);
    setPowerSecs(0);
    setTrailActive(false);
    setMapActive(false);
    setSkippedItem(null);
    setStepsDepleted(0);
    setStepsUsed(0);
    bonusSpawnsRef.current = 0;
    levelStartRef.current = null;
    setWinStats(null);
    // Reset to Math.random for runtime spawns (step depletion bonus items)
    setRng(Math.random);
  }, []);

  const startLevel = useCallback(
    (lvl, mSeed, iSeed) => {
      const ms = mSeed ?? defaultMazeSeed(lvl);
      const is_ = iSeed ?? defaultItemsSeed(lvl);
      setMazeSeed(ms);
      setItemsSeed(is_);
      beginLevel(lvl, newGame(lvl, ms, is_));
    },
    [beginLevel],
  );

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
      if (
        e.code === "Escape" &&
        screen === "playing" &&
        topView &&
        !quizInfo &&
        !confirmExit
      ) {
        setTopView(false);
      }
      if (e.code === "Space" && screen === "title") {
        startLevel(progress.next);
      }
      if (e.code === "Space" && screen === "countdown") {
        setTopView(false);
        setScreen("playing");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, topView, quizInfo, confirmExit, startLevel, t, progress.next]);

  // Countdown timer
  useEffect(() => {
    if (screen !== "countdown") return;
    if (countdown <= 0) {
      playCountdownGo();
      setTopView(false);
      setScreen("playing");
      return;
    }
    if (countdown <= 3) playCountdownTick();
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
        onSuccess: () => {
          setStepsRemaining((prev) => prev + Math.ceil(maxSteps * 0.4));
          const next = stepsDepleted + 1;
          setStepsDepleted(next);
          // Every 2nd depletion, spawn a bonus item
          if (next % 2 === 0) {
            // Spawn trail if not yet active, with 50% chance; otherwise steps
            const hasTrail =
              trailActive || magicItems.some((it) => it.type === "trail");
            const type =
              !hasTrail && Math.random() < 0.5 ? MAGIC_TRAIL : MAGIC_STEPS;
            const newItem = placeSingleItem(
              game.cells,
              magicItems,
              type,
              game.mask,
              game.startCell,
              game.exitCell,
            );
            if (newItem) setMagicItems((items) => [...items, newItem]);
          }
        },
        canCancel: false,
        prompt: t.quizStepsPrompt,
      });
    }
  }, [
    stepsRemaining,
    maxSteps,
    screen,
    quizInfo,
    t,
    game,
    trailActive,
    stepsDepleted,
    magicItems,
  ]);

  const onStepUsed = useCallback(() => {
    setStepsRemaining((prev) => Math.max(0, prev - 1));
    setStepsUsed((n) => n + 1);
  }, []);

  // Advanced levels reward exploration: every ~30% of the step budget walked,
  // a fresh magic item appears somewhere in the maze — long treks through big
  // mazes keep turning up new magic instead of going dry.
  useEffect(() => {
    if (level < 5 || screen !== "playing" || maxSteps <= 0) return;
    const interval = Math.max(40, Math.ceil(maxSteps * 0.3));
    const milestone = Math.floor(stepsUsed / interval);
    if (milestone <= bonusSpawnsRef.current || bonusSpawnsRef.current >= 8)
      return;
    bonusSpawnsRef.current = milestone;
    const hasTrail =
      trailActive || magicItems.some((it) => it.type === "trail");
    const hasMap = mapActive || magicItems.some((it) => it.type === "map");
    const roll = Math.random();
    // Mostly the fun movement powers; trail/map only while not already owned
    const type =
      !hasTrail && roll < 0.12
        ? MAGIC_TRAIL
        : !hasMap && roll >= 0.12 && roll < 0.24
          ? MAGIC_MAP
          : roll < 0.55
            ? MAGIC_GHOST
            : roll < 0.9
              ? MAGIC_FLY
              : MAGIC_STEPS;
    const item = placeSingleItem(
      game.cells,
      magicItems,
      type,
      game.mask,
      game.startCell,
      game.exitCell,
    );
    if (item) setMagicItems((items) => [...items, item]);
  }, [
    stepsUsed,
    level,
    screen,
    maxSteps,
    magicItems,
    trailActive,
    mapActive,
    game,
  ]);

  const onPickupItem = useCallback(
    (item) => {
      const collectItem = () => {
        playMagicPickup();
        setBurst({
          id: ++burstId.current,
          x: item.worldX,
          z: item.worldZ,
          color: ITEM_COLORS[item.type]?.color || "#ffffff",
        });
        setSkippedItem(null);
        if (item.type === "trail") {
          setTrailActive(true);
          setMagicItems((prev) => prev.filter((it) => it.type !== "trail"));
        } else if (item.type === "map") {
          setMapActive(true);
          setMagicItems((prev) => prev.filter((it) => it.type !== "map"));
        } else if (item.type === "steps") {
          setStepsRemaining(maxSteps);
          setMagicItems((prev) => prev.filter((it) => it !== item));
        } else {
          if (item.type === "fly") playFlyWhoosh();
          setActivePower(item.type);
          setMagicItems((prev) => prev.filter((it) => it !== item));
        }
      };
      setQuizInfo({
        onSuccess: collectItem,
        canCancel: true,
        prompt: t.quizMagicPrompt,
        onCancel: () => setSkippedItem(`${item.cellX},${item.cellY}`),
      });
    },
    [t, maxSteps],
  );

  const onPowerEnd = useCallback(() => {
    setActivePower(null);
    setPowerSecs(0);
  }, []);

  const onSceneReady = useCallback(() => {
    // MazeScene calls this after its first frame with the new level mounted.
    // Only then does memorization time begin.
    setCountdown(10);
    setScreen((current) => (current === "loading" ? "countdown" : current));
  }, []);

  const debugSpawnItem = useCallback((type) => {
    const info = playerInfoRef.current;
    if (!info) return;
    const dx = -Math.sin(info.yaw);
    const dz = -Math.cos(info.yaw);
    const cx = Math.floor((info.pos.x + dx * CELL_SIZE) / CELL_SIZE);
    const cz = Math.floor((info.pos.z + dz * CELL_SIZE) / CELL_SIZE);
    setMagicItems((prev) => [
      ...prev,
      {
        type,
        cellX: cx,
        cellY: cz,
        worldX: cx * CELL_SIZE + CELL_SIZE / 2,
        worldZ: cz * CELL_SIZE + CELL_SIZE / 2,
      },
    ]);
  }, []);

  const startGame = useCallback(() => {
    startLevel(0);
  }, [startLevel]);

  const nextLevel = useCallback(() => {
    startLevel(level + 1);
  }, [level, startLevel]);

  const handleWin = useCallback(() => {
    playTreasureWin();
    // Completing a level unlocks the next one
    if (level + 1 > progress.next) {
      localStorage.setItem("amaze:levelNext", String(level + 1));
      setProgress((p) => ({ ...p, next: level + 1 }));
    }
    setBurst({
      id: ++burstId.current,
      x: game.exitPos[0],
      z: game.exitPos[2],
      color: "#ffd700",
    });
    if (levelStartRef.current !== null) {
      const elapsed = (Date.now() - levelStartRef.current) / 1000;
      // Par: time to walk the full step budget at run speed, plus slack
      // for turning. Medals reward beating it by a margin.
      const par = maxSteps / 5;
      const medal =
        elapsed <= par * 0.6 + 5
          ? "gold"
          : elapsed <= par + 8
            ? "silver"
            : elapsed <= par * 1.5 + 12
              ? "bronze"
              : null;
      const bestKey = `amaze:best:${level}`;
      const prevBest = parseFloat(localStorage.getItem(bestKey));
      const newBest = !(prevBest > 0) || elapsed < prevBest;
      if (newBest) localStorage.setItem(bestKey, elapsed.toFixed(1));
      setWinStats({
        time: elapsed,
        medal,
        best: newBest ? elapsed : prevBest,
        newBest,
      });
    }
    setWon(true);
    // Let the victory dance and burst play out before covering the screen
    winTimer.current = setTimeout(() => {
      setScreen("won");
      setTopView(true);
    }, 2200);
  }, [game, maxSteps, level, progress.next]);

  const jumpToLevel = useCallback(
    (lvl) => {
      startLevel(lvl);
    },
    [startLevel],
  );

  const langButton = (
    <button
      className="btn btn-ghost"
      style={styles.langBtn}
      onClick={toggleLang}
    >
      {t.langToggle}
    </button>
  );

  const font = t.font;

  if (screen === "title") {
    return (
      <div style={{ ...styles.overlay, direction: t.dir, fontFamily: font }}>
        <TitleBackground />
        <div className="glass" style={styles.titleBox}>
          <div style={{ marginBottom: 8 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              width="56"
              height="56"
            >
              <rect width="32" height="32" rx="4" fill="#1a1a2e" />
              <g
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              >
                <rect x="3" y="3" width="26" height="26" rx="1" />
                <line
                  x1="14"
                  y1="3"
                  x2="18"
                  y2="3"
                  stroke="#1a1a2e"
                  strokeWidth="3.5"
                />
                <line
                  x1="14"
                  y1="29"
                  x2="18"
                  y2="29"
                  stroke="#1a1a2e"
                  strokeWidth="3.5"
                />
                <line x1="10" y1="3" x2="10" y2="12" />
                <line x1="3" y1="16" x2="12" y2="16" />
                <line x1="16" y1="10" x2="22" y2="10" />
                <line x1="22" y1="10" x2="22" y2="20" />
                <line x1="10" y1="22" x2="10" y2="29" />
                <line x1="16" y1="20" x2="16" y2="29" />
              </g>
            </svg>
          </div>
          <h1 style={{ ...styles.title, fontFamily: font }}>{t.title}</h1>
          <p style={{ ...styles.subtitle, fontFamily: font, fontSize: 18 }}>
            {t.subtitle}
          </p>
          <div
            style={{
              ...styles.instructions,
              fontFamily: font,
              fontSize: 16,
              direction: "ltr",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Key>↑</Key>
              <div style={{ display: "flex", gap: 3 }}>
                <Key>←</Key>
                <Key>↓</Key>
                <Key>→</Key>
              </div>
              <span style={{ color: "#999", fontSize: 13, marginTop: 2 }}>
                {t.instrArrows}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                marginTop: 10,
              }}
            >
              <Key>T</Key>
              <span style={{ color: "#999", fontSize: 13, marginTop: 2 }}>
                {t.instrToggle}
              </span>
            </div>
          </div>
          <p
            style={{
              color: "#ccc",
              fontSize: 17,
              fontFamily: font,
              marginBottom: 22,
            }}
          >
            {t.instrExit}
          </p>
          {progress.next > 0 || progress.last > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-primary"
                style={{ fontFamily: font, fontSize: 19 }}
                onClick={() => startLevel(progress.next)}
              >
                {t.continueFrom(progress.next + 1)}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontFamily: font, fontSize: 15 }}
                onClick={() => setShowLevels(true)}
              >
                {t.chooseLevel}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ fontFamily: font, fontSize: 19 }}
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
            {/* Static variant: position:fixed would resolve against the
                glass card (backdrop-filter makes it a containing block) */}
            <button
              className="btn btn-ghost"
              style={{
                fontSize: 14,
                padding: "8px 18px",
                color: "var(--text-dim)",
              }}
              onClick={toggleLang}
            >
              {t.langToggle}
            </button>
            <button
              className="btn btn-ghost"
              style={{
                fontSize: 14,
                padding: "8px 18px",
                color: "var(--text-dim)",
              }}
              onClick={() => setShowSettings(true)}
            >
              <span style={{ fontSize: 18 }}>&#9881;</span> {t.settings}
            </button>
          </div>
        </div>
        {showSettings && (
          <Suspense fallback={null}>
            <SettingsModal
              enabledOps={enabledOps}
              onSave={saveOps}
              onClose={() => setShowSettings(false)}
            />
          </Suspense>
        )}
        {showLevels && (
          <Suspense fallback={null}>
            <LevelPicker
              maxLevel={progress.next}
              lastPlayed={progress.last}
              onPick={(lvl) => {
                setShowLevels(false);
                startLevel(lvl);
              }}
              onClose={() => setShowLevels(false)}
            />
          </Suspense>
        )}
        <GitHubLink />
        {DEBUG_ENABLED && (
          <Suspense fallback={null}>
            <DebugPanel
              level={level}
              onJumpToLevel={jumpToLevel}
              onSpawnItem={debugSpawnItem}
              mazeSeed={mazeSeed}
              itemsSeed={itemsSeed}
              onSeedsChange={(ms, is_) => startLevel(level, ms, is_)}
            />
          </Suspense>
        )}
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
        shadows
        // Cap resolution on high-DPI screens: 2-3x DPR with bloom is the
        // single biggest GPU cost, and 1.25x remains crisp while materially
        // reducing the number of shaded pixels.
        // in a moving 3D scene (DOM UI stays crisp regardless).
        dpr={[1, 1.25]}
        // The EffectComposer does its own MSAA; context AA would be paid twice.
        gl={{ antialias: false }}
        // A custom driver caps high-refresh displays at 60fps and drops to
        // 24fps while idle instead of rendering flat-out at the display rate.
        frameloop="never"
        style={{ background: "#0a0a0a" }}
        camera={topView ? undefined : { fov: 75, near: 0.5, far: 200 }}
      >
        <AdaptiveFrameLoop
          paused={!!quizInfo || confirmExit || screen === "won"}
        />
        <MazeScene
          game={game}
          level={level}
          topView={topView}
          onWin={handleWin}
          won={won}
          frozen={
            screen === "loading" ||
            screen === "countdown" ||
            (stepsRemaining <= 0 && screen === "playing") ||
            !!quizInfo ||
            confirmExit
          }
          onStepUsed={onStepUsed}
          magicItems={magicItems}
          onPickupItem={onPickupItem}
          activePower={activePower}
          onPowerEnd={onPowerEnd}
          onPowerTick={setPowerSecs}
          trailActive={trailActive}
          skippedItem={skippedItem}
          playerInfoRef={playerInfoRef}
          burst={burst}
          onBurstDone={() => setBurst(null)}
          onReady={onSceneReady}
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
        onExit={() => setConfirmExit(true)}
        won={won}
        stepsRemaining={stepsRemaining}
        maxSteps={maxSteps}
        activePower={activePower}
        powerSecs={powerSecs}
        trailActive={trailActive}
        mapActive={mapActive}
        game={game}
        playerInfoRef={playerInfoRef}
      />

      {quizInfo && (
        <Suspense fallback={null}>
          <QuizModal
            enabledOps={enabledOps}
            onSuccess={() => {
              quizInfo.onSuccess();
              setQuizInfo(null);
            }}
            onCancel={
              quizInfo.canCancel
                ? () => {
                    quizInfo.onCancel?.();
                    setQuizInfo(null);
                  }
                : undefined
            }
            prompt={quizInfo.prompt}
          />
        </Suspense>
      )}

      {confirmExit && (
        <Suspense fallback={null}>
          <ConfirmModal
            prompt={t.exitConfirmPrompt}
            confirmLabel={t.exitToTitle}
            onConfirm={() => {
              setConfirmExit(false);
              setQuizInfo(null);
              setTopView(false);
              setScreen("title");
            }}
            onCancel={() => setConfirmExit(false)}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            enabledOps={enabledOps}
            onSave={saveOps}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}

      {screen === "loading" && (
        <div
          style={styles.countdownOverlay}
          aria-live="polite"
          aria-label={t.loadingMaze}
        >
          <div style={{ ...styles.countdownText, fontFamily: font }}>
            {t.loadingMaze}
          </div>
        </div>
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
            className="chip"
            style={{ ...styles.countdownText, fontFamily: font }}
          >
            {t.memorize}
          </div>
          {/* key remounts the number each tick so the pop animation replays */}
          <div key={countdown} className="chip" style={styles.countdownNumber}>
            {countdown}
          </div>
          <div className="chip" style={styles.skipHint}>
            {t.tapToSkip}
          </div>
        </div>
      )}

      {screen === "won" && (
        <div style={{ ...styles.overlay, direction: t.dir, fontFamily: font }}>
          <Confetti />
          <div className="glass" style={styles.titleBox}>
            <h1
              style={{
                ...styles.title,
                fontFamily: font,
                background:
                  "linear-gradient(135deg, #baffd9, #4ade80 55%, #16b364)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                fontSize: "clamp(28px, 6vw, 52px)",
              }}
            >
              {t.levelComplete(level + 1)}
            </h1>
            <p style={{ ...styles.subtitle, fontFamily: font, fontSize: 18 }}>
              {t.youFoundExit}
            </p>
            {winStats && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 30,
                    letterSpacing: 2,
                    direction: "ltr",
                  }}
                >
                  ⏱ {fmtTime(winStats.time)}
                  {winStats.medal && ` ${MEDAL_EMOJI[winStats.medal]}`}
                </div>
                {winStats.newBest ? (
                  <div style={{ color: "#ffd700", fontSize: 17, marginTop: 6 }}>
                    {t.newRecord}
                  </div>
                ) : (
                  <div style={{ color: "#888", fontSize: 15, marginTop: 6 }}>
                    {t.bestTime}: {fmtTime(winStats.best)}
                  </div>
                )}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <button
                className="btn btn-primary"
                style={{ fontFamily: font, fontSize: 19 }}
                onClick={nextLevel}
              >
                {t.nextLevel}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontFamily: font, fontSize: 19 }}
                onClick={startGame}
              >
                {t.restart}
              </button>
            </div>
          </div>
        </div>
      )}

      {langButton}
      <button
        className="btn btn-ghost"
        style={styles.settingsBtn}
        onClick={() => setShowSettings(true)}
      >
        &#9881;
      </button>
      <TouchControls />
      <GitHubLink />
      {DEBUG_ENABLED && (
        <Suspense fallback={null}>
          <DebugPanel
            level={level}
            onJumpToLevel={jumpToLevel}
            onSpawnItem={debugSpawnItem}
            mazeSeed={mazeSeed}
            itemsSeed={itemsSeed}
            onSeedsChange={(ms, is_) => startLevel(level, ms, is_)}
          />
        </Suspense>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        dur: 2.5 + Math.random() * 2,
        color: ["#ff6b35", "#ffd700", "#00ff88", "#44aaff", "#ff44aa"][i % 5],
        size: 6 + Math.random() * 7,
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}

function GitHubLink() {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 200,
        pointerEvents: "all",
      }}
    >
      {show && (
        <div
          className="chip"
          style={{
            position: "absolute",
            bottom: 36,
            right: 0,
            padding: "8px 14px",
            whiteSpace: "nowrap",
          }}
        >
          <a
            href="https://github.com/michael-go/amaze"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#7db4e8",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            github.com/michael-go/amaze
          </a>
        </div>
      )}
      <button
        className="chip"
        onClick={() => setShow((s) => !s)}
        style={{
          color: "#888",
          padding: "6px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="#888">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </button>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(1200px 800px at 50% 32%, rgba(24, 28, 52, 0.82), rgba(4, 5, 11, 0.94))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  titleBox: {
    textAlign: "center",
    color: "var(--text)",
    maxWidth: 520,
    maxHeight: "94vh",
    overflowY: "auto",
    padding: "28px 44px",
    animation: "fade-up 0.45s ease both",
  },
  title: {
    fontSize: "clamp(40px, 7vw, 56px)",
    fontWeight: 900,
    letterSpacing: "0.16em",
    paddingLeft: "0.16em", // recenter: letter-spacing adds trailing space
    marginBottom: 8,
    background: "linear-gradient(135deg, #ffd9a0, #ff8a50 45%, #ff5c2e)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  subtitle: {
    color: "var(--text-dim)",
    fontSize: 16,
    marginBottom: 18,
  },
  instructions: {
    color: "var(--text-dim)",
    fontSize: 14,
    marginBottom: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    padding: "14px 28px",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  keyCap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 36,
    padding: "0 8px",
    background: "linear-gradient(180deg, #2e3348, #21253a)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 9,
    color: "var(--text)",
    fontSize: 17,
    fontWeight: 800,
    boxShadow: "0 3px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
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
    color: "var(--text)",
    fontSize: "clamp(20px, 3.5vw, 30px)",
    fontWeight: 800,
    letterSpacing: 2,
    padding: "10px 26px",
    marginBottom: 18,
  },
  countdownNumber: {
    // Dark disk behind the digit keeps it readable over the bright map
    width: 132,
    height: 132,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 76,
    fontWeight: 900,
    lineHeight: 1,
    textShadow: "0 0 26px rgba(255,140,80,0.9)",
    animation: "count-pop 0.45s ease both",
  },
  skipHint: {
    color: "var(--text-dim)",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 22,
    letterSpacing: 1.5,
    padding: "6px 16px",
  },
  settingsBtn: {
    position: "fixed",
    bottom: 80,
    left: 20,
    color: "var(--text-dim)",
    padding: "6px 14px",
    fontSize: 22,
    borderRadius: 12,
    zIndex: 200,
    pointerEvents: "all",
  },
  langBtn: {
    position: "fixed",
    bottom: 40,
    left: 20,
    color: "var(--text-dim)",
    padding: "7px 14px",
    fontSize: 13,
    borderRadius: 12,
    zIndex: 200,
    pointerEvents: "all",
  },
};
