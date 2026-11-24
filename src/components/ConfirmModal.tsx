import React, { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="login-card"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="admin-confirm-title" style={{ marginBottom: 10 }}>
          {title}
        </h3>
        <p className="muted" style={{ marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-glass btn-sm"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? "btn-ghost-danger" : "btn-primary"}`}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Enviando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
