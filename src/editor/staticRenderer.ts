import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from "@milkdown/kit/core";
import { commonmark, imageSchema } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { diagram } from "@milkdown/plugin-diagram";
import { math } from "@milkdown/plugin-math";
import { $view } from "@milkdown/kit/utils";
import { diagramView } from "./diagramView";
import { mathBlockView } from "./mathBlockView";
import { resolveImageUrl } from "../services/fileService";

/**
 * Render markdown to static, non-interactive DOM inside `container`,
 * using the same engine as the live editor (tables become plain <table>,
 * mermaid becomes inline SVG, math becomes KaTeX spans).
 * Returns a dispose function.
 */
export async function renderStatic(
  markdown: string,
  container: HTMLElement,
  filePath: string | null,
): Promise<() => void> {
  const imageView = $view(imageSchema.node, () => (node) => {
    const img = document.createElement("img");
    img.src = resolveImageUrl(node.attrs.src, filePath);
    if (node.attrs.alt) img.alt = node.attrs.alt;
    return { dom: img };
  });

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, container);
      ctx.set(defaultValueCtx, markdown);
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => false,
      }));
    })
    .use(commonmark)
    .use(gfm)
    .use(diagram)
    .use(diagramView)
    .use(math)
    .use(mathBlockView)
    .use(imageView)
    .create();

  await waitForDiagrams(container);
  fitTables(container);
  return () => editor.destroy();
}

/**
 * The printed page is much narrower than the editor. Tables whose natural
 * (no-wrap) width exceeds the page get scaled down — up to 30% — so columns
 * keep their natural width instead of wrapping mid-word. Wider tables than
 * that fall back to wrapping at the reduced size.
 */
function fitTables(container: HTMLElement) {
  for (const table of Array.from(container.querySelectorAll<HTMLElement>("table"))) {
    const avail = table.parentElement?.clientWidth ?? container.clientWidth;
    if (avail <= 0) continue;
    const prev = table.style.width;
    table.style.width = "max-content";
    const natural = table.scrollWidth;
    table.style.width = prev;
    if (natural > avail) {
      table.style.zoom = String(Math.max(0.7, avail / natural));
    }
  }
}

/** Mermaid renders asynchronously; wait until every diagram has an SVG. */
async function waitForDiagrams(container: HTMLElement, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const diagrams = Array.from(
      container.querySelectorAll(".milkdown [data-type='diagram']"),
    );
    const pending = diagrams.filter((d) => !d.querySelector("svg"));
    if (pending.length === 0) return;
    if (Date.now() - start > timeoutMs) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}
