"use client";

import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "@/components/icons";
import { useToast, type ToastTone } from "@/hooks/useToast";

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircleIcon size={17} />,
  error: <AlertIcon size={17} />,
  info: <InfoIcon size={17} />,
};

const TONES: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

/** Fixed, bottom-right notification stack. */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[330px] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-[11px] border border-border bg-white px-3.5 py-3 shadow-pop"
        >
          <span className={`mt-[1px] flex ${TONES[toast.tone]}`}>{ICONS[toast.tone]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">{toast.message}</p>
            {toast.description ? (
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-mr-0.5 rounded p-1 text-muted-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <CloseIcon size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
