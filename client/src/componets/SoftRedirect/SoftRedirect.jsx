import React, { memo, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { softGoLogin } from "../../utils/softNavigate";

/**
 * 未登录占位：展示登录引导，并尽量跳到登录页。
 * 不再用空白暗色块，避免看起来像页面坏了。
 */
const SoftRedirect = memo(function SoftRedirect({ to, replace = true }) {
  const navigate = useNavigate();
  const started = useRef(false);

  useLayoutEffect(() => {
    if (started.current || !to) return;
    started.current = true;

    // 直接 navigate，避开 softNavigate 被上一次过渡卡住的情况
    const timer = window.setTimeout(() => {
      navigate(to, { replace });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [to, replace, navigate]);

  const loginPath = typeof to === "string" && to.startsWith("/Login") ? to : "/Login";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        minHeight: "50vh",
        padding: 24,
        color: "var(--text-muted)",
        textAlign: "center",
      }}
      aria-busy="true"
    >
      <p style={{ margin: 0, fontSize: 15, color: "var(--text)" }}>
        需要登录后才能访问此页面
      </p>
      <button
        type="button"
        onClick={() => {
          if (loginPath.startsWith("/Login")) {
            navigate(loginPath, { replace });
          } else {
            softGoLogin();
          }
        }}
        style={{
          padding: "10px 24px",
          border: "1px solid var(--line)",
          borderRadius: 24,
          background: "var(--brand)",
          color: "var(--brand-ink)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        去登录
      </button>
    </div>
  );
});

export default SoftRedirect;
