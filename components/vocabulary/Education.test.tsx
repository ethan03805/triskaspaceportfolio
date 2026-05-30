import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EducationComponent } from "./Education";

const entries = [
  { id: "depaul", degree: "M.S. Computer Science", school: "DePaul University", location: "Chicago, IL", meta: "expected 2028" },
  { id: "scranton", degree: "B.S. Business Analytics", school: "University of Scranton", location: "Scranton, PA", meta: "2025 · Dean's List" },
];

describe("EducationComponent", () => {
  it("renders degree, school, and mono meta", () => {
    render(<EducationComponent entries={entries} />);
    expect(screen.getByText(/M.S. Computer Science, DePaul University/)).toBeInTheDocument();
    expect(screen.getByText(/Chicago, IL · expected 2028/)).toBeInTheDocument();
    expect(screen.getByText(/University of Scranton/)).toBeInTheDocument();
  });
  it("throws on malformed input", () => {
    const bad = [{ id: "x" }] as never;
    expect(() => render(<EducationComponent entries={bad} />)).toThrow();
  });
});
