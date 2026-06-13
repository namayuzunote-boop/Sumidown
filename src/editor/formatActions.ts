import type { Editor, CmdKey } from "@milkdown/kit/core";
import { editorViewCtx } from "@milkdown/kit/core";
import {
  wrapInHeadingCommand,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
  insertHrCommand,
  bulletListSchema,
} from "@milkdown/kit/preset/commonmark";
import { insertTableCommand } from "@milkdown/kit/preset/gfm";
import { insertDiagramCommand } from "@milkdown/plugin-diagram";
import { mathBlockSchema } from "@milkdown/plugin-math";
import { setBlockType, wrapIn } from "@milkdown/kit/prose/commands";
import { callCommand } from "@milkdown/kit/utils";
import { TOOLBAR_ICONS } from "./icons";

/**
 * Toggle the current list item into a task-list item (or back to a plain
 * bullet) by wrapping in a bullet list and flipping the `checked` attr.
 * Milkdown's gfm preset has no dedicated command for this, so it operates
 * directly on the ProseMirror state (mirrors wrapInTaskListInputRule).
 */
function insertTaskList(editor: Editor) {
  const view = editor.ctx.get(editorViewCtx);
  const { state } = view;
  const $from = state.selection.$from;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth).type.name !== "list_item") depth--;

  if (depth > 0) {
    // Already inside a list item: toggle its checked attr.
    const node = $from.node(depth);
    const pos = $from.before(depth);
    const checked = node.attrs.checked == null ? false : null;
    view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked }));
    view.focus();
    return;
  }

  // Not in a list: wrap in a bullet list, then mark the new item as a task.
  const wrapped = wrapIn(bulletListSchema.type(editor.ctx))(state, (tr) => {
    view.dispatch(tr);
  });
  if (!wrapped) return;

  const after = view.state;
  const $pos = after.selection.$from;
  let itemDepth = $pos.depth;
  while (itemDepth > 0 && $pos.node(itemDepth).type.name !== "list_item") itemDepth--;
  if (itemDepth > 0) {
    const node = $pos.node(itemDepth);
    const pos = $pos.before(itemDepth);
    view.dispatch(after.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: false }));
  }
  view.focus();
}

/** Insert an empty math block ($$ ... $$) by turning the current block into one. */
function insertMathBlock(editor: Editor) {
  const view = editor.ctx.get(editorViewCtx);
  const { state, dispatch } = view;
  setBlockType(mathBlockSchema.type(editor.ctx), { value: "" })(state, dispatch);
  view.focus();
}

export interface FormatAction {
  icon: string;
  label: string;
  title: string;
  run: (editor: Editor) => void;
}

/**
 * Run a Milkdown command registered via `$command` and refocus the editor.
 * `getKey` is called lazily (on click), since the command plugins attach
 * their `.key` only once the editor has loaded them - reading `.key` at
 * module-eval time (when FORMAT_ACTIONS is built) would capture `undefined`.
 */
function runCommand<T>(getKey: () => CmdKey<T>, payload?: T) {
  return (editor: Editor) => {
    editor.action(callCommand(getKey(), payload));
    editor.ctx.get(editorViewCtx).focus();
  };
}

/** Buttons for the format-insertion toolbar shown above the WYSIWYG editor. */
export const FORMAT_ACTIONS: FormatAction[] = [
  { icon: TOOLBAR_ICONS.h1, label: "見出し1", title: "見出し1", run: runCommand(() => wrapInHeadingCommand.key, 1) },
  { icon: TOOLBAR_ICONS.h2, label: "見出し2", title: "見出し2", run: runCommand(() => wrapInHeadingCommand.key, 2) },
  { icon: TOOLBAR_ICONS.h3, label: "見出し3", title: "見出し3", run: runCommand(() => wrapInHeadingCommand.key, 3) },
  { icon: TOOLBAR_ICONS.bold, label: "太字", title: "太字", run: runCommand(() => toggleStrongCommand.key) },
  { icon: TOOLBAR_ICONS.italic, label: "斜体", title: "斜体", run: runCommand(() => toggleEmphasisCommand.key) },
  { icon: TOOLBAR_ICONS.bullet_list, label: "箇条書き", title: "箇条書きリスト", run: runCommand(() => wrapInBulletListCommand.key) },
  { icon: TOOLBAR_ICONS.ordered_list, label: "番号付き", title: "番号付きリスト", run: runCommand(() => wrapInOrderedListCommand.key) },
  { icon: TOOLBAR_ICONS.task_list, label: "タスク", title: "タスクリスト", run: insertTaskList },
  { icon: TOOLBAR_ICONS.blockquote, label: "引用", title: "引用", run: runCommand(() => wrapInBlockquoteCommand.key) },
  { icon: TOOLBAR_ICONS.code_block, label: "コード", title: "コードブロック", run: runCommand(() => createCodeBlockCommand.key) },
  { icon: TOOLBAR_ICONS.table, label: "表", title: "表を挿入", run: runCommand(() => insertTableCommand.key, { row: 3, col: 3 }) },
  { icon: TOOLBAR_ICONS.diagram, label: "図", title: "Mermaid図を挿入", run: runCommand(() => insertDiagramCommand.key) },
  { icon: TOOLBAR_ICONS.math, label: "数式", title: "数式ブロックを挿入", run: insertMathBlock },
  { icon: TOOLBAR_ICONS.hr, label: "区切り線", title: "水平線", run: runCommand(() => insertHrCommand.key) },
];
