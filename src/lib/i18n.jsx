import { createContext, useContext, useState, useCallback } from "react";

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
    memorize: "!שננו את המבוך",
    spaceToSkip: "רווח לדלג",
    tapToSkip: "לחצו לדלג",
    steps: "🦶 צעדים",
    firstPerson: "👁 לחזור למבוך",
    topView: "🗺 הפעלת מבט על",
    controls: "↑↓ · קדימה/אחורה | ←→ · סיבוב | T · החלפת תצוגה",
    quizMapPrompt: "🗺️ !פתרו כדי לפתוח את המפה",
    quizStepsPrompt: "🦶 !נגמרו הצעדים! פתרו כדי להמשיך",
    quizMagicPrompt: "✨ !פתרו כדי לאסוף את הקסם",
    wrongAnswer: "!לא מדויק — נסו שוב",
    check: "בדיקה",
    cancel: "ביטול",
    settings: "הגדרות",
    mathOps: "פעולות חשבון",
    sound: "צלילים",
    save: "שמירה",
    continueFrom: (n) => `המשיכו משלב ${n}`,
    startFromBeginning: "התחילו מההתחלה",
    langToggle: "English",
    dir: "rtl",
    font: "'Heebo', sans-serif",
    powerGhost: "👻 מעבר דרך קירות",
    powerFly: "🦅 ריחוף",
    powerTrail: "🐾 עקבות",
    powerSteps: "🦶 מילוי צעדים",
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
    memorize: "MEMORIZE THE MAZE!",
    spaceToSkip: "SPACE to skip",
    tapToSkip: "Tap to skip",
    steps: "🦶 STEPS",
    firstPerson: "👁 RETURN TO MAZE",
    topView: "🗺 TOP VIEW",
    controls: "↑↓ · MOVE  |  ←→ · TURN  |  T · TOGGLE VIEW",
    quizMapPrompt: "🗺️ Unlock the map!",
    quizStepsPrompt: "🦶 Out of steps! Solve to keep going",
    quizMagicPrompt: "✨ Solve to collect the magic!",
    wrongAnswer: "Not quite — try again!",
    check: "CHECK",
    cancel: "CANCEL",
    settings: "SETTINGS",
    mathOps: "MATH OPERATIONS",
    sound: "SOUND",
    save: "SAVE",
    continueFrom: (n) => `CONTINUE FROM LEVEL ${n}`,
    startFromBeginning: "START FROM LEVEL 1",
    langToggle: "עברית",
    dir: "ltr",
    font: "'Heebo', sans-serif",
    powerGhost: "👻 GHOST MODE",
    powerFly: "🦅 FLY MODE",
    powerTrail: "🐾 TRAIL",
    powerSteps: "🦶 STEPS REFILL",
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
