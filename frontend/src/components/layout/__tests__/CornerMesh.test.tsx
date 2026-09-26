import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CornerMesh from "../CornerMesh";

describe("CornerMesh", () => {
  it("is hidden from assistive tech, dims via the mesh-opacity utility, and has no inline opacity", () => {
    const { container } = render(<CornerMesh />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("mesh-opacity");
    expect(svg?.style.opacity).toBe("");
  });
});
