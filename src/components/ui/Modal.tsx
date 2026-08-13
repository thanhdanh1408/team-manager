"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  // Keep latest onClose without re-running effects
  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Body scroll lock + initial focus — only when open toggles
  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Focus first input/textarea if available, otherwise first focusable
    const t = requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root) return;
      const preferred = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select'
      );
      const fallback = root.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (preferred || fallback)?.focus();
    });

    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = "";
      // Restore focus only when modal actually closes
      previousFocus.current?.focus();
      previousFocus.current = null;
    };
  }, [open]);

  // Escape + focus trap — stable, reads onClose via ref
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative w-full rounded-xl bg-white shadow-xl",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-5xl"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="modal-title"
            className="text-base font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Đóng"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className={cn("px-5 py-4 overflow-y-auto", size === "xl" ? "max-h-[80vh]" : "max-h-[70vh]")}>{children}</div>
      </div>
    </div>
  );
}
