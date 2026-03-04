import { motion } from "framer-motion";
import { type ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className = "" }: CardProps) {
  return (
    <motion.section
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-20px_rgba(15,23,42,0.35)]",
        className,
      ].join(" ")}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export default Card;
