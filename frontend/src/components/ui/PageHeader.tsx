type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, className = "", action }: PageHeaderProps) {
  return (
    <header className={["flex items-start justify-between gap-4", className].join(" ")}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export default PageHeader;
