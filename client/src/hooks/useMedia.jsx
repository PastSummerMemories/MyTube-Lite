import { useState, useEffect } from "react";

// 自定义 Hook：判断当前窗口是否小于指定宽度
function useMediaWidth(breakpointWidth) {
  const [isLess, setIsLess] = useState(false);

  useEffect(() => {
    const checkLess = () => {
      const nowWidth = document.documentElement.clientWidth;
      setIsLess(nowWidth < breakpointWidth);
    };

    checkLess();
    window.addEventListener("resize",
      checkLess)

    return () => window.removeEventListener('resize',checkLess) 
  }, [breakpointWidth]);

  return isLess;
}

export default useMediaWidth;
