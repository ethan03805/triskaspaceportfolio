import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Composed } from "./Composed";

describe("Composed", () => {
  it("renders each child as a compose line", () => {
    render(<Composed><span>one</span><span>two</span></Composed>);
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });
});
