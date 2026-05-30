import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactComponent } from "./Contact";

const contact = {
  email: "ethan@triska.space",
  resumeUrl: "/ethan-triska-resume.pdf",
  links: [
    { label: "Axiom", url: "https://agentaxiom.space" },
    { label: "Serenity Radio", url: "https://underclassradio.com" },
  ],
};

describe("ContactComponent", () => {
  it("renders a mailto, a resume download, and project links", () => {
    render(<ContactComponent {...contact} />);
    const mail = screen.getByText("ethan@triska.space").closest("a");
    expect(mail).toHaveAttribute("href", "mailto:ethan@triska.space");
    const resume = screen.getByText(/resume/i).closest("a");
    expect(resume).toHaveAttribute("href", "/ethan-triska-resume.pdf");
    expect(resume).toHaveAttribute("download");
    expect(screen.getByText("Axiom").closest("a")).toHaveAttribute("href", "https://agentaxiom.space");
  });
  it("throws on malformed input", () => {
    const bad = { email: "not-an-email" } as unknown as typeof contact;
    expect(() => render(<ContactComponent {...bad} />)).toThrow();
  });
});
