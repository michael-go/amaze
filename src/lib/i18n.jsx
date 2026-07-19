import { createContext, useContext, useState, useCallback } from "react";

const formatMoney = (amount, lang, format = "decimal") => {
  const [whole, cents] = amount.toFixed(2).split(".");
  if (lang === "he" && format === "words")
    return cents === "00"
      ? `${whole} שקלים`
      : `${whole} שקלים ו־${cents} אגורות`;
  const value = cents === "00" ? whole : `${whole}.${cents}`;
  if (lang === "he") return `${value} ₪`;
  return `$${value}`;
};

const strings = {
  he: {
    title: "AMAZE",
    subtitle: "הרפתקה במבוך",
    instrArrows: "תנועה",
    instrToggle: "מעבר לתצוגה עילית",
    instrExit: (
      <>
        מצאו את האוצר כדי להתקדם!
        <br />
        העזרו בחפצים קסומים בדרך ✨
      </>
    ),
    startGame: "התחילו את המשחק",
    nextLevel: "לשלב הבא",
    restart: "מההתחלה",
    level: "שלב",
    levelComplete: (n) => `שלב ${n} הושלם!`,
    youFoundExit: "מצאתם את האוצר!",
    newRecord: "🏆 !שיא חדש",
    bestTime: "השיא שלכם",
    memorize: "!שננו את המבוך",
    loadingMaze: "...מכינים את המבוך",
    spaceToSkip: "רווח לדלג",
    tapToSkip: "לחצו לדלג",
    steps: "🦶 צעדים",
    firstPerson: "👁 לחזור למבוך",
    topView: "🗺 הפעלת מבט על",
    controls: "↑↓ · קדימה/אחורה | ←→ · סיבוב | T · החלפת תצוגה",
    exitToTitle: "🚪 יציאה",
    exitConfirmPrompt: "לצאת מהמשחק ולחזור למסך הבית?",
    quizMapPrompt: "🗺️ !פתרו כדי לפתוח את המפה",
    quizStepsPrompt: "🦶 !נגמרו הצעדים! פתרו כדי להמשיך",
    quizMagicPrompt: "✨ !פתרו כדי לאסוף את הקסם",
    wrongAnswer: "!לא מדויק — נסו שוב",
    check: "בדיקה",
    cancel: "ביטול",
    settings: "הגדרות",
    mathOps: "פעולות חשבון",
    quizTypes: "עוד סוגי שאלות",
    typeMissing: "מספר חסר",
    typePattern: "סדרות",
    typeCount: "ספירה",
    typeHalfDouble: "חצי וכפול",
    typeTwoStep: "תרגיל משולב",
    typeFraction: "שברים",
    typeMoney: "כסף",
    typeClock: "שעון",
    quizHowMany: "כמה?",
    quizDouble: (n) => `פעמיים ${n}?`,
    fracHalf: "חצי",
    fracThird: "שליש",
    fracQuarter: "רבע",
    quizFraction: (frac, n) => `${frac} מ-${n}?`,
    quizMoneyLeft: (have, cost, format) =>
      `יש לכם ${formatMoney(have, "he", format)} וקניתם חטיף ב־${formatMoney(cost, "he", format)}. כמה כסף נשאר?`,
    quizMoneyTotal: (a, b, format) =>
      `צעצוע עולה ${formatMoney(a, "he", format)} ומדבקה עולה ${formatMoney(b, "he", format)}. כמה ביחד?`,
    quizClock: "מה השעה?",
    sound: "צלילים",
    save: "שמירה",
    continueFrom: (n) => `המשיכו משלב ${n}`,
    startFromBeginning: "התחילו מההתחלה",
    chooseLevel: "🗺 בחרו שלב",
    pickLevel: "בחרו שלב",
    badgeNew: "✨ חדש",
    badgeLast: "אחרון ששוחק",
    langToggle: "English",
    dir: "rtl",
    font: "'Heebo', 'Nunito', system-ui, sans-serif",
    powerGhost: "👻 מעבר דרך קירות",
    powerFly: "🦅 ריחוף",
    powerTrail: "🐾 עקבות",
    powerSteps: "🦶 מילוי צעדים",
    powerMap: "🗺️ !מפה נפתחה",
    exitColor: "#ffd700",
    exitName: "האוצר",
  },
  en: {
    title: "AMAZE",
    subtitle: "A 3D Maze Adventure",
    instrArrows: "Movement",
    instrToggle: "Toggle top view",
    instrExit: (
      <>
        Find the treasure to advance!
        <br />
        Collect magic items along the way ✨
      </>
    ),
    startGame: "START GAME",
    nextLevel: "NEXT LEVEL",
    restart: "RESTART",
    level: "LEVEL",
    levelComplete: (n) => `LEVEL ${n} COMPLETE!`,
    youFoundExit: "You found the treasure!",
    newRecord: "🏆 NEW BEST!",
    bestTime: "YOUR BEST",
    memorize: "MEMORIZE THE MAZE!",
    loadingMaze: "PREPARING THE MAZE…",
    spaceToSkip: "SPACE to skip",
    tapToSkip: "Tap to skip",
    steps: "🦶 STEPS",
    firstPerson: "👁 RETURN TO MAZE",
    topView: "🗺 TOP VIEW",
    controls: "↑↓ · MOVE  |  ←→ · TURN  |  T · TOGGLE VIEW",
    exitToTitle: "🚪 EXIT",
    exitConfirmPrompt: "Leave the game and go back to the home screen?",
    quizMapPrompt: "🗺️ Unlock the map!",
    quizStepsPrompt: "🦶 Out of steps! Solve to keep going",
    quizMagicPrompt: "✨ Solve to collect the magic!",
    wrongAnswer: "Not quite — try again!",
    check: "CHECK",
    cancel: "CANCEL",
    settings: "SETTINGS",
    mathOps: "MATH OPERATIONS",
    quizTypes: "MORE QUESTION TYPES",
    typeMissing: "Missing number",
    typePattern: "Patterns",
    typeCount: "Counting",
    typeHalfDouble: "Half & double",
    typeTwoStep: "Two-step",
    typeFraction: "Fractions",
    typeMoney: "Money",
    typeClock: "Clock",
    quizHowMany: "How many?",
    quizDouble: (n) => `Double ${n}?`,
    fracHalf: "Half",
    fracThird: "A third",
    fracQuarter: "A quarter",
    quizFraction: (frac, n) => `${frac} of ${n}?`,
    quizMoneyLeft: (have, cost) =>
      `You have ${formatMoney(have, "en")} and buy a snack for ${formatMoney(cost, "en")}. How much is left?`,
    quizMoneyTotal: (a, b) =>
      `A toy costs ${formatMoney(a, "en")} and a sticker costs ${formatMoney(b, "en")}. How much together?`,
    quizClock: "What time is it?",
    sound: "SOUND",
    save: "SAVE",
    continueFrom: (n) => `CONTINUE FROM LEVEL ${n}`,
    startFromBeginning: "START FROM LEVEL 1",
    chooseLevel: "🗺 CHOOSE LEVEL",
    pickLevel: "PICK A LEVEL",
    badgeNew: "✨ NEW",
    badgeLast: "LAST PLAYED",
    langToggle: "עברית",
    dir: "ltr",
    font: "'Nunito', 'Heebo', system-ui, sans-serif",
    powerGhost: "👻 Walk Through Walls",
    powerFly: "🦅 Fly",
    powerTrail: "🐾 Show Trail",
    powerSteps: "🦶 Steps Refilled",
    powerMap: "🗺️ Map Unlocked!",
    exitColor: "#ffd700",
    exitName: "treasure",
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const qLang = params.get("lang");
    if (qLang === "en" || qLang === "he") return qLang;
    return localStorage.getItem("amaze:lang") || "he";
  });
  const toggle = useCallback(
    () =>
      setLang((l) => {
        const next = l === "he" ? "en" : "he";
        localStorage.setItem("amaze:lang", next);
        return next;
      }),
    [],
  );
  const t = strings[lang];
  return (
    <I18nContext.Provider value={{ t, lang, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
