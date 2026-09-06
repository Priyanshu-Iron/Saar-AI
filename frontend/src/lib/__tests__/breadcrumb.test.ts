import { describe, expect, it } from "vitest";
import { breadcrumbFor } from "../breadcrumb";

describe("breadcrumbFor", () => {
  it("names top-level pages", () => {
    expect(breadcrumbFor("/dashboard")).toBe("Dashboard");
    expect(breadcrumbFor("/meetings")).toBe("Meetings");
    expect(breadcrumbFor("/chat")).toBe("Chat");
    expect(breadcrumbFor("/settings")).toBe("Settings");
  });

  it("nests meeting pages under Meetings", () => {
    expect(breadcrumbFor("/meetings/42")).toBe("Meetings / Meeting #42");
    expect(breadcrumbFor("/meetings/42/transcript")).toBe("Meetings / Meeting #42 / Transcript");
  });

  it("falls back to SaarAI", () => {
    expect(breadcrumbFor("/nowhere")).toBe("SaarAI");
  });
});
