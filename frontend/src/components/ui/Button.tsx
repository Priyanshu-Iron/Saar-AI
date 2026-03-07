import { motion } from "framer-motion";
import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-500 shadow-[0_8px_24px_-8px_rgba(13,89,242,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(13,89,242,0.6)]",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  ghost: "bg-white/70 text-slate-700 hover:bg-white border border-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-500 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.5)]",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      // @ts-ignore framer-motion types conflict with React types
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={[
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:opacity-60 disabled:cursor-not-allowed",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default Button;
