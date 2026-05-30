import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExperienceComponent } from "./Experience";

const entries = [
  {
    id: "ng", role: "Pricing & Estimating Intern", org: "Northrop Grumman Space Systems",
    location: "Dulles, VA", dates: "Jun 2024 - Aug 2024",
    bullets: ["Built a Python Cost Volume generator."], audienceTags: ["aerospace", "data"],
  },
  {
    id: "pampco", role: "Data Analytics Assistant", org: "Pampco",
    location: "Passaic, NJ", dates: "Jun 2023 - Aug 2023",
    bullets: ["Aggregated vendor data into one report."], audienceTags: ["data"],
  },
];

describe("ExperienceComponent", () => {
  it("renders role, org, meta, and bullets", () => {
    render(<ExperienceComponent entries={entries} emphasis={[]} />);
    expect(screen.getByText(/Pricing & Estimating Intern/)).toBeInTheDocument();
    expect(screen.getByText(/Northrop Grumman Space Systems/)).toBeInTheDocument();
    expect(screen.getByText(/Dulles, VA · Jun 2024 - Aug 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Cost Volume generator/)).toBeInTheDocument();
  });
  it("marks emphasized entries and de-emphasizes the rest", () => {
    render(<ExperienceComponent entries={entries} emphasis={["aerospace"]} />);
    expect(screen.getByTestId("xp-ng").getAttribute("data-emph")).toBe("true");
    expect(screen.getByTestId("xp-pampco").getAttribute("data-emph")).toBe("false");
  });
});
