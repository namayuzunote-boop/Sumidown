import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebview, type DragDropEvent } from "@tauri-apps/api/webview";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[] | null;
}

export interface FsChangeEvent {
  paths: string[];
  kind: "create" | "modify" | "remove";
}

export const isTauri = "__TAURI_INTERNALS__" in window;

const DEMO_KEY = "mdeditor-demo-doc";
const DEMO_PATH = "/demo/welcome.md";
const DEMO_DOC = `# Sumidown へようこそ

これはブラウザ確認用のデモドキュメントです。

## テーブル(セルを直接編集できます)

| 機能 | 状態 |
| --- | --- |
| WYSIWYG | ✅ |
| PDF出力 | ✅ |

## Mermaid

\`\`\`mermaid
graph TD
  A[Markdown] --> B{WYSIWYG編集}
  B --> C[PDF出力]
  B --> D[HTML出力]
\`\`\`

## 数式

インライン: $E = mc^2$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`;

export async function chooseFolder(): Promise<string | null> {
  if (!isTauri) return "/demo";
  const selected = await openDialog({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export async function openFolder(path: string): Promise<FileNode[]> {
  if (!isTauri) {
    return [{ name: "welcome.md", path: DEMO_PATH, is_dir: false }];
  }
  return invoke<FileNode[]>("open_folder", { path });
}

export async function listTree(): Promise<FileNode[]> {
  if (!isTauri) {
    return [{ name: "welcome.md", path: DEMO_PATH, is_dir: false }];
  }
  return invoke<FileNode[]>("list_tree");
}

export async function readTextFile(path: string): Promise<string> {
  if (!isTauri) return localStorage.getItem(DEMO_KEY) ?? DEMO_DOC;
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  if (!isTauri) {
    localStorage.setItem(DEMO_KEY, content);
    return;
  }
  await invoke("write_text_file", { path, content });
}

export async function createFile(path: string): Promise<void> {
  if (!isTauri) return;
  await invoke("create_file", { path });
}

export async function saveImage(dir: string, name: string, base64Data: string): Promise<string> {
  if (!isTauri) return `assets/${name}`;
  return invoke<string>("save_image", { dir, name, base64Data });
}

export async function chooseExportPath(defaultName: string, extension: string): Promise<string | null> {
  if (!isTauri) return null;
  return saveDialog({
    defaultPath: defaultName,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });
}

export async function onFsChange(handler: (e: FsChangeEvent) => void): Promise<UnlistenFn> {
  if (!isTauri) return () => {};
  return listen<FsChangeEvent>("fs-change", (event) => handler(event.payload));
}

/**
 * Subscribe to Finder/Explorer drag-and-drop onto the window.
 * No-op in the browser fallback (drag-and-drop opens real files, which
 * requires Tauri's filesystem access).
 */
export async function onFileDrop(handler: (e: DragDropEvent) => void): Promise<UnlistenFn> {
  if (!isTauri) return () => {};
  return getCurrentWebview().onDragDropEvent((event) => handler(event.payload));
}

/** Resolve an image src in a document to something the WebView can display. */
export function resolveImageUrl(src: string, currentFilePath: string | null): string {
  if (/^(https?:|data:|blob:|asset:)/.test(src)) return src;
  if (!isTauri || !currentFilePath) return src;
  const dir = currentFilePath.replace(/\/[^/]*$/, "");
  const abs = src.startsWith("/") ? src : `${dir}/${src}`;
  return convertFileSrc(abs);
}

export function dirOf(path: string): string {
  return path.replace(/\/[^/]*$/, "");
}
