import { motion } from "framer-motion";
import { type ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function Card({ title, subtitle, children, className = "", noPadding = false }: CardProps) {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={[
        "rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] transition-shadow duration-300 hover:shadow-[0_8px_32px_-8px_rgba(15,23,42,0.12)]",
        noPadding ? "" : "p-5",
        className,
      ].join(" ")}
    >
      {(title || subtitle) && (
        <header className={noPadding ? "px-5 pt-5 mb-4" : "mb-4"}>
          {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export default Card;
