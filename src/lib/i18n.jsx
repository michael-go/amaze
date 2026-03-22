import { createContext, useContext, useState, useCallback } from "react";

const strings = {
  he: {
    title: "AMAZE",
    subtitle: "הרפתקה במבוך",
    instrMove: "קדימה",
    instrTurn: "סיבוב",
    instrUpDown: "אחורה",
    instrToggle: "מעבר לתצוגה עילית",
    instrExit: "מצאו את האוצר כדי להתקדם!",
    startGame: "התחל את המשחק",
    nextLevel: "שלב הבא",
    restart: "מההתחלה",
    level: "שלב",
    levelComplete: (n) => `שלב ${n} הושלם!`,
    youFoundExit: "!מצאתם את האוצר",
    memorize: "!שננו את המבוך",
    spaceToSkip: "רווח לדלג",
    steps: "צעדים 🦶",
    firstPerson: "לחזור למבוך 👁",
    topView: "מבט על 🗺",
    controls: "↑↓ · קדימה/אחורה | ←→ · סיבוב | T · החלף תצוגה",
    quizMapPrompt: "🗺️ !פתרו כדי לפתוח את המפה",
    quizStepsPrompt: "🦶 !נגמרו הצעדים! פתרו כדי להמשיך",
    wrongAnswer: "!לא מדויק — נסו שוב",
    check: "בדיקה",
    cancel: "ביטול",
    settings: "הגדרות",
    mathOps: "פעולות חשבון",
    save: "שמור",
    langToggle: "English",
    dir: "rtl",
    font: "'Heebo', sans-serif",
    exitColor: "#ffd700",
    exitName: "האוצר",
  },
  en: {
    title: "AMAZE",
    subtitle: "A 3D Maze Adventure",
    instrMove: "Move forward",
    instrTurn: "Turn",
    instrUpDown: "Move backward",
    instrToggle: "Toggle top view",
    instrExit: "Find the treasure to advance!",
    startGame: "START GAME",
    nextLevel: "NEXT LEVEL",
    restart: "RESTART",
    level: "LEVEL",
    levelComplete: (n) => `LEVEL ${n} COMPLETE!`,
    youFoundExit: "You found the treasure!",
    memorize: "MEMORIZE THE MAZE!",
    spaceToSkip: "SPACE to skip",
    steps: "🦶 STEPS",
    firstPerson: "👁 RETURN TO MAZE",
    topView: "🗺 TOP VIEW",
    controls: "↑↓ · MOVE  |  ←→ · TURN  |  T · TOGGLE VIEW",
    quizMapPrompt: "🗺️ Unlock the map!",
    quizStepsPrompt: "🦶 Out of steps! Solve to keep going",
    wrongAnswer: "Not quite — try again!",
    check: "CHECK",
    cancel: "CANCEL",
    settings: "SETTINGS",
    mathOps: "MATH OPERATIONS",
    save: "SAVE",
    langToggle: "עברית",
    dir: "ltr",
    font: "'Heebo', sans-serif",
    exitColor: "#ffd700",
    exitName: "treasure",
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("he");
  const toggle = useCallback(
    () => setLang((l) => (l === "he" ? "en" : "he")),
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
