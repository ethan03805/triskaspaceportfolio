import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssignmentNote } from "./AssignmentNote";

describe("AssignmentNote", () => {
  it("echoes the visitor's words and states the assigned role", () => {
    render(<AssignmentNote role="recruiter" text="recruiter at a space company, GNC team" />);
    expect(screen.getByText(/recruiter at a space company, GNC team/)).toBeInTheDocument();
    expect(screen.getByText(/reading you as a recruiter/i)).toBeInTheDocument();
  });
  it("uses the role label (an engineer)", () => {
    render(<AssignmentNote role="engineer" text="i build rockets" />);
    expect(screen.getByText(/reading you as an engineer/i)).toBeInTheDocument();
  });
});
