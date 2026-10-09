import { useEffect, useRef } from "react";

function isNearBottom(offset) {
  const { scrollHeight, clientHeight, scrollTop } = document.documentElement;
  // 内容高度 ≤ 视口时 scrollHeight ≈ clientHeight，条件恒成立，
  // 正好用来在「无法滚动」时继续拉取，直到出现滚动条或没有更多数据。
  return scrollTop + clientHeight + offset >= scrollHeight;
}

/**
 * @param {() => void} callback 触底时调用（调用方需自行防重入 / 判断 hasMore）
 * @param {number} offset 距底部多少 px 算触底
 * @param {unknown[]} deps 列表长度、loading 等变化后重新检测（撑不满视口时关键）
 */
export function useScrollToBottom(callback, offset = 50, deps = []) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const check = () => {
      if (isNearBottom(offset)) {
        callbackRef.current();
      }
    };

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);

    check();
    const rafId = requestAnimationFrame(check);

    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      cancelAnimationFrame(rafId);
    };
    // deps 由调用方传入，用于内容变化后重新判断是否仍撑不满视口
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, ...deps]);
}
