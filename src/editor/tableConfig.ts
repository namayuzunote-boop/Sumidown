import type { Ctx } from "@milkdown/kit/ctx";
import { tableBlockConfig } from "@milkdown/kit/component/table-block";
import { TOOLBAR_ICONS } from "./icons";

export function configureTableBlock(ctx: Ctx) {
  ctx.update(tableBlockConfig.key, (config) => ({
    ...config,
    renderButton: (type: string) => TOOLBAR_ICONS[type] ?? config.renderButton(type as never),
  }));
}
