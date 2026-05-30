import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestedDirections } from "./SuggestedDirections";

describe("SuggestedDirections", () => {
  it("renders each direction as a bracketed chip", () => {
    render(<SuggestedDirections directions={["tell me about Axiom", "show his skills"]} />);
    expect(screen.getByText("[ tell me about Axiom ]")).toBeInTheDocument();
    expect(screen.getByText("[ show his skills ]")).toBeInTheDocument();
  });
  it("calls onPick with the raw direction text when a chip is tapped", () => {
    const onPick = vi.fn();
    render(<SuggestedDirections directions={["show his skills"]} onPick={onPick} />);
    fireEvent.click(screen.getByText("[ show his skills ]"));
    expect(onPick).toHaveBeenCalledWith("show his skills");
  });
  it("renders nothing when there are no directions", () => {
    const { container } = render(<SuggestedDirections directions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
