import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillsComponent } from "./Skills";

const groups = [
  { id: "ai-ml", label: "AI / ML", items: ["NLP", "Generative UI"], audienceTags: ["ai"] },
  { id: "tooling", label: "tooling", items: ["Git", "Tableau"], audienceTags: ["general"] },
];

describe("SkillsComponent", () => {
  it("renders every group label and its items", () => {
    render(<SkillsComponent groups={groups} emphasis={[]} />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
    expect(screen.getByText(/NLP/)).toBeInTheDocument();
    expect(screen.getByText("tooling")).toBeInTheDocument();
  });
  it("marks emphasized groups and de-emphasizes the rest", () => {
    render(<SkillsComponent groups={groups} emphasis={["ai"]} />);
    expect(screen.getByTestId("skill-group-ai-ml").getAttribute("data-emph")).toBe("true");
    expect(screen.getByTestId("skill-group-tooling").getAttribute("data-emph")).toBe("false");
  });
  it("emphasizes everything when emphasis is empty", () => {
    render(<SkillsComponent groups={groups} emphasis={[]} />);
    expect(screen.getByTestId("skill-group-tooling").getAttribute("data-emph")).toBe("true");
  });
});
