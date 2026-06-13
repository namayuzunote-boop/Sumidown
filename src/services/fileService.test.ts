import { describe, it, expect, beforeEach } from "vitest";
import {
  isTauri,
  dirOf,
  resolveImageUrl,
  openFolder,
  listTree,
  readTextFile,
  writeTextFile,
  chooseFolder,
} from "./fileService";

// These run under jsdom, where the Tauri internals are absent, so the module
// is exercised through its browser-fallback path (isTauri === false).

describe("environment", () => {
  it("detects that it is not running inside Tauri under jsdom", () => {
    expect(isTauri).toBe(false);
  });
});

describe("dirOf", () => {
  it("returns the directory portion of an absolute path", () => {
    expect(dirOf("/Users/me/docs/note.md")).toBe("/Users/me/docs");
    expect(dirOf("/a/b.md")).toBe("/a");
  });

  it("strips just the file name at the root", () => {
    expect(dirOf("/note.md")).toBe("");
  });
});

describe("resolveImageUrl", () => {
  it("passes through absolute web/data/blob/asset URLs untouched", () => {
    for (const src of [
      "https://example.com/a.png",
      "http://example.com/a.png",
      "data:image/png;base64,AAAA",
      "blob:abc",
      "asset://localhost/x.png",
    ]) {
      expect(resolveImageUrl(src, "/docs/note.md")).toBe(src);
    }
  });

  it("leaves relative paths as-is when not running in Tauri", () => {
    expect(resolveImageUrl("assets/img.png", "/docs/note.md")).toBe("assets/img.png");
    expect(resolveImageUrl("assets/img.png", null)).toBe("assets/img.png");
  });
});

describe("browser fallbacks", () => {
  // jsdom's localStorage.clear() is flaky across versions; remove the one key
  // fileService uses instead.
  beforeEach(() => localStorage.removeItem("mdeditor-demo-doc"));

  it("chooseFolder returns a demo path", async () => {
    expect(await chooseFolder()).toBe("/demo");
  });

  it("openFolder / listTree expose a single demo markdown file", async () => {
    const fromOpen = await openFolder("/demo");
    const fromList = await listTree();
    expect(fromOpen).toEqual(fromList);
    expect(fromOpen).toHaveLength(1);
    expect(fromOpen[0]).toMatchObject({ name: "welcome.md", is_dir: false });
  });

  it("readTextFile returns the demo document by default", async () => {
    const text = await readTextFile("/demo/welcome.md");
    expect(text).toContain("Sumidown");
  });

  it("writeTextFile persists to localStorage and readTextFile reads it back", async () => {
    await writeTextFile("/demo/welcome.md", "# changed\n");
    expect(await readTextFile("/demo/welcome.md")).toBe("# changed\n");
  });
});
