import { useCallback, useEffect, useRef, useState } from "react";
import MilkdownEditor from "./editor/MilkdownEditor";
import SourceView from "./components/SourceView";
import Sidebar from "./components/Sidebar";
import {
  chooseFolder,
  openFolder,
  listTree,
  readTextFile,
  writeTextFile,
  createFile,
  onFsChange,
  isTauri,
  type FileNode,
} from "./services/fileService";
import { exportPdf, exportHtml } from "./services/exportService";
import "./styles/app.css";
import "./styles/editor.css";
import "./styles/print.css";

export default function App() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [externalChange, setExternalChange] = useState(false);
  const [status, setStatus] = useState("");
  // editorEpoch forces a remount of the editor when content is replaced
  // from outside (file switch, reload, source-mode toggle).
  const [editorEpoch, setEditorEpoch] = useState(0);

  const contentRef = useRef(content);
  const dirtyRef = useRef(dirty);
  const filePathRef = useRef(filePath);
  contentRef.current = content;
  dirtyRef.current = dirty;
  filePathRef.current = filePath;

  const flashStatus = useCallback((msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  }, []);

  const loadFile = useCallback(async (path: string) => {
    const text = await readTextFile(path);
    setFilePath(path);
    setContent(text);
    setDirty(false);
    setExternalChange(false);
    setEditorEpoch((n) => n + 1);
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const dir = await chooseFolder();
    if (!dir) return;
    const nodes = await openFolder(dir);
    setFolder(dir);
    setTree(nodes);
    const firstFile = findFirstFile(nodes);
    if (firstFile) await loadFile(firstFile);
  }, [loadFile]);

  const handleSave = useCallback(async () => {
    if (!filePathRef.current) return;
    await writeTextFile(filePathRef.current, contentRef.current);
    setDirty(false);
    setExternalChange(false);
    flashStatus("保存しました");
  }, [flashStatus]);

  const handleNewFile = useCallback(async () => {
    if (!folder) return;
    const name = window.prompt("新しいファイル名 (.md)", "untitled.md");
    if (!name) return;
    const path = `${folder}/${name.endsWith(".md") ? name : `${name}.md`}`;
    try {
      await createFile(path);
      setTree(await listTree());
      await loadFile(path);
    } catch (e) {
      flashStatus(String(e));
    }
  }, [folder, loadFile, flashStatus]);

  const handleExportPdf = useCallback(async () => {
    await exportPdf(contentRef.current, filePathRef.current);
  }, []);

  const handleExportHtml = useCallback(async () => {
    const target = await exportHtml(contentRef.current, filePathRef.current);
    if (target) flashStatus(`書き出しました: ${target}`);
  }, [flashStatus]);

  const toggleSourceMode = useCallback(() => {
    setSourceMode((prev) => !prev);
    setEditorEpoch((n) => n + 1);
  }, []);

  const handleChange = useCallback((markdown: string) => {
    setContent(markdown);
    setDirty(true);
  }, []);

  const reloadFromDisk = useCallback(async () => {
    if (!filePathRef.current) return;
    await loadFile(filePathRef.current);
    flashStatus("外部の変更を読み込みました");
  }, [loadFile, flashStatus]);

  // External file changes (e.g. a coding agent rewriting the file):
  // reload silently when there are no unsaved edits, otherwise show a bar.
  useEffect(() => {
    const unlisten = onFsChange((e) => {
      const current = filePathRef.current;
      listTree().then(setTree).catch(() => {});
      if (!current || !e.paths.includes(current)) return;
      if (dirtyRef.current) {
        setExternalChange(true);
      } else {
        readTextFile(current).then((text) => {
          if (text !== contentRef.current) {
            setContent(text);
            setEditorEpoch((n) => n + 1);
          }
        });
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "/") {
        e.preventDefault();
        toggleSourceMode();
      } else if (e.key === "e") {
        e.preventDefault();
        handleExportPdf();
      } else if (e.key === "o") {
        e.preventDefault();
        handleOpenFolder();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, toggleSourceMode, handleExportPdf, handleOpenFolder]);

  return (
    <div className="app">
      <div className="toolbar">
        <button onClick={handleOpenFolder} title="⌘O">フォルダを開く</button>
        <button onClick={handleNewFile} disabled={!folder}>新規</button>
        <button onClick={handleSave} disabled={!filePath || !dirty} title="⌘S">
          保存{dirty ? " ●" : ""}
        </button>
        <div className="spacer" />
        <span className="status">{status}</span>
        <span className="filename">{filePath?.split("/").pop() ?? (isTauri ? "" : "(ブラウザデモ)")}</span>
        <div className="spacer" />
        <button onClick={toggleSourceMode} disabled={!filePath} title="⌘/">
          {sourceMode ? "プレビュー" : "ソース"}
        </button>
        <button onClick={handleExportPdf} disabled={!filePath} title="⌘E">PDF</button>
        <button onClick={handleExportHtml} disabled={!filePath}>HTML</button>
      </div>

      {externalChange && (
        <div className="notice-bar">
          このファイルは外部で変更されました(未保存の編集があります)。
          <button onClick={reloadFromDisk}>読み込み直す</button>
          <button onClick={() => setExternalChange(false)}>無視</button>
        </div>
      )}

      <div className="main">
        <Sidebar tree={tree} currentPath={filePath} dirty={dirty} onSelect={loadFile} />
        <div className="editor-pane">
          {filePath === null ? (
            <div className="welcome">
              <h2>MarkdownEditor</h2>
              <p>「フォルダを開く」から .md ファイルのあるフォルダを選択してください。</p>
            </div>
          ) : sourceMode ? (
            <SourceView key={`src-${filePath}-${editorEpoch}`} initialValue={content} onChange={handleChange} />
          ) : (
            <MilkdownEditor
              key={`wys-${filePath}-${editorEpoch}`}
              filePath={filePath}
              initialValue={content}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function findFirstFile(nodes: FileNode[]): string | null {
  for (const node of nodes) {
    if (!node.is_dir) return node.path;
    const found = node.children ? findFirstFile(node.children) : null;
    if (found) return found;
  }
  return null;
}
