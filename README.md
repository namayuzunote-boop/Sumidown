# Sumidown

**[English](README.md) | [日本語](README.ja.md)**

A lightweight, simple WYSIWYG Markdown editor. Free and MIT-licensed, built with Tauri 2.

*Sumidown* = **墨** (*sumi*, Japanese ink) + Mark**down** — like ink, what you write is fixed exactly as you see it, all the way to the printed page.

It was built to solve three recurring pain points in a coding-agent-era Markdown workflow:

1. **PDF export breaks the layout** → The PDF is printed from the very same renderer (WebView) that drives the preview, so there is no structural layout drift.
2. **You can't edit while previewing** → The editor is always WYSIWYG. Tables can be edited directly in cells plus a GUI for adding/removing rows and columns; Mermaid diagrams and math blocks are edited by clicking on them.
3. **Diagrams don't render** → Mermaid blocks (flowcharts, sequence diagrams, etc.) are rendered immediately.

## Features

- **WYSIWYG editing** (Typora-style) with a source-view toggle (⌘/)
- **GUI table editing**: edit cells directly, and add/remove/align/reorder rows and columns from hover controls
- **Mermaid diagrams**: ` ```mermaid ` code blocks render instantly; click to edit the source with a live preview
- **KaTeX math**: inline `$...$` and block `$$...$$` math (click to edit)
- **Layout-faithful PDF export** (⌘E): rendered by the same engine as the preview, then sent to the system print dialog so you can "Save as PDF". Includes `@page` margins and avoids awkward page breaks inside tables, diagrams, and code blocks
- **Single-file HTML export** with inlined CSS
- **Folder tree** sidebar to list and switch between `.md` files
- **Automatic reload on external changes**: if a coding agent (or any other tool) rewrites the file on disk, the editor picks it up automatically (a notice bar appears if you have unsaved edits)
- **Image paste**: images from the clipboard are saved into `assets/` and inserted with a relative path
- **Dark/light theme** that follows the OS setting

## Supported platforms

| OS | Status |
| --- | --- |
| **macOS** (Apple Silicon) | ✅ Tested; a `.dmg` is provided |
| macOS (Intel) | Not built yet (building from source should work, but is unverified) |
| Windows / Linux | ❌ Not supported yet. Tauri itself is cross-platform, but the current path handling is Unix-specific, so simply building it will not work. Support is planned. |

## Security

- File access is restricted to the folder the user opened, validated on the Rust side
- A strict Content Security Policy (no remote scripts)
- Mermaid renders with `securityLevel: "strict"`

## Development

Requirements: Node.js 20+, Rust (stable); on macOS, the Xcode Command Line Tools.

```bash
npm install
npm run tauri dev    # run as a desktop app
npm run dev          # browser-only UI preview (demo document)
npm run tauri build  # production build (.app / .dmg)
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| ⌘O | Open folder |
| ⌘S | Save |
| ⌘/ | Toggle source view ⇔ preview |
| ⌘E | Export PDF |

## Tech stack

- [Tauri 2](https://tauri.app/) (Rust + OS WebView, ~10 MB binary)
- [Milkdown](https://milkdown.dev/) (ProseMirror-based WYSIWYG Markdown framework)
- [Mermaid](https://mermaid.js.org/) / [KaTeX](https://katex.org/) / [CodeMirror 6](https://codemirror.net/)

## License

[MIT](LICENSE)

Sumidown is built on open-source libraries (Milkdown, Mermaid, KaTeX, CodeMirror, Tauri, and others), used as dependencies under their respective licenses. See [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) for the full list and license texts bundled with distributed binaries.
