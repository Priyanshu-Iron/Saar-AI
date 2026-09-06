import { describe, expect, it } from "vitest";
import { API_BASE } from "../../api";

describe("API_BASE", () => {
  it("falls back to localhost:8001 when VITE_API_BASE is unset", () => {
    expect(API_BASE).toBe("http://localhost:8001");
  });
});
