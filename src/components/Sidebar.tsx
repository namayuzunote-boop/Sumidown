import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../services/fileService";
import { APP_ICONS } from "../editor/icons";

interface Props {
  tree: FileNode[];
  currentPath: string | null;
  dirty: boolean;
  folderOpen: boolean;
  onSelect: (path: string) => void;
  onCreateFile: (name: string) => void;
}

function TreeNode({ node, currentPath, dirty, onSelect, depth }: {
  node: FileNode;
  currentPath: string | null;
  dirty: boolean;
  onSelect: (path: string) => void;
  depth: number;
}) {
  if (node.is_dir) {
    return (
      <div>
        <div className="tree-dir" style={{ paddingLeft: depth * 14 + 8 }}>
          <span className="tree-icon" dangerouslySetInnerHTML={{ __html: APP_ICONS.folder }} />
          {node.name}
        </div>
        {node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            currentPath={currentPath}
            dirty={dirty}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }
  const active = node.path === currentPath;
  return (
    <div
      className={`tree-file${active ? " active" : ""}`}
      style={{ paddingLeft: depth * 14 + 8 }}
      onClick={() => onSelect(node.path)}
      title={node.path}
    >
      <span className="tree-icon" dangerouslySetInnerHTML={{ __html: APP_ICONS.file }} />
      <span className="tree-label">{node.name}</span>
      {active && dirty && <span className="dirty-dot">●</span>}
    </div>
  );
}

export default function Sidebar({ tree, currentPath, dirty, folderOpen, onSelect, onCreateFile }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const startCreate = () => {
    setName("");
    setCreating(true);
  };

  const commitCreate = () => {
    const trimmed = name.trim();
    if (trimmed) onCreateFile(trimmed);
    setCreating(false);
    setName("");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">ファイル</span>
        <button
          className="sidebar-new-button"
          title="新規ファイル"
          aria-label="新規ファイル"
          disabled={!folderOpen}
          onClick={startCreate}
          dangerouslySetInnerHTML={{ __html: APP_ICONS.new_file }}
        />
      </div>
      {creating && (
        <div className="tree-new-file" style={{ paddingLeft: 8 }}>
          <span className="tree-icon" dangerouslySetInnerHTML={{ __html: APP_ICONS.file }} />
          <input
            ref={inputRef}
            className="tree-new-file-input"
            value={name}
            placeholder="ファイル名.md"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              else if (e.key === "Escape") {
                setCreating(false);
                setName("");
              }
            }}
            onBlur={() => setCreating(false)}
          />
        </div>
      )}
      {tree.length === 0 ? (
        <div className="sidebar-empty">フォルダを開いてください</div>
      ) : (
        tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            currentPath={currentPath}
            dirty={dirty}
            onSelect={onSelect}
            depth={0}
          />
        ))
      )}
    </div>
  );
}
