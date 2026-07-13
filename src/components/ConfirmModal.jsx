import { useEffect } from "react";
import { useI18n } from "../lib/i18n";

// Small yes/no dialog: confirm is the primary action, cancel (or Escape)
// dismisses without doing anything.
export default function ConfirmModal({
  prompt,
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div style={styles.backdrop}>
      <div
        className="glass"
        style={{ ...styles.box, direction: t.dir, fontFamily: t.font }}
      >
        <div style={styles.prompt}>{prompt}</div>
        <div style={styles.buttons}>
          <button
            className="btn btn-primary"
            style={styles.actionBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className="btn btn-ghost"
            style={styles.actionBtn}
            onClick={onCancel}
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
    maxWidth: 380,
    animation: "fade-up 0.3s ease both",
  },
  prompt: {
    color: "var(--text)",
    fontSize: 19,
    fontWeight: 700,
    lineHeight: 1.5,
    marginBottom: 24,
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
