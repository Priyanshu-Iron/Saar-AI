import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center rounded-control px-4 py-2 text-small transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

export const linkButtonClasses: Record<Variant, string> = {
  primary: `${base} bg-violet text-white hover:bg-violet/90`,
  secondary: `${base} border border-violet text-ink hover:bg-violet/10`,
};

type LinkButtonProps = LinkProps & { variant?: Variant };

export function LinkButton({ variant = "primary", className = "", children, ...props }: LinkButtonProps) {
  return (
    <Link className={[linkButtonClasses[variant], className].join(" ")} {...props}>
      {children}
    </Link>
  );
}

export default LinkButton;
