/** 判断是否为 axios / AbortController 主动取消的请求 */
export function isRequestCanceled(error) {
  return error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError"
}
