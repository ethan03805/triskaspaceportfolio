import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessagePart } from "./MessagePart";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "t", description: "d",
  tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[],
};

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
  it("renders the overview for tool-showProjects output-available", () => {
    const lead = { id: "axiom", name: "Axiom", tagline: "t", description: "d", tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[] };
    render(<MessagePart part={{ type: "tool-showProjects", state: "output-available", output: { lead, others: [], gated: [], emphasis: [] } }} />);
    expect(screen.getByText("Axiom")).toBeInTheDocument();
  });
  it("renders skills for tool-showSkills output-available", () => {
    render(<MessagePart part={{ type: "tool-showSkills", state: "output-available", output: { groups: [{ id: "ai-ml", label: "AI / ML", items: ["NLP"], audienceTags: ["ai"] }], emphasis: [] } }} />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });
  it("renders directions for tool-suggestDirections and forwards onPick", () => {
    const onPick = vi.fn();
    render(<MessagePart onPick={onPick} part={{ type: "tool-suggestDirections", state: "output-available", output: { directions: ["show his skills"] } }} />);
    fireEvent.click(screen.getByText("[ show his skills ]"));
    expect(onPick).toHaveBeenCalledWith("show his skills");
  });
  it("shows a skeleton for any tool input state", () => {
    render(<MessagePart part={{ type: "tool-showExperience", state: "input-available" }} />);
    expect(screen.getByLabelText("composing")).toBeInTheDocument();
  });
  it("shows an error fallback for any tool output-error", () => {
    render(<MessagePart part={{ type: "tool-showEducation", state: "output-error" }} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});
