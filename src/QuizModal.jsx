import { useState, useEffect, useRef } from 'react'
import { generateQuestion } from './quiz'
import { useI18n } from './i18n'

export default function QuizModal({ onSuccess, onCancel, prompt: promptText }) {
  const { t } = useI18n()
  const [question] = useState(() => generateQuestion())
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [wrong, setWrong] = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!onCancel) return
    const onKey = (e) => { if (e.code === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function submit() {
    if (parseInt(input, 10) === question.answer) {
      onSuccess()
    } else {
      setShake(true)
      setWrong(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') submit()
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
  }

  return (
    <div style={{ ...styles.backdrop, fontFamily: t.font }}>
      <div style={{ ...styles.box, animation: shake ? 'shake 0.45s ease' : 'none', fontFamily: t.font }}>
        <div style={{ ...styles.prompt, fontSize: 18 }}>{promptText || '🗺️ Unlock the map!'}</div>
        <div style={styles.question}>{question.text} = ?</div>
        {wrong && <div style={{ ...styles.wrong, fontSize: 16 }}>{t.wrongAnswer}</div>}
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={e => { setInput(e.target.value); setWrong(false) }}
          onKeyDown={onKeyDown}
          style={styles.input}
          placeholder="?"
        />
        <div style={styles.buttons}>
          <button style={styles.btn} onClick={submit}>{t.check}</button>
          {onCancel && <button style={{ ...styles.btn, ...styles.cancelBtn }} onClick={onCancel}>{t.cancel}</button>}
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
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  box: {
    background: '#111',
    border: '2px solid #ff6b35',
    borderRadius: 12,
    padding: '36px 44px',
    textAlign: 'center',
    fontFamily: 'inherit',
    minWidth: 300,
  },
  prompt: {
    color: '#aaa',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 16,
  },
  question: {
    color: '#fff',
    fontSize: 52,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 12,
  },
  wrong: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    fontSize: 36,
    width: 120,
    textAlign: 'center',
    background: '#222',
    color: '#ff6b35',
    border: '2px solid #444',
    borderRadius: 6,
    padding: '8px 0',
    fontFamily: 'inherit',
    marginBottom: 24,
    outline: 'none',
  },
  buttons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  btn: {
    background: '#ff6b35',
    color: '#fff',
    border: 'none',
    padding: '10px 28px',
    fontSize: 16,
    fontFamily: 'inherit',
    letterSpacing: 2,
    cursor: 'pointer',
    borderRadius: 4,
  },
  cancelBtn: {
    background: '#333',
  },
}
