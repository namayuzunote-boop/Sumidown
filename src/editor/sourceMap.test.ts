import { describe, it, expect } from "vitest";
import { blockIndexToOffset, offsetToBlockIndex } from "./sourceMap";

// Top-level-block ⇔ source-offset mapping. This is the currency used to keep
// the cursor in place when toggling between the WYSIWYG and source views, so a
// regression here silently throws the cursor to the wrong place.

const DOC = [
  "# Heading", // block 0, offset 0
  "", //
  "First paragraph.", // block 1
  "", //
  "- a", // block 2 (list)
  "- b", //
  "", //
  "| x | y |", // block 3 (table)
  "| - | - |", //
  "| 1 | 2 |", //
].join("\n");

function offsetOf(substr: string): number {
  const i = DOC.indexOf(substr);
  if (i < 0) throw new Error(`not found: ${substr}`);
  return i;
}

describe("offsetToBlockIndex", () => {
  it("maps offsets inside each top-level block to its index", () => {
    expect(offsetToBlockIndex(DOC, offsetOf("# Heading"))).toBe(0);
    expect(offsetToBlockIndex(DOC, offsetOf("First paragraph"))).toBe(1);
    expect(offsetToBlockIndex(DOC, offsetOf("- a"))).toBe(2);
    expect(offsetToBlockIndex(DOC, offsetOf("| x | y |"))).toBe(3);
  });

  it("snaps an offset in the middle of a block to that block", () => {
    expect(offsetToBlockIndex(DOC, offsetOf("paragraph") + 3)).toBe(1);
  });

  it("returns 0 for empty input", () => {
    expect(offsetToBlockIndex("", 5)).toBe(0);
  });
});

describe("blockIndexToOffset", () => {
  it("returns the source offset where each block starts", () => {
    expect(blockIndexToOffset(DOC, 0)).toBe(offsetOf("# Heading"));
    expect(blockIndexToOffset(DOC, 1)).toBe(offsetOf("First paragraph"));
    expect(blockIndexToOffset(DOC, 3)).toBe(offsetOf("| x | y |"));
  });

  it("clamps an out-of-range index to the last block", () => {
    expect(blockIndexToOffset(DOC, 999)).toBe(offsetOf("| x | y |"));
  });

  it("round-trips: offset -> index -> offset lands on the block start", () => {
    const off = offsetOf("First paragraph");
    expect(blockIndexToOffset(DOC, offsetToBlockIndex(DOC, off))).toBe(off);
  });
});
