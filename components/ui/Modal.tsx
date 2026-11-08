"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Native <dialog> modal: focus trapping, Esc to close and backdrop come from the browser. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " wide" : ""}`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="modal-inner">
          <header className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
