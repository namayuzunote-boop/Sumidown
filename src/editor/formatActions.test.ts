import { describe, it, expect, afterEach } from "vitest";
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { diagram } from "@milkdown/plugin-diagram";
import { math } from "@milkdown/plugin-math";
import { getMarkdown } from "@milkdown/kit/utils";
import { TextSelection } from "@milkdown/kit/prose/state";
import { FORMAT_ACTIONS, type FormatAction } from "./formatActions";

// The format toolbar is the main authoring surface added on top of Milkdown.
// Each button must actually transform the document, so we run the action
// against a real (headless) editor and read back the serialized markdown.

const editors: Editor[] = [];

afterEach(() => {
  for (const e of editors.splice(0)) e.destroy();
  document.body.innerHTML = "";
});

async function makeEditor(initial: string): Promise<Editor> {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, initial);
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(diagram)
    .use(math)
    .create();
  editors.push(editor);
  return editor;
}

function md(editor: Editor): string {
  return editor.action(getMarkdown());
}

function selectAllText(editor: Editor) {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { doc } = view.state;
    const sel = TextSelection.create(doc, 1, Math.max(1, doc.content.size - 1));
    view.dispatch(view.state.tr.setSelection(sel));
  });
}

function action(label: string): FormatAction {
  const found = FORMAT_ACTIONS.find((a) => a.label === label);
  if (!found) throw new Error(`no action labelled ${label}`);
  return found;
}

async function applyTo(initial: string, label: string): Promise<string> {
  const editor = await makeEditor(initial);
  action(label).run(editor);
  return md(editor);
}

describe("FORMAT_ACTIONS table", () => {
  it("exposes 14 fully-populated buttons", () => {
    expect(FORMAT_ACTIONS).toHaveLength(14);
    for (const a of FORMAT_ACTIONS) {
      expect(a.icon).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(typeof a.run).toBe("function");
    }
  });
});

describe("block transforms", () => {
  it("turns a paragraph into headings", async () => {
    expect(await applyTo("hello", "見出し1")).toContain("# hello");
    expect(await applyTo("hello", "見出し2")).toContain("## hello");
    expect(await applyTo("hello", "見出し3")).toContain("### hello");
  });

  it("wraps into bullet and ordered lists", async () => {
    expect(await applyTo("hello", "箇条書き")).toMatch(/^[-*] hello/m);
    expect(await applyTo("hello", "番号付き")).toMatch(/^1\. hello/m);
  });

  it("wraps into a blockquote", async () => {
    expect(await applyTo("hello", "引用")).toMatch(/^> hello/m);
  });

  it("turns the block into a code block", async () => {
    expect(await applyTo("hello", "コード")).toContain("```");
  });

  it("inserts a horizontal rule", async () => {
    expect(await applyTo("hello", "区切り線")).toMatch(/^(---|\*\*\*|___)/m);
  });

  it("inserts a GFM table", async () => {
    const out = await applyTo("hello", "表");
    expect(out).toMatch(/\|/);
    // header separator row, e.g. "| :----- | :----- |"
    expect(out).toMatch(/\|\s*:?-{3,}/);
  });

  it("inserts a mermaid diagram block", async () => {
    expect(await applyTo("hello", "図")).toContain("```mermaid");
  });

  it("converts a paragraph into an unchecked task item", async () => {
    expect(await applyTo("hello", "タスク")).toMatch(/^[-*] \[ \] hello/m);
  });

  it("turns the block into a math block", async () => {
    expect(await applyTo("hello", "数式")).toContain("$$");
  });
});

describe("inline marks", () => {
  it("wraps the selection in strong / emphasis", async () => {
    const bold = await makeEditor("hello");
    selectAllText(bold);
    action("太字").run(bold);
    expect(md(bold)).toContain("**hello**");

    const italic = await makeEditor("hello");
    selectAllText(italic);
    action("斜体").run(italic);
    expect(md(italic)).toMatch(/[*_]hello[*_]/);
  });
});
