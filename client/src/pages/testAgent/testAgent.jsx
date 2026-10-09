import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Send,
  Sparkles,
  Square,
  Wrench,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createToolAgentConversation,
  deleteToolAgentConversation,
  getToolAgentMessages,
  listToolAgentConversations,
  runToolAgentChat,
  runToolAgentChatStream,
} from "../../service/APIs";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage";
import styles from "./testAgent.module.scss";


const STORAGE_KEY = "testagent-conversation-id";
const MAX = 20;

const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "这是 Tool Calling 练习页。我会按需要调用 search_videos / list_categories，再用真实数据回答你。试试下面的示例吧。",
  tools: [],
};

const SUGGESTIONS = [
  "站里有哪些视频分区？",
  "帮我找几个音乐相关的视频",
  "你好，你能做什么？",
  "先看看有哪些分类，再推荐游戏区热门",
];

const TITLE_COLORS = ["#5b8def", "#e879a9", "#f0a04b", "#8b7cf6", "#3db89a"];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromText(text) {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return t || "新对话";
}

function mapDbMessages(rows = []) {
  return rows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m) => String(m.content || "").trim())
    .map((m) => ({
      id: String(m.id ?? makeId()),
      role: m.role,
      content: m.content,
      tools: [],
    }));
}

function normalizeConversation(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    title: String(row.title || "新对话").trim() || "新对话",
    updateTime: row.updateTime || row.updated_at || null,
    createTime: row.createTime || row.created_at || null,
  };
}

function colorForId(id) {
  let hash = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i += 1) hash = (hash + s.charCodeAt(i) * (i + 1)) % 997;
  return TITLE_COLORS[hash % TITLE_COLORS.length];
}

/** 从完整 llm messages 里抽出本轮工具调用，方便展示 */
function extractToolSteps(llmMessages = []) {
  const steps = [];
  for (const msg of llmMessages) {
    if (msg?.role === "assistant" && Array.isArray(msg.tool_calls)) {
      for (const call of msg.tool_calls) {
        const toolMsg = llmMessages.find(
          (m) => m?.role === "tool" && m.tool_call_id === call.id
        );
        let preview = toolMsg?.content ?? "";
        try {
          const parsed = JSON.parse(preview);
          preview = JSON.stringify(parsed, null, 2);
        } catch {
          // 保持原字符串
        }
        steps.push({
          id: call.id || makeId(),
          name: call.function?.name || "unknown",
          args: call.function?.arguments || "{}",
          result: preview,
        });
      }
    }
  }
  return steps;
}

// 从工具调用中解析出视频
function parseVideosFromTool(t) {

  if (t?.name !== "search_videos")
    return

  try {
    const data = typeof t.result === "string" ? JSON.parse(t.result) : t.result
    return Array.isArray(data?.videos) ? data.videos.filter(v => v?.id) : []
  } catch {
    return []
  }

}

// 格式化播放次数
function formatViews(n) {
  const num = Number(n) || 0
  if (num >= 10000)
    return `${(num / 100000).toFixed(1)}万次播放`
  return `${num}次播放`
}

const TestAgent = memo(() => {


  const navigate = useNavigate()
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([WELCOME]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);


  const conversationIdRef = useRef(null);
  // ⏸暂停对话
  const abortRef = useRef(null)



  // 暂停对话的函数
  function stopGenerating() {
    abortRef.current?.abort()
  }


  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])


  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const refreshSessions = useCallback(async () => {
    const data = await listToolAgentConversations({ limit: 40 });
    const list = (data?.conversations || [])
      .map(normalizeConversation)
      .filter(Boolean);
    setSessions(list);
    return list;
  }, []);

  const activateSession = useCallback((id, historyRows) => {
    localStorage.setItem(STORAGE_KEY, id);
    setConversationId(id);
    const history = mapDbMessages(historyRows || []);
    setMessages(history.length ? history : [WELCOME]);
    setInput("");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function ensureConversation(list) {
      const created = await createToolAgentConversation("新对话");
      const item = normalizeConversation(created);
      if (!item) throw new Error("创建会话失败：未返回 id");
      if (cancelled) return null;
      setSessions([item, ...(list || []).filter((s) => s.id !== item.id)]);
      activateSession(item.id, []);
      return item.id;
    }

    async function boot() {
      setBooting(true);
      try {
        let list = [];
        try {
          list = await refreshSessions();
        } catch (error) {
          if (isRequestCanceled(error)) return;
          // 列表失败不阻断：仍可新建
          console.warn("list conversations failed:", error);
        }
        if (cancelled) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const data = await getToolAgentMessages(saved);
            if (cancelled) return;
            activateSession(saved, data?.messages || []);
            // 若不在列表里，补一条
            const exists = list.some((s) => s.id === saved);
            if (!exists && data?.conversation) {
              const item = normalizeConversation(data.conversation);
              if (item) setSessions((prev) => [item, ...prev.filter((s) => s.id !== item.id)]);
            }
            return;
          } catch (error) {
            if (isRequestCanceled(error)) return;
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        if (list.length > 0) {
          const first = list[0];
          try {
            const data = await getToolAgentMessages(first.id);
            if (cancelled) return;
            activateSession(first.id, data?.messages || []);
            return;
          } catch (error) {
            if (isRequestCanceled(error)) return;
          }
        }

        await ensureConversation(list);
      } catch (error) {
        if (isRequestCanceled(error)) return;
        toast.error(getRequestErrorMessage(error, "初始化会话失败"));
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [activateSession, refreshSessions]);

  const canSend = useMemo(
    () =>
      Boolean(String(input).trim()) &&
      !busy &&
      !booting &&
      !switching &&
      Boolean(conversationId),
    [input, busy, booting, switching, conversationId]
  );

  async function ask(text) {
    const content = String(text || "").trim();
    if (!content || busy || booting || switching) return;

    let activeId = conversationId;
    if (!activeId) {
      try {
        const created = await createToolAgentConversation("新对话");
        const item = normalizeConversation(created);
        activeId = item?.id;
        if (!activeId) throw new Error("创建会话失败");
        setSessions((prev) => [item, ...prev.filter((s) => s.id !== item.id)]);
        activateSession(activeId, []);
      } catch (error) {
        toast.error(getRequestErrorMessage(error, "创建会话失败"));
        return;
      }
    }

    const userMsg = { id: makeId(), role: "user", content, tools: [] };
    const apiMessages = [...messages, userMsg]
      .filter((m) => m.id !== "welcome" && !m.isError)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-MAX);

    // 仅原地更新标题，不改列表顺序（排序只在进页时做）
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        const isDefault =
          !s.title || s.title === "新对话" || s.title === "工具 Agent 对话";
        if (!isDefault) return s;
        return { ...s, title: titleFromText(content) };
      })
    )


    const assistantId = makeId()

    setInput("")
    setBusy(true)
    setMessages((prev) => [...prev, userMsg, {
      id: assistantId,
      role: "assistant",
      content: "",
      tools: []
    }])

    abortRef?.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {

      await runToolAgentChatStream(apiMessages, activeId, {
        signal: ac.signal,
        onEvent: (evt) => {
          if (conversationIdRef.current !== activeId)
            return
          if (evt?.type === "delta" && evt.content) {
            setMessages((prev) => {
              return prev.map(m => m.id === assistantId ? { ...m, content: m.content + evt.content } : m)
            })

            return
          }

          if (evt?.type === "tool_start") {
            setMessages((prev) => {
              return prev.map((m) => {
                if (m.id !== assistantId)
                  return m
                const tools = m.tools || []
                if (tools.some(t => t.id === evt.id))
                  return m
                return {
                  ...m,
                  tools: [
                    ...tools,
                    {
                      id: evt.id || makeId(),
                      name: evt.name || "unknown",
                      args: evt.args || "{}",
                      result: "执行中....."
                    }
                  ]
                }
              })
            })

            return
          }

          if (evt?.type === "tool_result") {
            setMessages((prev) => {
              return prev.map((m) => {
                if (m.id !== assistantId)
                  return m
                const tools = m.tools || []
                const nextItem = {
                  id: evt.id || makeId(),
                  name: evt.name || "unknown",
                  args: evt.args || "{}",
                  result: evt.result || ""
                }

                const idx = tools.findIndex(t => t.id === evt.id)
                if (idx === -1) {
                  return { ...m, tools: [...tools, nextItem] }
                }

                const nextTools = tools.slice()
                nextTools[idx] = { ...tools[idx], ...nextItem }
                return { ...m, tools: nextTools }
              })
            })

            return
          }

          if (evt?.type === "error" && evt.content) {
            toast.error(evt.content);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || evt.content, isError: true }
                  : m
              )
            );
          }


        }
      })

      if (conversationIdRef.current !== activeId)
        return

      setMessages((prev) =>
        prev.map(m =>
          m.id === assistantId && !String(m.content || "").trim()
            ? { ...m, content: "(模型没有返回文字)" } : m
        )
      )

    } catch (error) {
      if (isRequestCanceled(error)) {
        // 主动停止：保留已生成文字，不要 toast
      } else if (conversationIdRef.current !== activeId) {
        // 已切会话
      } else {
        const msg = getRequestErrorMessage(error, "Agent调用失败");
        toast.error(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, isError: true } : m
          )
        );
      }
    } finally {

      abortRef.current = null
      setBusy(false)
      requestAnimationFrame(() => inputRef.current?.focus())

    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  }

  async function handleNewSession() {
    if (booting || switching) return;

    stopGenerating()   //暂停旧会话
    setSwitching(true);
    try {
      const created = await createToolAgentConversation("新对话");
      const item = normalizeConversation(created);
      if (!item) throw new Error("创建会话失败");
      setSessions((prev) => [item, ...prev.filter((s) => s.id !== item.id)]);
      activateSession(item.id, []);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "新建会话失败"));
    } finally {
      setSwitching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function handleSwitchSession(id) {
    if (!id || id === conversationId || booting || switching) return;
    stopGenerating() //暂停旧的会话
    setSwitching(true);
    try {
      const data = await getToolAgentMessages(id);
      activateSession(id, data?.messages || []);
      // 原地刷新标题等信息，不调整顺序
      if (data?.conversation) {
        const item = normalizeConversation(data.conversation);
        if (item) {
          setSessions((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, ...item } : s))
          );
        }
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(getRequestErrorMessage(error, "切换会话失败"));
    } finally {
      setSwitching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }


  function openDeleteDialog(e, id) {
    e.stopPropagation();
    if (!id || booting || switching || deleting) return;
    setPendingDeleteId(id);
  }

  // 删除会话
  async function confirmDeleteSession() {
    const id = pendingDeleteId;
    if (!id || deleting) return;

    if (id === conversationId) stopGenerating();
    setDeleting(true);
    try {
      await deleteToolAgentConversation(id);

      const nextList = sessions.filter((s) => s.id !== id);
      setSessions(nextList);
      setPendingDeleteId(null);

      if (id !== conversationId) return;

      localStorage.removeItem(STORAGE_KEY);

      if (nextList[0]) {
        const data = await getToolAgentMessages(nextList[0].id);
        activateSession(nextList[0].id, data?.messages || []);
        return;
      }

      const created = await createToolAgentConversation("新对话");
      const item = normalizeConversation(created);
      if (!item) throw new Error("创建会话失败");
      setSessions([item]);
      activateSession(item.id, []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(getRequestErrorMessage(error, "删除会话失败"));
    } finally {
      setDeleting(false);
    }
  }

  const pendingTitle =
    sessions.find((s) => s.id === pendingDeleteId)?.title || "这条对话";

  return (
    <>
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <button
          type="button"
          className={styles.newBtn}
          onClick={handleNewSession}
          disabled={booting || switching}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          开启新对话
        </button>

        <div className={styles.sideLabel}>最近</div>

        <div className={styles.sessionList}>
          {sessions.length === 0 && !booting ? (
            <p className={styles.sideEmpty}>还没有会话</p>
          ) : null}

          {sessions.map((s) => {
            const active = s.id === conversationId;
            return (
              <div
                key={s.id}
                className={`${styles.sessionItem} ${active ? styles.sessionActive : ""}`}
              >
                <button
                  type="button"
                  className={styles.sessionMain}
                  onClick={() => handleSwitchSession(s.id)}
                  disabled={booting || switching}
                  title={s.title}
                >
                  <span
                    className={styles.sessionIcon}
                    style={{ background: colorForId(s.id) }}
                    aria-hidden
                  >
                    <MessageSquare size={12} strokeWidth={2.25} />
                  </span>
                  <span className={styles.sessionTitle}>{s.title}</span>
                </button>
                <button
                  type="button"
                  className={styles.sessionDel}
                  onClick={(e) => openDeleteDialog(e, s.id)}
                  disabled={booting || switching || deleting}
                  aria-label="删除会话"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Sparkles size={18} />
            </div>
            <div>
              <h1>工具 Agent 实验室</h1>
              <p>
                对接 /api/testchat/agent · 会话已落库
                {conversationId
                  ? ` · ${conversationId.slice(0, 8)}…`
                  : booting
                    ? " · 初始化中…"
                    : ""}
              </p>
            </div>
          </div>
        </header>

        <div className={styles.list} ref={listRef}>
          {(booting || switching) && (
            <div className={styles.typing}>
              <Loader2 size={16} className={styles.spin} />
              {booting ? "正在恢复会话…" : "正在切换会话…"}
            </div>
          )}

          {!switching &&
            messages.map((m) => (
              <article
                key={m.id}
                className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant
                  } ${m.isError ? styles.error : ""}`}
              >
                <div className={styles.meta}>
                  {m.role === "user" ? (
                    "你"
                  ) : (
                    <>
                      <Bot size={14} /> 助手
                    </>
                  )}
                </div>
                <div className={styles.content}>{m.content}</div>

                {m.tools?.length > 0 && (
                  <div className={styles.tools}>
                    {m.tools.map((t) => {
                      const videos = parseVideosFromTool(t);
                      return (
                        <div key={t.id}>
                          <details className={styles.toolCard}>
                            <summary>
                              <Wrench size={14} />
                              <span>{t.name}</span>
                              <code>{t.args}</code>
                            </summary>
                            <pre>{t.result}</pre>
                          </details>
                          {videos?.length > 0 && (
                            <div className={styles.videoCards}>
                              {videos.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={styles.videoCard}
                                  onClick={() => navigate(`/videoPlay?id=${v.id}`)}
                                >
                                  <span className={styles.videoPlayIcon}>
                                    <Play size={14} fill="currentColor" />
                                  </span>
                                  <span className={styles.videoMeta}>
                                    <strong>{v.title || "无标题"}</strong>
                                    <small>
                                      {v.channel || "未知频道"} · {formatViews(v.views)}
                                    </small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}

          {busy && !booting && !switching && (
            <div className={styles.typing}>
              <Loader2 size={16} className={styles.spin} />
              正在思考 / 调用工具…
            </div>
          )}
        </div>

        {!busy && !booting && !switching && messages.length <= 2 && (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form className={styles.composer} onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="问问站内视频或分区… Enter 发送，Shift+Enter 换行"
            rows={2}
            disabled={busy || booting || switching || !conversationId}
          />
          {busy ? (
            <button
              type="button"
              onClick={stopGenerating}
              aria-label="停止生成"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" disabled={!canSend} aria-label="发送">
              <Send size={18} />
            </button>
          )}
        </form>
      </div>
    </div>

    <Dialog
      open={Boolean(pendingDeleteId)}
      onOpenChange={(open) => {
        if (!open && !deleting) setPendingDeleteId(null);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>删除这条对话？</DialogTitle>
          <DialogDescription>
            「{pendingTitle}」里的消息会一起删掉，且无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => setPendingDeleteId(null)}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={confirmDeleteSession}
          >
            {deleting ? "删除中…" : "删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
});

TestAgent.displayName = "TestAgent";

export default TestAgent;
