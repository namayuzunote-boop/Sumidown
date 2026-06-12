import type { Ctx } from "@milkdown/kit/ctx";
import { tableBlockConfig } from "@milkdown/kit/component/table-block";

const icon = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS: Record<string, string> = {
  add_row: icon('<path d="M12 5v14M5 12h14"/>'),
  add_col: icon('<path d="M12 5v14M5 12h14"/>'),
  delete_row: icon('<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>'),
  delete_col: icon('<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>'),
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

export function configureTableBlock(ctx: Ctx) {
  ctx.update(tableBlockConfig.key, (config) => ({
    ...config,
    renderButton: (type: string) => ICONS[type] ?? config.renderButton(type as never),
  }));
}
