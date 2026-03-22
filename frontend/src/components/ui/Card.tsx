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
    <section
      className={[
        "rounded-lg border border-[#e3e8ee] bg-white transition-shadow duration-200 hover:shadow-[0_6px_12px_-2px_rgba(50,50,93,0.1),0_3px_7px_-3px_rgba(0,0,0,0.06)]",
        noPadding ? "" : "p-6",
        className,
      ].join(" ")}
      style={{ boxShadow: '0 2px 5px -1px rgba(50,50,93,0.08), 0 1px 3px -1px rgba(0,0,0,0.06)' }}
    >
      {(title || subtitle) && (
        <header className={noPadding ? "px-6 pt-6 mb-4" : "mb-4"}>
          {title ? <h3 className="text-sm font-semibold text-[#0a2540]">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-xs text-[#697386]">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export default Card;
