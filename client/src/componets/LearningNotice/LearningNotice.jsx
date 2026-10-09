import React, { memo, useEffect, useState } from "react";
import styles from "./LearningNotice.module.scss";

const STORAGE_KEY = "yt_clone_learning_notice_seen";

const LearningNotice = memo(function LearningNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // localStorage 不可用时仍展示一次
    }
    const timer = window.setTimeout(() => setOpen(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-notice-title"
        aria-describedby="learning-notice-desc"
      >
        <div className={styles.badge}>学习声明</div>
        <h2 id="learning-notice-title" className={styles.title}>
          本项目仅供学习交流
        </h2>
        <p id="learning-notice-desc" className={styles.desc}>
          这是一个用于学习与练习的视频网站仿写项目，不用于任何商业用途。
          请勿将本项目或其衍生内容用于商业运营、盈利或未经授权的分发。
          站内演示内容如有侵权，请联系删除。
        </p>
        <p className={styles.developer}>
          开发人员：<span>hidddenSurge_02</span>
        </p>
        <div className={styles.stack}>
          <p className={styles.stackTitle}>技术栈</p>
          <ul className={styles.stackList}>
            <li>
              <strong>前端：</strong>
              React 19、Vite 8、React Router、Redux Toolkit、Tailwind CSS、
              shadcn/ui、Axios、SCSS Modules、danmu.js、Sonner
            </li>
            <li>
              <strong>后端：</strong>
              Node.js、Express 5、MySQL、JWT、bcrypt、Multer
            </li>
            <li>
              <strong>部署：</strong>
              Vite 静态构建、nginx 反向代理
            </li>
          </ul>
        </div>
        <button type="button" className={styles.confirmBtn} onClick={dismiss}>
          我知道了
        </button>
      </div>
    </div>
  );
});

export default LearningNotice;
