import { useState } from "react";
import { ALL_OPS } from "../lib/quiz";
import { useI18n } from "../lib/i18n";
import { isMuted, setMuted } from "../lib/sounds";

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
      <div style={{ ...styles.box, fontFamily: t.font }}>
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
          <button style={styles.saveBtn} onClick={save}>
            {t.save}
          </button>
          <button style={styles.cancelBtn} onClick={onClose}>
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
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  box: {
    background: "#111",
    border: "2px solid #555",
    borderRadius: 12,
    padding: "32px 40px",
    textAlign: "center",
    minWidth: 280,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    letterSpacing: 3,
    marginBottom: 24,
    marginTop: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: "#aaa",
    fontSize: 14,
    letterSpacing: 2,
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
    fontWeight: "bold",
    background: "#222",
    color: "#666",
    border: "2px solid #333",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  opBtnActive: {
    background: "#ff6b35",
    color: "#fff",
    border: "2px solid #ff6b35",
  },
  buttons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  saveBtn: {
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    padding: "10px 28px",
    fontSize: 16,
    fontFamily: "inherit",
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 4,
  },
  cancelBtn: {
    background: "#333",
    color: "#fff",
    border: "none",
    padding: "10px 28px",
    fontSize: 16,
    fontFamily: "inherit",
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 4,
  },
};
