import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getMySubscriptions,
  getSubscriptionFeed,
  unsubscribeChannel,
} from "../../service/APIs";
import SubscriptionFeedCard from "../../componets/SubscriptionFeedCard/SubscriptionFeedCard";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softGoLogin } from "../../utils/softNavigate";
import { useScrollToBottom } from "../../hooks/useScrollBottom";
import styles from "./Subscriptions.module.scss";

function mergeVideos(prev, incoming) {
  const ids = new Set(prev.map((v) => v.id));
  const unique = incoming.filter((v) => !ids.has(v.id));
  return unique.length ? [...prev, ...unique] : prev;
}

const Subscriptions = memo(() => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState("");
  const [videos, setVideos] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const activeChannelRef = useRef("");

  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const res = await getMySubscriptions({ skipLoading: true });
      setChannels(Array.isArray(res) ? res : []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setChannels([]);
      toast.error("加载订阅频道失败");
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const fetchFeed = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    fetchingRef.current = true;
    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
      setHasMore(true);
      setFeedLoading(true);
    }

    const page = pageRef.current;
    const channelId = activeChannelRef.current;

    try {
      const result = await getSubscriptionFeed(
        {
          page,
          limit: 12,
          ...(channelId ? { channel_id: channelId } : {}),
        },
        { skipLoading: true }
      );

      const list = Array.isArray(result?.videos) ? result.videos : [];
      setVideos((prev) => (reset ? list : mergeVideos(prev, list)));
      hasMoreRef.current = Boolean(result?.hasMore);
      setHasMore(Boolean(result?.hasMore));
      pageRef.current = page + 1;
    } catch (error) {
      if (isRequestCanceled(error)) return;
      if (reset) setVideos([]);
      toast.error("加载订阅动态失败");
    } finally {
      fetchingRef.current = false;
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchChannels();
  }, [token, fetchChannels]);

  useEffect(() => {
    if (!token) return;
    activeChannelRef.current = activeChannelId;
    setVideos([]);
    fetchFeed(true);
  }, [token, activeChannelId, fetchFeed]);

  useScrollToBottom(() => fetchFeed(false), 80, [
    videos.length,
    feedLoading,
    hasMore,
  ]);

  function handleSelectChannel(id) {
    setActiveChannelId((prev) => (String(prev) === String(id) ? "" : String(id)));
  }

  async function handleUnsubscribe(channel) {
    setBusyId(channel.id);
    try {
      await unsubscribeChannel(channel.id);
      setChannels((prev) => prev.filter((item) => item.id !== channel.id));
      if (String(activeChannelId) === String(channel.id)) {
        setActiveChannelId("");
      } else {
        activeChannelRef.current = activeChannelId;
        setVideos([]);
        fetchFeed(true);
      }
      toast.success(`已取消订阅「${channel.name}」`);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(error.response?.data?.message || "取消订阅失败");
    } finally {
      setBusyId(null);
    }
  }

  const activeChannel = channels.find(
    (c) => String(c.id) === String(activeChannelId)
  );

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.guest}>
          <div className={styles.guestIcon}>
            <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM8 16V4h12v12H8ZM4 20V6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2H4Zm13-10-5-3v6l5-3Z"
              />
            </svg>
          </div>
          <h1>登录后查看订阅</h1>
          <p>登录即可同步你关注的频道与最新视频</p>
          <button type="button" onClick={() => softGoLogin()}>
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>订阅</h1>
            <p className={styles.pageDesc}>
              {channelsLoading
                ? "加载中..."
                : channels.length
                  ? `来自 ${channels.length} 个频道的最新动态`
                  : "还没有订阅频道"}
            </p>
          </div>
        </header>

        {channels.length > 0 && (
          <section className={styles.channelRail} aria-label="订阅频道">
            <button
              type="button"
              className={`${styles.channelChip} ${!activeChannelId ? styles.channelChipActive : ""}`}
              onClick={() => setActiveChannelId("")}
            >
              <span className={styles.chipAvatarAll}>全部</span>
              <span className={styles.chipName}>全部</span>
            </button>

            {channels.map((channel) => {
              const avatarSrc = resolveMediaUrl(channel.avatar);
              const active = String(activeChannelId) === String(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  className={`${styles.channelChip} ${active ? styles.channelChipActive : ""}`}
                  onClick={() => handleSelectChannel(channel.id)}
                  title={channel.name}
                >
                  <span className={styles.chipAvatar}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" />
                    ) : (
                      <span>{channel.name?.charAt(0)?.toUpperCase() || "C"}</span>
                    )}
                  </span>
                  <span className={styles.chipName}>{channel.name}</span>
                </button>
              );
            })}
          </section>
        )}

        {activeChannel && (
          <div className={styles.filterBar}>
            <div className={styles.filterInfo}>
              <strong>{activeChannel.name}</strong>
              <span>的动态</span>
            </div>
            <button
              type="button"
              className={styles.unsubBtn}
              disabled={busyId === activeChannel.id}
              onClick={() => handleUnsubscribe(activeChannel)}
            >
              {busyId === activeChannel.id ? "…" : "取消订阅"}
            </button>
          </div>
        )}

        <div className={styles.content}>
          {!channelsLoading && channels.length === 0 && (
            <div className={styles.empty}>
              <p>订阅频道后，这里会显示它们的投稿动态</p>
              <button type="button" onClick={() => navigate("/")}>
                去发现视频
              </button>
            </div>
          )}

          {channels.length > 0 && !feedLoading && videos.length === 0 && (
            <div className={styles.empty}>
              <p>
                {activeChannel
                  ? `「${activeChannel.name}」还没有上传视频`
                  : "订阅的频道暂时没有新动态"}
              </p>
              <button type="button" onClick={() => navigate("/")}>
                去首页看看
              </button>
            </div>
          )}

          <div className={styles.feedList}>
            {videos.map((item) => (
              <SubscriptionFeedCard key={item.id} {...item} />
            ))}
          </div>

          {feedLoading && <p className={styles.feedStatus}>正在加载动态…</p>}
          {!feedLoading && videos.length > 0 && !hasMore && (
            <p className={styles.feedStatus}>已经到底了</p>
          )}
        </div>
      </div>
    </div>
  );
});

export default Subscriptions;
