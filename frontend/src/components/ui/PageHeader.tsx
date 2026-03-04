import BrandLogo from "./BrandLogo";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function PageHeader({ title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <header className={["flex items-start gap-3", className].join(" ")}>
      <BrandLogo mode="icon" className="h-10 w-10 rounded-xl" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export default PageHeader;
