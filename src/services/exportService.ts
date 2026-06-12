import { renderStatic } from "../editor/staticRenderer";
import { isTauri, chooseExportPath } from "./fileService";
import { invoke } from "@tauri-apps/api/core";

function printRoot(): HTMLElement {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Export to PDF: render static DOM with the same engine as the preview,
 * then open the system print dialog (the user picks "Save as PDF").
 * Same renderer in, same renderer out — no layout drift.
 */
export async function exportPdf(markdown: string, filePath: string | null): Promise<void> {
  const root = printRoot();
  root.innerHTML = "";
  const dispose = await renderStatic(markdown, root, filePath);
  const prevTitle = document.title;
  if (filePath) {
    document.title = filePath.split("/").pop()?.replace(/\.(md|markdown)$/i, "") ?? prevTitle;
  }
  document.documentElement.classList.add("print-mode");

  const cleanup = () => {
    document.documentElement.classList.remove("print-mode");
    document.title = prevTitle;
    dispose();
    root.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  // Give the layout a frame to settle before opening the dialog.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  try {
    window.print();
  } catch (e) {
    cleanup();
    throw e;
  }
  // WebKit does not always fire afterprint; clean up on a timer as a fallback.
  setTimeout(() => {
    if (document.documentElement.classList.contains("print-mode")) cleanup();
  }, 1000);
}

/** Export a self-contained HTML file (app CSS inlined, mermaid SVG inline). */
export async function exportHtml(markdown: string, filePath: string | null): Promise<string | null> {
  const root = printRoot();
  root.innerHTML = "";
  const dispose = await renderStatic(markdown, root, filePath);
  const body = root.innerHTML;
  dispose();
  root.innerHTML = "";

  const css = collectCss();
  const name = filePath?.split("/").pop()?.replace(/\.(md|markdown)$/i, "") ?? "document";
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}</title>
<style>
${css}
body { display: block; max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
#print-root { position: static; left: auto; width: auto; display: block; }
</style>
</head>
<body>
<div id="print-root">${body}</div>
</body>
</html>`;

  if (!isTauri) {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    return null;
  }
  const target = await chooseExportPath(`${name}.html`, "html");
  if (!target) return null;
  await invoke("export_file", { path: target, content: html });
  return target;
}

function collectCss(): string {
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) css += rule.cssText + "\n";
    } catch {
      // cross-origin stylesheet — skip
    }
  }
  return css;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
