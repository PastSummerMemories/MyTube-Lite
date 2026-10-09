/**
 * 仅主内容区淡入淡出：由 MainLayout 注册，RouteTransition 在跳转时调用。
 * 顶栏 / 侧栏不在此范围内。
 */

let controller = null;

export function bindContentFade(next) {
  controller = next;
}

export function unbindContentFade(current) {
  if (!current || controller === current) {
    controller = null;
  }
}

export function hasContentFade() {
  return Boolean(controller);
}

/** @returns {Promise<void>} */
export async function contentFadeLeave() {
  if (controller?.leave) await controller.leave();
}

/** @returns {Promise<void>} */
export async function contentFadeEnter() {
  if (controller?.enter) await controller.enter();
}

/** 浏览器后退等到达后的短揭示 */
export async function contentFadeReveal() {
  if (controller?.reveal) await controller.reveal();
  else await contentFadeEnter();
}
