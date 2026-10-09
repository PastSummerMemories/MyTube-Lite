/**
 * 从请求错误里取出可展示文案，区分未登录 / 无权限 / 业务错误。
 */
export function getRequestErrorMessage(error, fallback = "操作失败，请稍后重试") {
  const status = error?.response?.status;
  if (status === 401) return "请先登录后再试";
  if (status === 403) return "没有权限执行此操作";

  const msg = error?.response?.data?.message || error?.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return fallback;
}
