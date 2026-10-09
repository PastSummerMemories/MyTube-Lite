import React, { memo, useState } from "react";
import { toast } from "sonner";
import styles from "../Account/accountPage.module.scss";

const CATEGORIES = [
  { value: "bug", label: "功能异常 / Bug" },
  { value: "ux", label: "体验建议" },
  { value: "content", label: "内容相关" },
  { value: "other", label: "其他" },
];

const Feedback = memo(() => {
  const [category, setCategory] = useState("bug");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      toast.error("请填写标题和详细说明");
      return;
    }
    if (nextContent.length < 10) {
      toast.error("请再多写一点细节（至少 10 个字）");
      return;
    }

    setSubmitting(true);
    try {
      // 暂无反馈后端：本地记录并提示成功，便于后续对接接口
      const payload = {
        category,
        title: nextTitle,
        content: nextContent,
        contact: contact.trim(),
        createdAt: new Date().toISOString(),
      };
      const key = "yt_clone_feedbacks";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.unshift(payload);
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));

      setTitle("");
      setContent("");
      setContact("");
      setCategory("bug");
      toast.success("感谢反馈，我们已收到");
    } catch {
      toast.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>反馈</h1>
        <p>告诉我们你遇到的问题或改进想法</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>提交反馈</h2>
        <p className={styles.sectionDesc}>
          描述越具体（复现步骤、页面路径、期望结果）越有助于我们修复
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>类型</span>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>标题</span>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简要概括问题或建议"
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>详细说明</span>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：在哪个页面、做了什么操作、出现了什么现象"
              maxLength={2000}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>联系方式（可选）</span>
            <input
              className={styles.input}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="邮箱或其他联系方式，方便我们回访"
              maxLength={120}
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? "提交中…" : "提交反馈"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
});

export default Feedback;
