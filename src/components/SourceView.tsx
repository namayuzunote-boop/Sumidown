import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

interface Props {
  initialValue: string;
  onChange: (value: string) => void;
}

/** Raw markdown source editor (toggled from the WYSIWYG view). */
export default function SourceView({ initialValue, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="source-root" ref={rootRef} />;
}
