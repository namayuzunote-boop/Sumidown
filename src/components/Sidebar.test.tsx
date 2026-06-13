import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";
import type { FileNode } from "../services/fileService";

// The sidebar is where files are picked and new files are created. The inline
// create flow (button -> input -> Enter/Escape) replaced a window.prompt, so it
// carries real behaviour worth pinning down.

afterEach(cleanup);

const TREE: FileNode[] = [
  {
    name: "docs",
    path: "/p/docs",
    is_dir: true,
    children: [{ name: "guide.md", path: "/p/docs/guide.md", is_dir: false }],
  },
  { name: "readme.md", path: "/p/readme.md", is_dir: false },
];

function setup(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const onSelect = vi.fn();
  const onCreateFile = vi.fn();
  render(
    <Sidebar
      tree={TREE}
      currentPath={null}
      dirty={false}
      folderOpen
      onSelect={onSelect}
      onCreateFile={onCreateFile}
      {...overrides}
    />,
  );
  return { onSelect, onCreateFile };
}

describe("Sidebar tree", () => {
  it("renders nested files and folders", () => {
    setup();
    expect(screen.getByText("docs")).toBeDefined();
    expect(screen.getByText("guide.md")).toBeDefined();
    expect(screen.getByText("readme.md")).toBeDefined();
  });

  it("calls onSelect with the file path when a file is clicked", async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByText("readme.md"));
    expect(onSelect).toHaveBeenCalledWith("/p/readme.md");
  });

  it("shows an empty hint when no folder is open", () => {
    render(
      <Sidebar
        tree={[]}
        currentPath={null}
        dirty={false}
        folderOpen={false}
        onSelect={vi.fn()}
        onCreateFile={vi.fn()}
      />,
    );
    expect(screen.getByText("フォルダを開いてください")).toBeDefined();
  });
});

describe("inline new-file creation", () => {
  it("disables the new-file button until a folder is open", () => {
    setup({ folderOpen: false });
    expect(screen.getByLabelText("新規ファイル")).toHaveProperty("disabled", true);
  });

  it("creates a file on Enter, passing the typed name", async () => {
    const { onCreateFile } = setup();
    await userEvent.click(screen.getByLabelText("新規ファイル"));
    const input = screen.getByPlaceholderText("ファイル名.md");
    await userEvent.type(input, "notes.md{Enter}");
    expect(onCreateFile).toHaveBeenCalledWith("notes.md");
  });

  it("cancels on Escape without creating anything", async () => {
    const { onCreateFile } = setup();
    await userEvent.click(screen.getByLabelText("新規ファイル"));
    const input = screen.getByPlaceholderText("ファイル名.md");
    await userEvent.type(input, "scratch.md");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCreateFile).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("ファイル名.md")).toBeNull();
  });

  it("does not create a file for a blank name", async () => {
    const { onCreateFile } = setup();
    await userEvent.click(screen.getByLabelText("新規ファイル"));
    const input = screen.getByPlaceholderText("ファイル名.md");
    await userEvent.type(input, "   {Enter}");
    expect(onCreateFile).not.toHaveBeenCalled();
  });
});
