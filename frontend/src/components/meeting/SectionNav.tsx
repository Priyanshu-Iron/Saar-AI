import { useState } from "react";
import type { SectionKey } from "../../api";

export const SECTION_TITLES: Record<SectionKey, string> = { mom: "Minutes", insights: "Insights", strategy: "Strategy" };

type SectionNavProps = { onRegenerate: (section: SectionKey) => void; regenerating: Partial<Record<SectionKey, boolean>> };

const link = "rounded-control px-2 py-1 text-small text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

export function SectionNav({ onRegenerate, regenerating }: SectionNavProps) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(SECTION_TITLES) as SectionKey[];
  return (
    <nav aria-label="Essence sections" className="sticky top-[52px] z-10 -mx-2 mb-2 flex items-center gap-1 border-b border-line bg-ground/80 px-2 py-2 backdrop-blur-md">
      {keys.map((key) => (
        <a key={key} href={`#${key}`} className={link}>{SECTION_TITLES[key]}</a>
      ))}
      <div className="relative ml-auto">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className={link}>Regenerate</button>
        {open ? (
          <div role="menu" className="absolute right-0 top-full mt-1 w-56 rounded-panel border border-line bg-surface p-1">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={Boolean(regenerating[key])}
                onClick={() => { setOpen(false); onRegenerate(key); }}
                className="block w-full rounded-control px-3 py-1.5 text-left text-small text-ink hover:bg-raised disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Regenerate {SECTION_TITLES[key].toLowerCase()}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
export default SectionNav;
