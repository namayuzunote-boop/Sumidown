import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";

// Read the actual stylesheet so the contract test breaks if the checkbox
// rules are ever removed. (Vitest's `?raw` import returns empty for CSS, so
// read it straight off disk; tests run from the repo root.)
const editorCss = readFileSync(resolve(process.cwd(), "src/styles/editor.css"), "utf8");

/**
 * Regression guard for the task-list checkbox bug: the gfm preset tags task
 * items with `data-item-type="task"` / `data-checked` but renders no checkbox
 * UI, so the checkbox is drawn purely in CSS (see styles/editor.css). These
 * tests pin down both halves of that contract:
 *   1. the rendered DOM actually carries the attributes the CSS keys off, and
 *   2. the CSS rules that draw the checkbox are present.
 */

const editors: Editor[] = [];

afterEach(() => {
  for (const e of editors.splice(0)) e.destroy();
  document.body.innerHTML = "";
});

async function render(markdown: string): Promise<HTMLElement> {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, markdown);
    })
    .use(commonmark)
    .use(gfm)
    .create();
  editors.push(editor);
  return root;
}

describe("list rendering pipeline", () => {
  it("tags task-list items with data-item-type and data-checked", async () => {
    const root = await render("- [ ] todo\n- [x] done\n");
    const items = root.querySelectorAll('li[data-item-type="task"]');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute("data-checked")).toBe("false");
    expect(items[1].getAttribute("data-checked")).toBe("true");
  });

  it("renders ordered lists as <ol> and plain bullets without task markers", async () => {
    const root = await render("1. one\n2. two\n");
    expect(root.querySelectorAll("ol")).toHaveLength(1);
    expect(root.querySelectorAll('li[data-item-type="task"]')).toHaveLength(0);

    const bullets = await render("- a\n- b\n");
    expect(bullets.querySelectorAll("ul")).toHaveLength(1);
    expect(bullets.querySelectorAll('li[data-item-type="task"]')).toHaveLength(0);
  });
});

describe("task-list checkbox styling contract", () => {
  it("draws a checkbox for task items via ::before", () => {
    expect(editorCss).toMatch(/li\[data-item-type="task"\]::before/);
  });

  it("fills the box for the checked state", () => {
    expect(editorCss).toMatch(/li\[data-item-type="task"\]\[data-checked="true"\]::before/);
  });

  it("keeps the fill visible when printing", () => {
    expect(editorCss).toMatch(/print-color-adjust:\s*exact/);
  });
});
