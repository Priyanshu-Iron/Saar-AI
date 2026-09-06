import { type ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, className = "", action }: PageHeaderProps) {
  return (
    <header className={["flex items-start justify-between gap-4", className].join(" ")}>
      <div>
        <h1 className="text-h1">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-ink-2">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export default PageHeader;
