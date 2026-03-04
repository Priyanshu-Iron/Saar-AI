type BrandLogoProps = {
  className?: string;
  alt?: string;
  mode?: "icon" | "full";
};

export function BrandLogo({ className = "", alt = "SaarAI logo", mode = "full" }: BrandLogoProps) {
  if (mode === "icon") {
    return (
      <div className={["h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-white", className].join(" ")}>
        <img
          src="/saarai-logo.png"
          alt={alt}
          className="h-full w-full scale-[2.9] object-cover object-center"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <img
      src="/saarai-logo.png"
      alt={alt}
      className={["h-16 w-auto object-contain", className].join(" ")}
      loading="eager"
    />
  );
}

export default BrandLogo;
