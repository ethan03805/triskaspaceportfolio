import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Conversation } from "./Conversation";

const noop = () => {};
const eng = { role: "engineer" as const, text: null };

describe("Conversation", () => {
  it("shows the entry screen when no persona is declared", () => {
    render(<Conversation persona={null} messages={[]} status="ready" onDeclare={noop} onSend={noop} />);
    expect(screen.getByText("[ recruiter ]")).toBeInTheDocument();
  });

  it("shows the assignment note only for a free-text persona", () => {
    const { rerender } = render(
      <Conversation persona={{ role: "recruiter", text: "recruiter at a space company" }}
        messages={[{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }]}
        status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.getByText(/recruiter at a space company/)).toBeInTheDocument();
    expect(screen.getByText(/reading you as a recruiter/i)).toBeInTheDocument();
    rerender(
      <Conversation persona={eng}
        messages={[{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }]}
        status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.queryByText(/reading you as/i)).toBeNull();
  });

  it("hides the input during the opening, reveals it once the opening completes", async () => {
    const opening = [{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    const { rerender } = render(
      <Conversation persona={eng} messages={opening} status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.queryByPlaceholderText(/ask anything/i)).toBeNull();
    const done = [
      ...opening,
      { id: "a1", role: "assistant", parts: [
        { type: "text", text: "hello" },
        { type: "tool-suggestDirections", state: "output-available", output: { directions: ["tell me about Axiom"] } },
      ] },
    ];
    rerender(<Conversation persona={eng} messages={done} status="ready" onDeclare={noop} onSend={noop} />);
    expect(await screen.findByPlaceholderText(/ask anything/i)).toBeInTheDocument();
  });

  it("renders the latest directions once, below the input, and a tap sends them", async () => {
    const onSend = vi.fn();
    const done = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "a1", role: "assistant", parts: [
        { type: "tool-suggestDirections", state: "output-available", output: { directions: ["show his skills"] } },
      ] },
    ];
    render(<Conversation persona={eng} messages={done} status="ready" onDeclare={noop} onSend={onSend} />);
    const chip = await screen.findByText("[ show his skills ]");
    expect(screen.getAllByText("[ show his skills ]")).toHaveLength(1); // not duplicated in the transcript
    fireEvent.click(chip);
    expect(onSend).toHaveBeenCalledWith("show his skills");
  });
});
