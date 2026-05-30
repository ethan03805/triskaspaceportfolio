import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectComponent } from "./Project";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "An LLM-hosted station.",
  description: "desc", tech: "typescript", year: "2026",
  url: "https://underclassradio.com", status: "featured" as const, audienceTags: ["ai" as const],
};

describe("ProjectComponent", () => {
  it("renders name, tagline, and meta", () => {
    render(<ProjectComponent project={project} emphasis={[]} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
    expect(screen.getByText(/typescript · 2026/)).toBeInTheDocument();
  });
  it("throws on malformed (un-public) input", () => {
    const bad = { id: "x" } as never;
    expect(() => render(<ProjectComponent project={bad} emphasis={[]} />)).toThrow();
  });
});
