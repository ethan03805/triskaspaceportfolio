import "@testing-library/jest-dom/vitest";

// content modules import 'server-only'; stub it so unit tests can import them.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
