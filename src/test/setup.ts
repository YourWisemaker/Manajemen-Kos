/**
 * Vitest global setup — Task 1.5
 *
 * Registers the `@testing-library/jest-dom` custom matchers (e.g.
 * `toBeInTheDocument`, `toHaveTextContent`) for every test file, and tears
 * down the rendered DOM after each test to keep cases isolated.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
