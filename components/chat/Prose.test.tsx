import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Prose } from "./Prose";

describe("Prose", () => {
  it("renders bold and headings", () => {
    render(<Prose>{"# Title\n\nEthan built **Serenity**."}</Prose>);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Serenity").tagName).toBe("STRONG");
  });
  it("renders a GFM table", () => {
    render(<Prose>{"| Project | Year |\n|---|---|\n| Axiom | 2026 |"}</Prose>);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Axiom" })).toBeInTheDocument();
  });
  it("does not execute or emit raw HTML", () => {
    // Text leads so CommonMark parses the line as a paragraph (a leading raw-HTML
    // block would be dropped wholesale, swallowing adjacent text). Either way no
    // <script> element is ever emitted, which is the property under test.
    const { container } = render(<Prose>{"hello <script>alert(1)</script>"}</Prose>);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/hello/)).toBeInTheDocument();
  });
  it("renders external links safely", () => {
    render(<Prose>{"[site](https://agentaxiom.space)"}</Prose>);
    const a = screen.getByRole("link", { name: "site" });
    expect(a).toHaveAttribute("href", "https://agentaxiom.space");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
