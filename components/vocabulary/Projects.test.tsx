import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsComponent } from "./Projects";

const p = (id: string, name: string, status: "featured" | "gated") => ({
  id, name, tagline: `${name} tagline`, description: "d",
  tech: "go", year: "2026", url: "https://example.com",
  status, audienceTags: [] as string[],
});

describe("ProjectsComponent", () => {
  it("renders the lead and the rows", () => {
    render(
      <ProjectsComponent
        lead={p("axiom", "Axiom", "featured")}
        others={[p("serenity", "Serenity Radio", "featured"), p("vox", "Vox", "featured")]}
        gated={[]}
        emphasis={[]}
      />,
    );
    expect(screen.getByText("Axiom")).toBeInTheDocument();
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
    expect(screen.getByText("Vox")).toBeInTheDocument();
  });
  it("shows the gated divider only when gated projects are present", () => {
    const { rerender } = render(
      <ProjectsComponent lead={p("axiom", "Axiom", "featured")} others={[]} gated={[]} emphasis={[]} />,
    );
    expect(screen.queryByText(/surfaced for you/i)).toBeNull();
    rerender(
      <ProjectsComponent
        lead={p("axiom", "Axiom", "featured")}
        others={[]}
        gated={[p("sstpa", "SSTPA Tool", "gated")]}
        emphasis={[]}
      />,
    );
    expect(screen.getByText(/surfaced for you/i)).toBeInTheDocument();
    expect(screen.getByText("SSTPA Tool")).toBeInTheDocument();
  });
  it("throws on malformed (un-public) input", () => {
    const bad = { id: "x" } as never;
    expect(() =>
      render(<ProjectsComponent lead={bad} others={[]} gated={[]} emphasis={[]} />),
    ).toThrow();
  });
});
