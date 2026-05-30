import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SerenityComponent } from "./Serenity";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "An LLM-hosted station.",
  description: "desc here", tech: "typescript", year: "2026",
  url: "https://underclassradio.com", status: "featured" as const,
  audienceTags: [] as string[], live: { kind: "serenity" as const },
};

const live = {
  ok: true, onAir: true, station: "serenity.fm", show: "Overnight Drift",
  track: { title: "Vordhosbn", artist: "Ergo Phizmiz" },
  beat: "the radiator clicked three times", tagline: "serenity.fm tagline",
};

const fetchReturning = (payload: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => payload });

beforeEach(() => {
  // jsdom does not implement media playback
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("SerenityComponent", () => {
  it("shows the live track, artist, show, and beat after polling", async () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    render(<SerenityComponent project={project} />);
    expect(await screen.findByText("Vordhosbn")).toBeInTheDocument();
    expect(screen.getByText(/Ergo Phizmiz/)).toBeInTheDocument();
    expect(screen.getByText(/Overnight Drift/)).toBeInTheDocument();
    expect(screen.getByText(/radiator clicked/)).toBeInTheDocument();
  });

  it("points the audio element at the live stream", () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    const { container } = render(<SerenityComponent project={project} />);
    expect(container.querySelector("audio")).toHaveAttribute(
      "src", "https://stream.underclassradio.com/stream",
    );
  });

  it("plays then pauses the stream on the button", async () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    render(<SerenityComponent project={project} />);
    const playBtn = await screen.findByRole("button", { name: /listen live/i });
    fireEvent.click(playBtn);
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
    const pauseBtn = await screen.findByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("degrades to static project info when the station is unreachable", async () => {
    vi.stubGlobal("fetch", fetchReturning({ ok: false }));
    render(<SerenityComponent project={project} />);
    expect(await screen.findByText("desc here")).toBeInTheDocument();
    expect(screen.getByText(/visit/i)).toBeInTheDocument();
  });
});
