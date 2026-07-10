import { useState } from "react";
import { ALL_OPS, EXTRA_TYPES } from "../lib/quiz";
import { useI18n } from "../lib/i18n";
import { isMuted, setMuted } from "../lib/sounds";

const TYPE_ICONS = {
  missing: "❓",
  pattern: "🔢",
  count: "🍎",
  halfDouble: "➗",
  twoStep: "🧮",
  fraction: "½",
  money: "💰",
  clock: "🕒",
};

const typeLabel = (t, key) => t["type" + key[0].toUpperCase() + key.slice(1)];

export default function SettingsModal({ enabledOps, onSave, onClose }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(new Set(enabledOps));
  const [muted, setMutedState] = useState(isMuted);

  function toggle(op) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(op)) {
        if (next.size > 1) next.delete(op);
      } else {
        next.add(op);
      }
      return next;
    });
  }

  function save() {
    onSave([...selected]);
    onClose();
  }

  return (
    <div style={styles.backdrop}>
      <div className="glass" style={{ ...styles.box, fontFamily: t.font }}>
        <h2 style={styles.title}>{t.settings}</h2>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>{t.mathOps}</div>
          <div style={styles.opsRow}>
            {ALL_OPS.map((op) => (
              <button
                key={op}
                style={{
                  ...styles.opBtn,
                  ...(selected.has(op) ? styles.opBtnActive : {}),
                }}
                onClick={() => toggle(op)}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>{t.quizTypes}</div>
          <div style={styles.typesGrid}>
            {EXTRA_TYPES.map((key) => (
              <button
                key={key}
                style={{
                  ...styles.typeBtn,
                  ...(selected.has(key) ? styles.opBtnActive : {}),
                }}
                onClick={() => toggle(key)}
              >
                {TYPE_ICONS[key]} {typeLabel(t, key)}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>{t.sound}</div>
          <button
            style={{
              ...styles.opBtn,
              ...(muted ? {} : styles.opBtnActive),
              width: "auto",
              padding: "0 16px",
              fontSize: 18,
            }}
            onClick={() => {
              const next = !muted;
              setMutedState(next);
              setMuted(next);
            }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
        <div style={styles.buttons}>
          <button
            className="btn btn-primary"
            style={styles.actionBtn}
            onClick={save}
          >
            {t.save}
          </button>
          <button
            className="btn btn-ghost"
            style={styles.actionBtn}
            onClick={onClose}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(4, 6, 14, 0.6)",
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  box: {
    padding: "32px 40px",
    textAlign: "center",
    minWidth: 300,
    animation: "fade-up 0.3s ease both",
  },
  title: {
    color: "var(--text)",
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 24,
    marginTop: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: "var(--text-dim)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  opsRow: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
  },
  opBtn: {
    width: 52,
    height: 52,
    fontSize: 24,
    fontWeight: 800,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(233,237,247,0.4)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  typesGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    maxWidth: 340,
  },
  typeBtn: {
    height: 38,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 700,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(233,237,247,0.4)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  opBtnActive: {
    background: "var(--accent-grad)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 4px 14px rgba(255,92,40,0.35)",
  },
  buttons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  actionBtn: {
    padding: "11px 28px",
    fontSize: 16,
    fontFamily: "inherit",
  },
};
