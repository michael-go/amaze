import { createContext, useContext, useState, useCallback } from 'react'

const strings = {
  he: {
    title: 'AMAZE',
    subtitle: 'הרפתקה במבוך תלת-ממדי',
    instrMove: 'WASD — תזוזה',
    instrTurn: 'חצים שמאלה/ימינה — סיבוב',
    instrUpDown: 'חצים למעלה/למטה — תזוזה',
    instrMouse: 'עכבר — הסתכלות (לחצו לנעילה)',
    instrToggle: 'T — מעבר לתצוגה עילית',
    instrExit: 'מצאו את האוצר כדי להתקדם!',
    startGame: 'התחל משחק',
    nextLevel: 'שלב הבא',
    restart: 'מההתחלה',
    level: 'שלב',
    levelComplete: (n) => `שלב ${n} הושלם!`,
    youFoundExit: '!מצאתם את האוצר',
    memorize: '!שננו את המבוך',
    spaceToSkip: 'רווח לדלג',
    steps: 'צעדים 🦶',
    firstPerson: 'מבט ראשון 👁',
    topView: 'מבט על 🗺',
    controls: 'WASD · תזוזה | ←→ · סיבוב | עכבר · הסתכלות | T · החלף תצוגה',
    quizMapPrompt: '🗺️ !פתרו כדי לפתוח את המפה',
    quizStepsPrompt: '🦶 !נגמרו הצעדים! פתרו כדי להמשיך',
    wrongAnswer: '!לא מדויק — נסו שוב',
    check: 'בדיקה',
    cancel: 'ביטול',
    langToggle: 'English',
    dir: 'rtl',
    font: "'Heebo', sans-serif",
    exitColor: '#ffd700',
    exitName: 'האוצר',
  },
  en: {
    title: 'AMAZE',
    subtitle: 'A 3D Maze Adventure',
    instrMove: 'WASD — Move & strafe',
    instrTurn: 'Arrow Left/Right — Turn',
    instrUpDown: 'Arrow Up/Down — Move',
    instrMouse: 'Mouse — Look around (click to lock)',
    instrToggle: 'T — Toggle top view',
    instrExit: 'Find the treasure to advance!',
    startGame: 'START GAME',
    nextLevel: 'NEXT LEVEL',
    restart: 'RESTART',
    level: 'LEVEL',
    levelComplete: (n) => `LEVEL ${n} COMPLETE!`,
    youFoundExit: 'You found the treasure!',
    memorize: 'MEMORIZE THE MAZE!',
    spaceToSkip: 'SPACE to skip',
    steps: '🦶 STEPS',
    firstPerson: '👁 FIRST PERSON',
    topView: '🗺 TOP VIEW',
    controls: 'WASD · MOVE  |  ←→ · TURN  |  MOUSE · LOOK  |  T · TOGGLE VIEW',
    quizMapPrompt: '🗺️ Unlock the map!',
    quizStepsPrompt: '🦶 Out of steps! Solve to keep going',
    wrongAnswer: 'Not quite — try again!',
    check: 'CHECK',
    cancel: 'CANCEL',
    langToggle: 'עברית',
    dir: 'ltr',
    font: "'Courier New', monospace",
    exitColor: '#ffd700',
    exitName: 'treasure',
  },
}

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('he')
  const toggle = useCallback(() => setLang(l => l === 'he' ? 'en' : 'he'), [])
  const t = strings[lang]
  return (
    <I18nContext.Provider value={{ t, lang, toggle }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
