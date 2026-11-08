"use client";

import { useState, type ReactNode } from "react";
import { useAction } from "@/lib/hooks";
import { Modal } from "./Modal";
import { ErrorText } from "./bits";

/** A button that asks for confirmation in a modal before running `onConfirm`. */
export function ConfirmButton({
  children, title, message, confirmLabel = "Remove", onConfirm, className = "btn d sm", ariaLabel,
}: {
  children: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, error, setError } = useAction();
  const close = () => {
    setOpen(false);
    setError("");
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>
      <Modal open={open} onClose={close} title={title}>
        <div className="modal-body">
          <p>{message}</p>
          <ErrorText err={error} />
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={pending}
            onClick={async () => {
              const ok = await run(onConfirm);
              if (ok !== undefined) close();
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </footer>
      </Modal>
    </>
  );
}
