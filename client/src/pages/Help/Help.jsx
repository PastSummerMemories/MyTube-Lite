import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Account/accountPage.module.scss";

const FAQ = [
  {
    q: "如何观看视频？",
    a: "在首页浏览推荐内容，点击封面即可进入播放页。也可使用顶部搜索框或智能搜索 Agent 按关键词查找。",
  },
  {
    q: "Shorts 和普通视频有什么区别？",
    a: "Shorts 是竖屏短视频流，支持上下滑动切换；普通视频在播放页横屏观看，并带有推荐列表与评论区。",
  },
  {
    q: "如何上传自己的视频？",
    a: "登录后进入「我的 → 上传」，选择视频文件并填写标题、分区等信息。未手动选封面时，会自动截取首帧作为封面。",
  },
  {
    q: "收藏夹怎么用？",
    a: "在播放页点击收藏，可将视频（含 Shorts）保存到收藏夹；可在「我的 → 收藏夹」中筛选与管理。",
  },
  {
    q: "智能搜索 Agent 能做什么？",
    a: "在侧边栏打开 Agent，用自然语言描述想找的内容。它会区分闲聊与检索意图，并在站内搜索视频或 Shorts。",
  },
  {
    q: "忘记密码怎么办？",
    a: "当前版本需在登录状态下通过「设置」修改密码。若无法登录，请通过反馈页联系我们协助处理。",
  },
];

const Help = memo(() => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>帮助</h1>
        <p>常用问题与功能说明，帮你更快上手</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>快捷入口</h2>
        <p className={styles.sectionDesc}>跳转到常用功能</p>
        <div className={styles.linkRow}>
          <button type="button" className={styles.linkChip} onClick={() => navigate("/")}>
            首页
          </button>
          <button type="button" className={styles.linkChip} onClick={() => navigate("/Mine")}>
            我的
          </button>
          <button type="button" className={styles.linkChip} onClick={() => navigate("/Mine/Upload")}>
            上传视频
          </button>
          <button type="button" className={styles.linkChip} onClick={() => navigate("/Agent")}>
            智能搜索
          </button>
          <button type="button" className={styles.linkChip} onClick={() => navigate("/Feedback")}>
            提交反馈
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>常见问题</h2>
        <p className={styles.sectionDesc}>点击问题展开说明</p>
        <div className={styles.faqList}>
          {FAQ.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary className={styles.faqSummary}>{item.q}</summary>
              <div className={styles.faqBody}>{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
});

export default Help;
