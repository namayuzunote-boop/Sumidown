import type { FileNode } from "../services/fileService";

interface Props {
  tree: FileNode[];
  currentPath: string | null;
  dirty: boolean;
  onSelect: (path: string) => void;
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
      {node.name}
      {active && dirty && <span className="dirty-dot">●</span>}
    </div>
  );
}

export default function Sidebar({ tree, currentPath, dirty, onSelect }: Props) {
  return (
    <div className="sidebar">
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
