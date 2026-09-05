import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// Select menus scroll the focused option into view; jsdom does not implement layout.
HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  document.body.replaceChildren();
});
