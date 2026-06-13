import { describe, it, expect, afterEach } from "vitest";
import { renderStatic } from "./staticRenderer";

// renderStatic drives the PDF / HTML export. It must turn markdown into static,
// non-interactive DOM with the same structure the preview shows (tables become
// plain <table>, headings/paragraphs map 1:1), so the printed page matches.

let dispose: (() => void) | null = null;

afterEach(() => {
  dispose?.();
  dispose = null;
  document.body.innerHTML = "";
});

async function render(markdown: string): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  dispose = await renderStatic(markdown, container, null);
  return container;
}

describe("renderStatic", () => {
  it("renders headings and paragraphs", async () => {
    const c = await render("# Title\n\nHello paragraph.\n");
    const h1 = c.querySelector("h1");
    expect(h1?.textContent).toContain("Title");
    expect(c.querySelector("p")?.textContent).toContain("Hello paragraph");
  });

  it("renders a GFM table as a plain <table> with the cell contents", async () => {
    const c = await render("| Name | Age |\n| --- | --- |\n| Ada | 36 |\n");
    const table = c.querySelector("table");
    expect(table).not.toBeNull();
    expect(table!.textContent).toContain("Name");
    expect(table!.textContent).toContain("Ada");
    expect(table!.querySelectorAll("td").length).toBeGreaterThanOrEqual(2);
  });

  it("renders task-list checkboxes via the same data attributes the CSS targets", async () => {
    const c = await render("- [ ] todo\n- [x] done\n");
    const tasks = c.querySelectorAll('li[data-item-type="task"]');
    expect(tasks).toHaveLength(2);
    expect(tasks[1].getAttribute("data-checked")).toBe("true");
  });

  it("returns a dispose function that can be called without throwing", async () => {
    await render("# x\n");
    expect(typeof dispose).toBe("function");
    expect(() => dispose!()).not.toThrow();
    dispose = null;
  });
});
