import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, EditorSelection } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export interface SourceViewHandle {
  /** Current cursor offset in the markdown source. */
  getCursorOffset: () => number | null;
}

interface Props {
  initialValue: string;
  /** Offset to place the cursor at after mount (e.g. from the WYSIWYG view). */
  initialCursorOffset?: number | null;
  onChange: (value: string) => void;
}

/** Raw markdown source editor (toggled from the WYSIWYG view). */
const SourceView = forwardRef<SourceViewHandle, Props>(function SourceView(
  { initialValue, initialCursorOffset, onChange },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    getCursorOffset: () => viewRef.current?.state.selection.main.head ?? null,
  }));

  useEffect(() => {
    if (!rootRef.current) return;
    const view = new EditorView({
      parent: rootRef.current,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          basicSetup,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__cmView = view;

    if (initialCursorOffset != null) {
      const offset = Math.min(Math.max(0, initialCursorOffset), view.state.doc.length);
      view.dispatch({
        selection: EditorSelection.cursor(offset),
        effects: EditorView.scrollIntoView(offset, { y: "center" }),
      });
    }
    view.focus();

    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="source-root" ref={rootRef} />;
});

export default SourceView;
