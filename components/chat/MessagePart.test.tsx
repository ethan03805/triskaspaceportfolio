import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
