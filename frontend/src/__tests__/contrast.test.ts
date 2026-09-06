/// <reference types="node" />
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Values copied from index.css. If a token changes there, update it here.
const themes = {
  light: { ground: "#EEF2FA", surface: "#FFFFFF", raised: "#F6F8FD", ink: "#161C3F", ink2: "#161C3F", ink2Alpha: 0.65, gold: "#A16207", cyan: "#0284C7", violet: "#6D28D9", danger: "#C81E3C" },
  dark: { ground: "#0B0F2A", surface: "#12173A", raised: "#1A2050", ink: "#E9ECFA", ink2: "#E9ECFA", ink2Alpha: 0.65, gold: "#F2C14E", cyan: "#38BDF8", violet: "#8B5CF6", danger: "#F0566B" },
};

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function blend(fg: string, bg: string, alpha: number): [number, number, number] {
  const f = hex(fg); const b = hex(bg);
  return [0, 1, 2].map((i) => Math.round(f[i] * alpha + b[i] * (1 - alpha))) as [number, number, number];
}
function lum([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe.each(Object.entries(themes))("%s theme contrast", (_name, t) => {
  it("ink on ground, surface, and raised meets 4.5:1", () => {
    for (const bg of [t.ground, t.surface, t.raised]) {
      expect(ratio(hex(t.ink), hex(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("secondary ink on surface meets 4.5:1", () => {
    expect(ratio(blend(t.ink2, t.surface, t.ink2Alpha), hex(t.surface))).toBeGreaterThanOrEqual(4.5);
  });
  it("gold, cyan, and violet text on surface meet 3:1 for 13px medium and larger", () => {
    for (const fg of [t.gold, t.cyan, t.violet]) {
      expect(ratio(hex(fg), hex(t.surface))).toBeGreaterThanOrEqual(3);
    }
  });
});

// Cross-check that the hex values above actually match the channel triplets
// shipped in index.css, so this spec table can't silently drift from the
// real tokens.
describe("token values", () => {
  const cssPath = path.join(process.cwd(), "src/index.css");
  const css = readFileSync(cssPath, "utf-8");

  const lightBlock = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const darkBlock = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)?.[1] ?? "";

  function parseVars(block: string): Record<string, [number, number, number]> {
    const result: Record<string, [number, number, number]> = {};
    const re = /--(ground|surface|raised|ink|cyan|violet|gold|danger):\s*(\d+)\s+(\d+)\s+(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      result[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
    }
    return result;
  }

  const parsed: Record<"light" | "dark", Record<string, [number, number, number]>> = {
    light: parseVars(lightBlock),
    dark: parseVars(darkBlock),
  };

  // The 8 core colors defined in index.css. `ink2` in the themes table above
  // is the same hex as `ink` and is not itself a CSS variable, so it's skipped.
  const coreColors = ["ground", "surface", "raised", "ink", "cyan", "violet", "gold", "danger"] as const;

  describe.each(Object.entries(themes))("%s theme", (name, t) => {
    it.each(coreColors)("--%s channel triplet matches the spec hex", (color) => {
      expect(parsed[name as "light" | "dark"][color]).toEqual(hex(t[color as keyof typeof t] as string));
    });
  });
});
