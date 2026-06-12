import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Maps between markdown source offsets and top-level block indexes.
 * The WYSIWYG doc's top-level children correspond ~1:1 to the mdast
 * root children, so block index is the common currency when carrying
 * the cursor across the preview/source toggle.
 */

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

function blockStarts(source: string): number[] {
  const tree = parser.parse(source);
  return tree.children
    .map((child) => child.position?.start?.offset)
    .filter((o): o is number => o != null);
}

/** Source offset of the Nth top-level block (clamped). */
export function blockIndexToOffset(source: string, index: number): number {
  const starts = blockStarts(source);
  if (starts.length === 0) return 0;
  return starts[Math.min(index, starts.length - 1)];
}

/** Index of the top-level block containing the given source offset. */
export function offsetToBlockIndex(source: string, offset: number): number {
  const starts = blockStarts(source);
  let index = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= offset) index = i;
    else break;
  }
  return index;
}
