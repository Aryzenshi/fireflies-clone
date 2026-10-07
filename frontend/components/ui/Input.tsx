import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "w-full rounded-[9px] border border-border bg-white text-[13px] text-ink placeholder:text-muted-soft " +
  "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 " +
  "disabled:bg-surface disabled:text-muted";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function Input({ icon, trailing, className = "", ...rest }: InputProps) {
  if (!icon && !trailing) {
    return <input className={`${FIELD_BASE} h-9 px-3 ${className}`} {...rest} />;
  }
  return (
    <div className={`relative flex items-center ${className}`}>
      {icon ? (
        <span className="pointer-events-none absolute left-3 flex text-muted-soft">{icon}</span>
      ) : null}
      <input className={`${FIELD_BASE} h-9 ${icon ? "pl-9" : "pl-3"} ${trailing ? "pr-16" : "pr-3"}`} {...rest} />
      {trailing ? <span className="absolute right-2 flex items-center">{trailing}</span> : null}
    </div>
  );
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_BASE} px-3 py-2 leading-relaxed ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`${FIELD_BASE} h-9 cursor-pointer appearance-none bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237b8190' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9.5 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className = "" }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-ink-soft">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[11.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const CHECKMARK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12.5 4.5 4.5L19 7'/%3E%3C/svg%3E\")";

/**
 * Real (visually styled) checkbox — the control itself stays focusable and
 * clickable, which keeps keyboard use, screen readers and automation working.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  id,
  ariaLabel,
  className = "",
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  id?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer select-none items-center gap-2 text-[13px] ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
        style={
          checked
            ? { backgroundImage: CHECKMARK, backgroundSize: "11px", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
            : undefined
        }
        className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-border-strong bg-white transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed"
      />
      {label ? <span className="text-ink-soft">{label}</span> : null}
    </label>
  );
}
