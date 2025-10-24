"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalBaseProps = {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
};

/**
 * Accessible modal with focus trap + body scroll lock.
 * Intended to be reused across surfaces (Preprints, Ongoing Research, etc.).
 */
export function ModalBase({
  open,
  onClose,
  labelledBy,
  describedBy,
  children,
  className = "max-w-7xl w-[98vw] md:w-[92vw] lg:w-[90vw] max-h-[96vh] overflow-auto rounded-2xl bg-[#0b0f1a]/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6 md:p-8 text-white",
  backdropClassName = "absolute inset-0 bg-black/60",
}: ModalBaseProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef<string>("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const generatedLabelId = useId();
  const generatedDescId = useId();

  const labelId = labelledBy || `${generatedLabelId}-modal-title`;
  const descId = describedBy || `${generatedDescId}-modal-desc`;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const focusableElements = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
        if (focusableElements.length === 0) return;
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    }

    lastFocusedElement.current = (document.activeElement as HTMLElement) ?? null;
    document.addEventListener("keydown", handleKeyDown);

    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimeout = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? dialogRef.current;
      target?.focus?.({ preventScroll: true });
    }, 10);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow.current;
      lastFocusedElement.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  useEffect(() => {
    if (typeof document !== "undefined") setPortalContainer(document.body);
  }, []);

  if (!portalContainer) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div
            className={backdropClassName}
            onClick={() => {
              onClose();
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelId}
              aria-describedby={descId}
              className={className}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              tabIndex={-1}
            >
              {children}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalContainer
  );
}

export type { ModalBaseProps };
