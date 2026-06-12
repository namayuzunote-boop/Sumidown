import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from "@milkdown/kit/core";
import { commonmark, imageSchema } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { indent } from "@milkdown/kit/plugin/indent";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { tableBlock } from "@milkdown/kit/component/table-block";
import {
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
  isInTable,
} from "@milkdown/kit/prose/tables";
import { diagram } from "@milkdown/plugin-diagram";
import { math } from "@milkdown/plugin-math";
import { $prose, $view } from "@milkdown/kit/utils";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { diagramView } from "./diagramView";
import { mathBlockView } from "./mathBlockView";
import { configureTableBlock } from "./tableConfig";
import { resolveImageUrl, saveImage, dirOf } from "../services/fileService";
import "katex/dist/katex.min.css";

export interface MilkdownEditorHandle {
  /** Index of the top-level block containing the cursor (for view switching). */
  getBlockIndex: () => number | null;
}

interface Props {
  filePath: string | null;
  initialValue: string;
  /** Top-level block index to restore the cursor to after mount. */
  initialBlockIndex?: number | null;
  onChange: (markdown: string) => void;
}

const TABLE_ACTIONS: { label: string; title: string; run: typeof deleteTable }[] = [
  { label: "↑行", title: "上に行を追加", run: addRowBefore },
  { label: "↓行", title: "下に行を追加", run: addRowAfter },
  { label: "←列", title: "左に列を追加", run: addColumnBefore },
  { label: "→列", title: "右に列を追加", run: addColumnAfter },
  { label: "行✕", title: "行を削除", run: deleteRow },
  { label: "列✕", title: "列を削除", run: deleteColumn },
  { label: "表✕", title: "表を削除", run: deleteTable },
];

/**
 * WYSIWYG Markdown editor.
 * Remounted (via React key) whenever the file changes, so initialValue
 * is only read at mount time.
 */
const MilkdownEditor = forwardRef<MilkdownEditorHandle, Props>(function MilkdownEditor(
  { filePath, initialValue, initialBlockIndex, onChange },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [inTable, setInTable] = useState(false);

  useImperativeHandle(ref, () => ({
    getBlockIndex: () => {
      const editor = editorRef.current;
      if (!editor) return null;
      try {
        const view = editor.ctx.get(editorViewCtx);
        return view.state.selection.$from.index(0);
      } catch (e) {
        console.warn("getBlockIndex failed:", e);
        return null;
      }
    },
  }));

  const runTableAction = (run: typeof deleteTable) => {
    const editor = editorRef.current;
    if (!editor) return;
    const view = editor.ctx.get(editorViewCtx);
    run(view.state, view.dispatch);
    view.focus();
  };

  useEffect(() => {
    if (!rootRef.current) return;
    let editor: Editor | undefined;
    let destroyed = false;

    // Resolve relative image paths against the open file, and save
    // pasted image data to ./assets next to the document.
    const imagePastePlugin = $prose(
      () =>
        new Plugin({
          key: new PluginKey("image-paste"),
          props: {
            handlePaste: (view, event) => {
              const items = event.clipboardData?.items;
              if (!items || !filePath) return false;
              for (const item of items) {
                if (!item.type.startsWith("image/")) continue;
                const file = item.getAsFile();
                if (!file) continue;
                event.preventDefault();
                const ext = (item.type.split("/")[1] || "png").replace("jpeg", "jpg");
                const name = `img-${Date.now()}.${ext}`;
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = String(reader.result).split(",")[1];
                  try {
                    await saveImage(dirOf(filePath), name, base64);
                    const node = imageSchema
                      .type(editor!.ctx)
                      .create({ src: `assets/${name}` });
                    const tr = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(tr);
                  } catch (e) {
                    console.error("image paste failed:", e);
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
              return false;
            },
          },
        }),
    );

    // Render <img> with a WebView-loadable URL while keeping the
    // markdown source relative.
    const imageView = $view(imageSchema.node, () => (node) => {
      const img = document.createElement("img");
      img.src = resolveImageUrl(node.attrs.src, filePath);
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      return { dom: img };
    });

    // Drives the contextual table toolbar.
    const tableWatchPlugin = $prose(
      () =>
        new Plugin({
          key: new PluginKey("table-watch"),
          view: () => ({
            update: (view: EditorView) => setInTable(isInTable(view.state)),
          }),
        }),
    );

    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, rootRef.current);
        ctx.set(defaultValueCtx, initialValue);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prev) => {
          if (markdown !== prev) onChangeRef.current(markdown);
        });
        configureTableBlock(ctx);
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(cursor)
      .use(indent)
      .use(listener)
      .use(tableBlock)
      .use(diagram)
      .use(diagramView)
      .use(math)
      .use(mathBlockView)
      .use(imagePastePlugin)
      .use(imageView)
      .use(tableWatchPlugin)
      .create()
      .then((instance) => {
        if (destroyed) {
          instance.destroy();
          return;
        }
        editor = instance;
        editorRef.current = instance;
        if (initialBlockIndex != null) {
          restoreCursorToBlock(instance, initialBlockIndex);
        }
      })
      .catch((e) => console.error("editor init failed:", e));

    return () => {
      destroyed = true;
      editorRef.current = null;
      editor?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="editor-container">
      {inTable && (
        <div className="table-toolbar">
          {TABLE_ACTIONS.map(({ label, title, run }) => (
            <button
              key={label}
              title={title}
              onMouseDown={(e) => {
                e.preventDefault(); // keep editor selection
                runTableAction(run);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="editor-root" ref={rootRef} />
    </div>
  );
});

/** Put the cursor at the start of the Nth top-level block. */
function restoreCursorToBlock(editor: Editor, blockIndex: number) {
  try {
    const view = editor.ctx.get(editorViewCtx);
    const doc = view.state.doc;
    const index = Math.max(0, Math.min(blockIndex, doc.childCount - 1));
    let targetPos = 1;
    doc.forEach((_child, childOffset, i) => {
      if (i === index) targetPos = childOffset + 1;
    });
    const selection = TextSelection.near(doc.resolve(targetPos));
    view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
    view.focus();
  } catch (e) {
    console.warn("cursor restore failed:", e);
  }
}

export default MilkdownEditor;
