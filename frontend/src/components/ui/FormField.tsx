import { type InputHTMLAttributes, useId } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function FormField({ label, hint, error, className = "", id, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-small text-ink-2">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          "w-full rounded-control border bg-raised px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-2",
          "focus:border-violet focus:ring-2 focus:ring-violet/25",
          error ? "border-danger" : "border-line",
          className,
        ].join(" ")}
        {...props}
      />
      {error ? (
        <span id={errorId} className="mt-1.5 block text-small text-danger">{error}</span>
      ) : hint ? (
        <span id={hintId} className="mt-1.5 block text-small text-ink-2">{hint}</span>
      ) : null}
    </div>
  );
}

export default FormField;
