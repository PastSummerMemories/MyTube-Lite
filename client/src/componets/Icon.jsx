import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NavBar.module.scss";

/** Mytube Lite 原创品牌标（非 YouTube 商标） */
const Icon = memo(() => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={styles.brandBtn}
      aria-label="Mytube Lite 首页"
      onClick={() => navigate("/")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        focusable="false"
        aria-hidden="true"
        className={styles.brandMark}
      >
        <rect width="28" height="28" rx="6" fill="#c24b3a" />
        <path d="M10.6 8.4v11.2L20.2 14 10.6 8.4Z" fill="#fff7f5" />
      </svg>
      <span className={styles.brandText}>
        Mytube <em>Lite</em>
      </span>
    </button>
  );
});

export default Icon;
