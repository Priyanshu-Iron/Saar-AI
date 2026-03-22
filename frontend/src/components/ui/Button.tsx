import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#635bff] text-white hover:bg-[#7a73ff] shadow-[0_2px_5px_-1px_rgba(50,50,93,0.25),0_1px_3px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_12px_-2px_rgba(50,50,93,0.3),0_3px_7px_-3px_rgba(0,0,0,0.12)]",
  secondary: "bg-white text-[#425466] border border-[#e3e8ee] hover:bg-[#f6f9fc] shadow-[0_1px_2px_rgba(50,50,93,0.08)]",
  ghost: "text-[#425466] hover:bg-[#f6f9fc] hover:text-[#0a2540]",
  danger: "bg-[#e25950] text-white hover:bg-[#d44940] shadow-[0_2px_5px_-1px_rgba(226,89,80,0.4)]",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff]/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
