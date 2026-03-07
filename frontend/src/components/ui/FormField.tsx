import { motion } from "framer-motion";
import { type InputHTMLAttributes, useState } from "react";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> & {
  label: string;
  hint?: string;
};

export function FormField({ label, hint, className = "", ...props }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600">{label}</span>
      <motion.input
        // @ts-ignore framer-motion types conflict with React types
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        animate={{
          boxShadow: focused
            ? "0 0 0 4px rgba(13,89,242,0.12)"
            : "0 0 0 0px rgba(13,89,242,0)",
        }}
        transition={{ duration: 0.2 }}
        className={[
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors",
          focused ? "border-primary-500" : "border-slate-200 hover:border-slate-300",
          className,
        ].join(" ")}
        {...props}
      />
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export default FormField;
