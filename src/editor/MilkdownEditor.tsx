import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark, imageSchema } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { indent } from "@milkdown/kit/plugin/indent";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { tableBlock } from "@milkdown/kit/component/table-block";
import { diagram } from "@milkdown/plugin-diagram";
import { math } from "@milkdown/plugin-math";
import { $prose, $view } from "@milkdown/kit/utils";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { diagramView } from "./diagramView";
import { mathBlockView } from "./mathBlockView";
import { configureTableBlock } from "./tableConfig";
import { resolveImageUrl, saveImage, dirOf } from "../services/fileService";
import "katex/dist/katex.min.css";

interface Props {
  filePath: string | null;
  initialValue: string;
  onChange: (markdown: string) => void;
}

/**
 * WYSIWYG Markdown editor.
 * Remounted (via React key) whenever the file changes, so initialValue
 * is only read at mount time.
 */
export default function MilkdownEditor({ filePath, initialValue, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      .create()
      .then((instance) => {
        if (destroyed) {
          instance.destroy();
        } else {
          editor = instance;
        }
      })
      .catch((e) => console.error("editor init failed:", e));

    return () => {
      destroyed = true;
      editor?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="editor-root" ref={rootRef} />;
}
