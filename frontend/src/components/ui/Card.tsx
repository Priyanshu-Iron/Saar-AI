import { type ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function Card({ title, subtitle, footer, children, className = "", noPadding = false }: CardProps) {
  const hasHeader = Boolean(title || subtitle);
  return (
    <section className={["rounded-panel border border-line bg-surface", noPadding ? "" : "p-6", className].join(" ")}>
      {hasHeader ? (
        <header className={noPadding ? "px-6 pt-6 pb-4" : "mb-4"}>
          {title ? <h3 className="text-h3">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-small text-ink-2">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
      {footer ? (
        <footer className={["border-t border-line", noPadding ? "px-6 py-4" : "mt-4 pt-4"].join(" ")}>{footer}</footer>
      ) : null}
    </section>
  );
}

export default Card;
