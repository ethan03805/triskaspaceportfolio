import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mermaidRender, initialize } = vi.hoisted(() => ({
  mermaidRender: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock("mermaid", () => ({ default: { initialize, render: mermaidRender } }));

import { DiagramComponent } from "./Diagram";

beforeEach(() => {
  mermaidRender.mockReset();
  initialize.mockReset();
});

describe("DiagramComponent", () => {
  it("renders the title and the rendered svg", async () => {
    mermaidRender.mockResolvedValue({ svg: "<svg data-testid='mmd'></svg>" });
    const { container } = render(<DiagramComponent title="Flow" mermaid="graph TD; A-->B" />);
    expect(screen.getByText("Flow")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(initialize).toHaveBeenCalled();
  });
  it("falls back to the source as a code block when rendering fails", async () => {
    mermaidRender.mockRejectedValue(new Error("boom"));
    render(<DiagramComponent title={null} mermaid="graph TD; A-->B" />);
    expect(await screen.findByText(/graph TD/)).toBeInTheDocument();
  });
});
