import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagePart } from "./MessagePart";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "t", description: "d",
  tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[],
};

afterEach(() => { vi.unstubAllGlobals(); });

describe("MessagePart", () => {
  it("shows a composing skeleton for input states", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "input-available" }} />);
    expect(screen.getByLabelText("composing")).toBeInTheDocument();
  });
  it("shows an error fallback for output-error", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "output-error" }} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
  it("renders the project for output-available", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "output-available", output: { project, emphasis: [] } }} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
  });
  it("suppresses leaked tool JSON in a text part", () => {
    const { container } = render(<MessagePart part={{ type: "text", text: '{"id":"serenity"}' }} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renders normal prose", () => {
    render(<MessagePart part={{ type: "text", text: "Ethan built Serenity Radio." }} />);
    expect(screen.getByText(/Ethan built/)).toBeInTheDocument();
  });
  it("renders markdown formatting in a text part", () => {
    render(<MessagePart part={{ type: "text", text: "Ethan built **Serenity Radio**." }} />);
    expect(screen.getByText("Serenity Radio").tagName).toBe("STRONG");
  });
  it("renders the overview for tool-showProjects output-available", () => {
    const lead = { id: "axiom", name: "Axiom", tagline: "t", description: "d", tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[] };
    render(<MessagePart part={{ type: "tool-showProjects", state: "output-available", output: { lead, others: [], gated: [], emphasis: [] } }} />);
    expect(screen.getByText("Axiom")).toBeInTheDocument();
  });
  it("renders skills for tool-showSkills output-available", () => {
    render(<MessagePart part={{ type: "tool-showSkills", state: "output-available", output: { groups: [{ id: "ai-ml", label: "AI / ML", items: ["NLP"], audienceTags: ["ai"] }], emphasis: [] } }} />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });
  it("does not render suggested directions inline (they are hoisted below the input)", () => {
    const { container } = render(
      <MessagePart part={{ type: "tool-suggestDirections", state: "output-available", output: { directions: ["x"] } }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it("shows a skeleton for any tool input state", () => {
    render(<MessagePart part={{ type: "tool-showExperience", state: "input-available" }} />);
    expect(screen.getByLabelText("composing")).toBeInTheDocument();
  });
  it("shows an error fallback for any tool output-error", () => {
    render(<MessagePart part={{ type: "tool-showEducation", state: "output-error" }} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
  it("renders the Serenity live component for tool-showSerenity", () => {
    // SerenityComponent fetches now-playing on mount; stub fetch so it degrades quietly to static.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) }));
    const serenityProject = {
      id: "serenity", name: "Serenity Radio", tagline: "t", description: "d",
      tech: "typescript", year: "2026", url: "https://underclassradio.com",
      status: "featured" as const, audienceTags: [] as string[], live: { kind: "serenity" as const },
    };
    render(<MessagePart part={{ type: "tool-showSerenity", state: "output-available", output: { project: serenityProject } }} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
  });
});
