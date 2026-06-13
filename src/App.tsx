import { useCallback, useEffect, useRef, useState } from "react";
import MilkdownEditor, { type MilkdownEditorHandle } from "./editor/MilkdownEditor";
import SourceView, { type SourceViewHandle } from "./components/SourceView";
import Sidebar from "./components/Sidebar";
import {
  chooseFolder,
  openFolder,
  listTree,
  readTextFile,
  writeTextFile,
  createFile,
  onFsChange,
  onFileDrop,
  isTauri,
  dirOf,
  type FileNode,
} from "./services/fileService";
import { exportPdf, exportHtml } from "./services/exportService";
import { blockIndexToOffset, offsetToBlockIndex } from "./editor/sourceMap";
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
  // Cursor position carried across the preview/source toggle. Both are
  // derived from the same `content` string: the source view gets a char
  // offset, the WYSIWYG view gets a top-level block index.
  const [pendingOffset, setPendingOffset] = useState<number | null>(null);
  const [pendingBlockIndex, setPendingBlockIndex] = useState<number | null>(null);
  // Highlights the drop target while a file/folder is dragged over the window.
  const [dragActive, setDragActive] = useState(false);
  const wysRef = useRef<MilkdownEditorHandle>(null);
  const srcRef = useRef<SourceViewHandle>(null);

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
    setPendingOffset(null);
    setPendingBlockIndex(null);
    setEditorEpoch((n) => n + 1);
  }, []);

  // Opens `dir` as the project folder and loads its first markdown file
  // (unless `andLoad` points at a specific file to open instead).
  const openFolderPath = useCallback(async (dir: string, andLoad?: string) => {
    const nodes = await openFolder(dir);
    setFolder(dir);
    setTree(nodes);
    const target = andLoad ?? findFirstFile(nodes);
    if (target) await loadFile(target);
  }, [loadFile]);

  const handleOpenFolder = useCallback(async () => {
    const dir = await chooseFolder();
    if (!dir) return;
    await openFolderPath(dir);
  }, [openFolderPath]);

  const handleSave = useCallback(async () => {
    if (!filePathRef.current) return;
    await writeTextFile(filePathRef.current, contentRef.current);
    setDirty(false);
    setExternalChange(false);
    flashStatus("保存しました");
  }, [flashStatus]);

  const handleNewFile = useCallback(async (name: string) => {
    if (!folder) return;
    const fileName = /\.(md|markdown)$/i.test(name) ? name : `${name}.md`;
    const path = `${folder}/${fileName}`;
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
    // Carry the cursor over to the other view, converting through the
    // current markdown text (offset ⇔ top-level block index).
    const source = contentRef.current;
    if (sourceMode) {
      const offset = srcRef.current?.getCursorOffset();
      setPendingBlockIndex(offset != null ? offsetToBlockIndex(source, offset) : null);
    } else {
      const blockIndex = wysRef.current?.getBlockIndex();
      setPendingOffset(blockIndex != null ? blockIndexToOffset(source, blockIndex) : null);
    }
    setSourceMode(!sourceMode);
    setEditorEpoch((n) => n + 1);
  }, [sourceMode]);

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

  // Drag & drop a folder or .md file from Finder onto the window.
  useEffect(() => {
    const unlisten = onFileDrop((e) => {
      if (e.type === "enter" || e.type === "over") {
        setDragActive(true);
        return;
      }
      if (e.type === "leave") {
        setDragActive(false);
        return;
      }
      // type === "drop"
      setDragActive(false);
      const path = e.paths[0];
      if (!path) return;
      if (/\.(md|markdown)$/i.test(path)) {
        openFolderPath(dirOf(path), path).catch((err) => flashStatus(String(err)));
      } else {
        openFolderPath(path).catch((err) => flashStatus(String(err)));
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openFolderPath, flashStatus]);

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
      } else if (e.key === "e" || e.key === "p") {
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
      {dragActive && (
        <div className="drop-overlay">
          <div className="drop-overlay-message">ドロップしてフォルダ/ファイルを開く</div>
        </div>
      )}
      <div className="toolbar">
        <button onClick={handleOpenFolder} title="⌘O">フォルダを開く</button>
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
        <Sidebar
          tree={tree}
          currentPath={filePath}
          dirty={dirty}
          folderOpen={!!folder}
          onSelect={loadFile}
          onCreateFile={handleNewFile}
        />
        <div className="editor-pane">
          {filePath === null ? (
            <div className="welcome">
              <h2>Sumidown</h2>
              <p>「フォルダを開く」から .md ファイルのあるフォルダを選択してください。</p>
            </div>
          ) : sourceMode ? (
            <SourceView
              key={`src-${filePath}-${editorEpoch}`}
              ref={srcRef}
              initialValue={content}
              initialCursorOffset={pendingOffset}
              onChange={handleChange}
            />
          ) : (
            <MilkdownEditor
              key={`wys-${filePath}-${editorEpoch}`}
              ref={wysRef}
              filePath={filePath}
              initialValue={content}
              initialBlockIndex={pendingBlockIndex}
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
