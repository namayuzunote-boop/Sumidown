import mermaid from "mermaid";
import { diagramSchema } from "@milkdown/plugin-diagram";
import { $view } from "@milkdown/kit/utils";
import type { Node } from "@milkdown/kit/prose/model";

let renderSeq = 0;

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

/**
 * Node view for ```mermaid blocks: shows the rendered SVG, and switches
 * to a code textarea with live preview when clicked (WYSIWYG editing).
 * The plugin-diagram package only ships the schema — rendering is ours.
 */
export const diagramView = $view(diagramSchema.node, () => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement("div");
    dom.dataset.type = "diagram";
    dom.contentEditable = "false";

    const preview = document.createElement("div");
    preview.className = "diagram-preview";
    const editArea = document.createElement("textarea");
    editArea.className = "diagram-code";
    editArea.spellcheck = false;
    dom.append(preview, editArea);

    let code: string = initialNode.attrs.value ?? "";
    let editing = false;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;

    const render = async (source: string) => {
      if (!source.trim()) {
        preview.innerHTML = `<span class="diagram-placeholder">空の図(クリックして編集)</span>`;
        return;
      }
      const id = `mmd-${++renderSeq}`;
      try {
        const { svg } = await mermaid.render(id, source);
        preview.innerHTML = svg;
        preview.classList.remove("diagram-error");
      } catch {
        // keep the last good SVG; mermaid may leave an orphan error element
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        preview.classList.add("diagram-error");
        if (!preview.querySelector("svg")) {
          preview.innerHTML = `<pre class="diagram-placeholder">${source.replace(/</g, "&lt;")}</pre>`;
        }
      }
    };

    const commit = () => {
      const pos = getPos();
      if (pos == null) return;
      const node = view.state.doc.nodeAt(pos);
      if (!node || node.type.name !== "diagram") return;
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
      editArea.style.height = `${Math.max(60, code.split("\n").length * 22 + 20)}px`;
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
    editArea.addEventListener("input", () => {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => render(editArea.value), 400);
    });

    render(code);

    return {
      dom,
      update: (node: Node) => {
        if (node.type.name !== "diagram") return false;
        const next = node.attrs.value ?? "";
        if (next !== code) {
          code = next;
          if (!editing) render(code);
        }
        return true;
      },
      stopEvent: (e: Event) => editing && e.target === editArea,
      ignoreMutation: () => true,
      destroy: () => {
        clearTimeout(renderTimer);
        preview.removeEventListener("click", enterEdit);
      },
    };
  };
});
