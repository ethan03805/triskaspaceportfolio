import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Entry } from "./Entry";

describe("Entry", () => {
  it("declares persona from a chip", () => {
    const onDeclare = vi.fn();
    render(<Entry onDeclare={onDeclare} />);
    fireEvent.click(screen.getByText("[ recruiter ]"));
    expect(onDeclare).toHaveBeenCalledWith({ role: "recruiter", text: null });
  });
  it("opens the describe box and submits free text", () => {
    const onDeclare = vi.fn();
    render(<Entry onDeclare={onDeclare} />);
    fireEvent.click(screen.getByText("or describe yourself →"));
    const input = screen.getByPlaceholderText(/describe/i);
    fireEvent.change(input, { target: { value: "founder building an MVP" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDeclare).toHaveBeenCalledWith({ role: "founder", text: "founder building an MVP" });
  });
});
