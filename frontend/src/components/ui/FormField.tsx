import { type InputHTMLAttributes, useState } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function FormField({ label, hint, className = "", ...props }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[#425466]">{label}</span>
      <input
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        className={[
          "w-full rounded-md border bg-white px-3 py-2 text-sm text-[#0a2540] outline-none transition-all duration-150 placeholder:text-[#8898aa]",
          focused
            ? "border-[#635bff] ring-2 ring-[#635bff]/20"
            : "border-[#e3e8ee] hover:border-[#c4cdd5] shadow-[0_1px_2px_rgba(50,50,93,0.06)]",
          className,
        ].join(" ")}
        {...props}
      />
      {hint ? <span className="mt-1.5 block text-xs text-[#697386]">{hint}</span> : null}
    </label>
  );
}

export default FormField;
