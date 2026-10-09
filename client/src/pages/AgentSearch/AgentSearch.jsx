import React, { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bot,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { runSearchAgent, getAgentHealth } from "../../service/APIs";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage";
import {
  resolveMediaUrl,
  resolveThumbnailUrl,
} from "../../utils/resolveMediaUrl";
import { formatViews } from "../../utils/fromatTime";
import styles from "./AgentSearch.module.scss";

const SUGGESTIONS = [
  "你能做什么",
  "本周最火的游戏视频",
  "找一些音乐 Shorts",
  "动漫分区最新上传",
];

const SORT_LABEL = {
  relevance: "相关度",
  latest: "最新",
  views: "播放最多",
  likes: "点赞最多",
};

const DATE_LABEL = {
  today: "今天",
  week: "本周",
  month: "本月",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AgentSearch = memo(() => {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      reply:
        "你好，我是站内智能搜索助手。可以直接说「本周最火的游戏视频」或「找一些音乐 Shorts」。没有配置大模型时会用规则解析意图，搜索照常可用。",
      videos: [],
      intent: null,
      mode: "rule",
      classicSearchPath: null,
    },
  ]);

  useEffect(() => {
    let cancelled = false;
    getAgentHealth({ skipLoading: true })
      .then((res) => {
        if (cancelled) return;
        setLlmAvailable(res?.mode !== "rule");
      })
      .catch(() => {
        if (!cancelled) setLlmAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function ask(text) {
    const message = String(text || "").trim();
    if (!message || busy) return;

    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", reply: message },
    ]);

    try {
      const res = await runSearchAgent(message, { skipLoading: true });
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          reply: res?.reply || "已完成搜索。",
          videos: Array.isArray(res?.videos) ? res.videos : [],
          intent: res?.intent || null,
          mode: res?.mode || "rule",
          classicSearchPath: res?.classicSearchPath || null,
          toolsUsed: res?.toolsUsed || [],
        },
      ]);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      const msg = getRequestErrorMessage(error, "智能搜索失败，请稍后重试");
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          reply: `${msg}。也可以点下面的示例再试，或切到传统搜索。`,
          videos: [],
          intent: null,
          mode: "rule",
          classicSearchPath: "/Search",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  function openVideo(video) {
    if (!video?.id) return;
    if (video.is_short) {
      navigate(`/Shorts?id=${video.id}`);
      return;
    }
    navigate(`/videoPlay?id=${video.id}`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <Sparkles size={18} />
          </span>
          <div>
            <h1>智能搜索</h1>
            <p>自然语言找片 · 自动识别分区 / 时间 / 排序 / Shorts</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.classicLink}
          onClick={() => navigate("/Search")}
        >
          传统搜索
          <ArrowUpRight size={14} />
        </button>
      </header>

      {llmAvailable === false ? (
        <p className={styles.modeHint}>
          当前未配置大模型密钥，使用规则引擎解析意图；配置 OPENAI_API_KEY 后可自动精炼说法。
        </p>
      ) : null}

      <div ref={listRef} className={styles.thread}>
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`${styles.bubble} ${
              msg.role === "user" ? styles.user : styles.assistant
            }`}
          >
            {msg.role === "assistant" && (
              <div className={styles.avatar} aria-hidden="true">
                <Bot size={16} />
              </div>
            )}
            <div className={styles.bubbleBody}>
              <p className={styles.text}>{msg.reply}</p>

              {msg.role === "assistant" && msg.intent?.action === "search" && (
                <div className={styles.intentRow}>
                  {msg.intent.q && (
                    <span className={styles.chip}>关键词 {msg.intent.q}</span>
                  )}
                  {msg.intent.category_name && (
                    <span className={styles.chip}>
                      {msg.intent.category_name}
                    </span>
                  )}
                  {msg.intent.date && (
                    <span className={styles.chip}>
                      {DATE_LABEL[msg.intent.date] || msg.intent.date}
                    </span>
                  )}
                  {msg.intent.sort && (
                    <span className={styles.chip}>
                      {SORT_LABEL[msg.intent.sort] || msg.intent.sort}
                    </span>
                  )}
                  {msg.intent.type === "shorts" && (
                    <span className={`${styles.chip} ${styles.chipShort}`}>
                      Shorts
                    </span>
                  )}
                  <span className={styles.modeTag}>
                    {msg.mode === "llm" ? "LLM" : "规则"}
                  </span>
                </div>
              )}
              {msg.role === "assistant" &&
                (msg.intent?.action === "chat" ||
                  msg.intent?.action === "help") && (
                  <div className={styles.intentRow}>
                    <span className={styles.modeTag}>
                      {msg.intent.action === "help" ? "能力说明" : "闲聊"}
                    </span>
                    <span className={styles.modeTag}>
                      {msg.mode === "llm" ? "LLM" : "规则"}
                    </span>
                  </div>
                )}

              {msg.role === "assistant" && msg.videos?.length > 0 && (
                <div className={styles.results}>
                  {msg.videos.map((video) => {
                    const thumb = resolveThumbnailUrl(
                      video.thumbnail,
                      video.video_url
                    );
                    const avatar = resolveMediaUrl(video.channel_avatar);
                    return (
                      <button
                        key={video.id}
                        type="button"
                        className={`${styles.card} ${
                          video.is_short ? styles.cardShort : ""
                        }`}
                        onClick={() => openVideo(video)}
                      >
                        <div className={styles.thumb}>
                          {thumb ? (
                            <img src={thumb} alt="" loading="lazy" />
                          ) : (
                            <div className={styles.thumbFallback} />
                          )}
                          {video.is_short && (
                            <span className={styles.shortsBadge}>Shorts</span>
                          )}
                          {video.duration && (
                            <span className={styles.duration}>
                              {video.duration}
                            </span>
                          )}
                        </div>
                        <div className={styles.cardMeta}>
                          <h3>{video.title || "无标题"}</h3>
                          <p>
                            {avatar ? (
                              <img src={avatar} alt="" />
                            ) : null}
                            <span>
                              {video.channel || video.author || "未知频道"}
                            </span>
                            <span>·</span>
                            <span>{formatViews(video.views)}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {msg.role === "assistant" && msg.classicSearchPath && (
                <button
                  type="button"
                  className={styles.openClassic}
                  onClick={() => navigate(msg.classicSearchPath)}
                >
                  在传统搜索中打开同样条件
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </article>
        ))}

        {busy && (
          <div className={`${styles.bubble} ${styles.assistant}`}>
            <div className={styles.avatar} aria-hidden="true">
              <Bot size={16} />
            </div>
            <div className={styles.bubbleBody}>
              <p className={styles.thinking}>
                <Loader2 className={styles.spin} size={14} />
                正在解析意图并调用搜索工具…
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.composerWrap}>
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              disabled={busy}
              onClick={() => ask(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：最近一周最火的游戏视频"
            disabled={busy}
            maxLength={200}
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="发送">
            {busy ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
});

export default AgentSearch;
