import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

const colors = (config.theme?.extend?.colors ?? {}) as Record<string, unknown>;
const radius = (config.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
const fonts = (config.theme?.extend?.fontFamily ?? {}) as Record<string, string[]>;

describe("design tokens", () => {
  it("exposes the identity colors", () => {
    for (const name of ["ground", "surface", "raised", "ink", "cyan", "violet", "gold", "danger", "ink-2", "line", "grid"]) {
      expect(colors[name], name).toBeDefined();
    }
    expect(colors.primary).toBeUndefined();
  });

  it("exposes panel and control radii", () => {
    expect(radius.panel).toBe("12px");
    expect(radius.control).toBe("6px");
  });

  it("uses Anek Devanagari only", () => {
    expect(fonts.sans[0]).toBe('"Anek Devanagari"');
    expect(JSON.stringify(fonts)).not.toContain("Inter");
  });
});
