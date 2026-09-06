import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Button from "../Button";
import Card from "../Card";
import FormField from "../FormField";
import BrandLogo from "../BrandLogo";

describe("UI kit", () => {
  it("Button primary uses the violet token and no shadow", () => {
    render(<Button>Send bot</Button>);
    const button = screen.getByRole("button", { name: "Send bot" });
    expect(button.className).toContain("bg-violet");
    expect(button.className).not.toContain("shadow");
  });

  it("Card renders title, subtitle, and footer", () => {
    render(
      <Card title="Send bot to meeting" subtitle="Paste a link" footer={<span>footer</span>}>
        body
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Send bot to meeting" })).toBeInTheDocument();
    expect(screen.getByText("Paste a link")).toBeInTheDocument();
    expect(screen.getByText("footer")).toBeInTheDocument();
  });

  it("FormField shows an error message linked to the input", () => {
    render(<FormField label="Work email" error="Enter a valid email address." />);
    const input = screen.getByLabelText("Work email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("BrandLogo mark renders an inline SVG, wordmark renders the PNG", () => {
    const { rerender } = render(<BrandLogo mode="mark" />);
    expect(document.querySelector("svg")).not.toBeNull();
    rerender(<BrandLogo />);
    expect(screen.getByRole("img", { name: "SaarAI" })).toHaveAttribute("src", "/saarai-logo.png");
  });
});
