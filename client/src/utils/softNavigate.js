/**
 * 全站柔和跳转入口。实际淡入淡出由 RouteTransition 拦截 navigator 完成。
 */

let navigateFn = null;

export function bindSoftNavigate(navigate) {
  navigateFn = navigate;
}

export function unbindSoftNavigate() {
  navigateFn = null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string | { pathname?: string, search?: string, hash?: string }} to
 * @param {{ replace?: boolean, state?: unknown }} [options]
 */
export function softNavigate(to, options = {}) {
  const { replace = false, state } = options;

  if (!navigateFn) {
    const path =
      typeof to === "string"
        ? to
        : `${to?.pathname || ""}${to?.search || ""}${to?.hash || ""}`;
    if (typeof window !== "undefined") {
      if (replace) window.location.replace(path);
      else window.location.assign(path);
    }
    return Promise.resolve();
  }

  return Promise.resolve(navigateFn(to, { replace, state }));
}

/** 跳转登录页并带上回跳地址 */
export function softGoLogin(redirectPath) {
  const path =
    redirectPath ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");
  const qs = path.startsWith("/")
    ? `?redirect=${encodeURIComponent(path)}`
    : "";
  return softNavigate(`/Login${qs}`, { replace: true });
}

export { sleep };
