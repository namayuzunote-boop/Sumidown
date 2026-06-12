import katex from "katex";
import { mathBlockSchema } from "@milkdown/plugin-math";
import { $view } from "@milkdown/kit/utils";
import type { Node } from "@milkdown/kit/prose/model";

/**
 * Block math ($$...$$) rendered in KaTeX display mode, with the same
 * click-to-edit behaviour as diagrams.
 */
export const mathBlockView = $view(mathBlockSchema.node, () => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement("div");
    dom.dataset.type = "math_block";
    dom.contentEditable = "false";

    const preview = document.createElement("div");
    preview.className = "math-preview";
    const editArea = document.createElement("textarea");
    editArea.className = "math-code";
    editArea.spellcheck = false;
    dom.append(preview, editArea);

    let code: string = initialNode.attrs.value ?? "";
    let editing = false;

    const render = (source: string) => {
      if (!source.trim()) {
        preview.innerHTML = `<span class="diagram-placeholder">空の数式(クリックして編集)</span>`;
        return;
      }
      try {
        katex.render(source, preview, { displayMode: true, throwOnError: false });
      } catch {
        preview.textContent = source;
      }
    };

    const commit = () => {
      const pos = getPos();
      if (pos == null) return;
      const node = view.state.doc.nodeAt(pos);
      if (!node || node.type.name !== "math_block") return;
      if (node.attrs.value === editArea.value) return;
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, value: editArea.value }),
      );
    };

    const enterEdit = () => {
      if (editing || !view.editable) return;
      editing = true;
      dom.classList.add("editing");
      editArea.value = code;
      editArea.style.height = `${Math.max(50, code.split("\n").length * 22 + 20)}px`;
      editArea.focus();
    };

    const exitEdit = () => {
      if (!editing) return;
      editing = false;
      dom.classList.remove("editing");
      commit();
    };

    preview.addEventListener("click", enterEdit);
    editArea.addEventListener("blur", exitEdit);
    editArea.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        editArea.blur();
      }
      e.stopPropagation();
    });
    editArea.addEventListener("input", () => render(editArea.value));

    render(code);

    return {
      dom,
      update: (node: Node) => {
        if (node.type.name !== "math_block") return false;
        const next = node.attrs.value ?? "";
        if (next !== code) {
          code = next;
          if (!editing) render(code);
        }
        return true;
      },
      stopEvent: (e: Event) => editing && e.target === editArea,
      ignoreMutation: () => true,
      destroy: () => preview.removeEventListener("click", enterEdit),
    };
  };
});
