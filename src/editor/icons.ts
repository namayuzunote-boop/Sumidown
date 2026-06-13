/** Shared SVG icon helpers for editor toolbars (format toolbar, table toolbar, sidebar). */

export const icon = (paths: string, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** Icons used by the format-insertion toolbar and the contextual table toolbar. */
export const TOOLBAR_ICONS: Record<string, string> = {
  h1: icon('<path d="M4 5v14M12 5v14M4 12h8"/><path d="M16 9.5 19 7v10"/>'),
  h2: icon(
    '<path d="M4 5v14M12 5v14M4 12h8"/><path d="M15.5 9.5a2 2 0 1 1 3.6 1.2L15 17h4.5"/>',
  ),
  h3: icon(
    '<path d="M4 5v14M12 5v14M4 12h8"/><path d="M15.5 8.5h3.5L16.5 12a2.2 2.2 0 0 1 0 4.4 2.2 2.2 0 0 1-2.6-1.4"/>',
  ),
  bold: icon(
    '<path d="M6 4h7a3.5 3.5 0 0 1 0 7H6z"/><path d="M6 11h7.5a3.5 3.5 0 0 1 0 7H6z"/>',
  ),
  italic: icon('<path d="M10 4h6M4 20h6M14 4 8 20"/>'),
  bullet_list: icon(
    '<circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none"/><path d="M10 6h10M10 12h10M10 18h10"/>',
  ),
  ordered_list: icon(
    '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M5 4v4M4 4h2M4 10h2.5L4 13h2.5"/><path d="M4 20v-1.5a1.5 1.5 0 0 1 1.5-1.5h0A1.5 1.5 0 0 1 7 18.5h0A1.5 1.5 0 0 1 5.5 20H4"/>',
  ),
  task_list: icon(
    '<rect x="4" y="4" width="6" height="6" rx="1"/><path d="M5.5 7l1.2 1.2L8.5 6"/><path d="M13 6h7M13 12h7M13 18h7"/><rect x="4" y="14" width="6" height="6" rx="1"/>',
  ),
  blockquote: icon(
    '<path d="M7 8c-2 0-3 1.5-3 3.5S5 15 7 15M17 8c-2 0-3 1.5-3 3.5S15 15 17 15"/>',
  ),
  code_block: icon('<path d="M9 8 5 12l4 4M15 8l4 4-4 4"/>'),
  table: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 16h18M9 4v16M15 4v16"/>',
  ),
  diagram: icon(
    '<rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="9" width="7" height="5" rx="1"/><rect x="3" y="15" width="7" height="5" rx="1"/><path d="M10 5.5h2a2 2 0 0 1 2 2v3.5M10 17.5h2a2 2 0 0 0 2-2v-3.5"/>',
  ),
  math: icon(
    '<path d="M5 4h6l-2 8 3 8"/><path d="M14 4h6l-3.5 4.5L20 12"/><path d="M13 18h7"/>',
  ),
  hr: icon('<path d="M4 12h16"/>'),
  trash: icon('<path d="M4 7h16M9 7V4h6v3m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>'),
  // Row icons: a wide rectangle (the row) plus a +/- sign.
  add_row: icon('<rect x="3" y="9" width="13" height="6" rx="1"/><path d="M19 9v6M16 12h6"/>'),
  delete_row: icon('<rect x="3" y="9" width="13" height="6" rx="1"/><path d="M16 12h6"/>'),
  // Column icons: a tall rectangle (the column) plus a +/- sign.
  add_col: icon('<rect x="9" y="3" width="6" height="13" rx="1"/><path d="M9 19h6M12 16v6"/>'),
  delete_col: icon('<rect x="9" y="3" width="6" height="13" rx="1"/><path d="M9 19h6"/>'),
  align_col_left: icon('<path d="M4 6h16M4 12h10M4 18h13"/>'),
  align_col_center: icon('<path d="M4 6h16M7 12h10M5 18h14"/>'),
  align_col_right: icon('<path d="M4 6h16M10 12h10M7 18h13"/>'),
  col_drag_handle: icon(
    '<circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  ),
  row_drag_handle: icon(
    '<circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/>',
  ),
};

/** Icons used by the app chrome (sidebar, toolbar). */
export const APP_ICONS: Record<string, string> = {
  new_file: icon(
    '<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M12 11v6M9 14h6"/>',
  ),
  folder: icon(
    '<path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  ),
  file: icon(
    '<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/>',
  ),
};
