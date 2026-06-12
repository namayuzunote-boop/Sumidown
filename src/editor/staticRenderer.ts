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
  return () => editor.destroy();
}

/** Mermaid renders asynchronously; wait until every diagram has an SVG. */
async function waitForDiagrams(container: HTMLElement, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const pending = container.querySelectorAll(".milkdown [data-type='diagram']:not(:has(svg))");
    if (pending.length === 0) return;
    if (Date.now() - start > timeoutMs) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}
