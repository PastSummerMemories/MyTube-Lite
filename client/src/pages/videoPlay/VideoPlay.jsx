import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import styles from "./videoPlay.module.scss";
import VideoPlayer3 from "@/componets/VideoPlayer2/VideoPlayer3";
import { useSearchParams } from "react-router-dom";
import { Get } from "../../service";
import {
  addHistory,
  checkSubscription,
  getChannelSubscriberCount,
  getDanmaku,
  getSingleVideoDesc,
  getVideoCollectionMembership,
  getVideoLikeStatus,
  likeVideo,
  sendDanmaku,
  subscribeChannel,
  unsubscribeChannel,
} from "../../service/APIs";
import CommentArea from "../../componets/CommentArea/CommentArea";
import RightSideVideoItem from "../../componets/RightSideVideoItem/RightSideVideoItem";
import SaveToCollectionDialog from "../../componets/SaveToCollectionDialog/SaveToCollectionDialog";
import useMediaWidth from "../../hooks/useMedia";
import { formatSubscribers, formatViews } from "../../utils/fromatTime";
import { API_BASE } from "../../config";
import { toast } from "sonner"
import { isRequestCanceled } from "../../utils/isRequestCanceled"
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage"
import { softGoLogin } from "../../utils/softNavigate"


function resolveAvatarUrl(avatar) {
  if (!avatar) return null;
  return avatar.startsWith("http") ? avatar : `${API_BASE}${avatar}`;
}

const VideoPlay = memo(() => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("id");
  const [videoInfo, setVideoInfo] = useState(null);
  const [danmuComments, setDanmuComments] = useState([]);
  const [isLike, setIsLike] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [videoList, setVideoList] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const isCompact = useMediaWidth(1024);
  const playerRef = useRef(null);
  const historyAddedForRef = useRef(null);
  const [danmakuText, setDanmakuText] = useState("");
  const [danmakuVisible, setDanmakuVisible] = useState(true);
  const [sendingDanmaku, setSendingDanmaku] = useState(false);
  const [likeLoading, handleLikeLoading] = useState(false);

  useEffect(() => {
    if (!videoId) return undefined;

    const abortController = new AbortController();
    const { signal } = abortController;
    let cancelled = false;

    setVideoInfo(null);
    setVideoList([]);
    setDanmuComments([]);
    setLoadError(null);
    setIsLike(false);
    setIsInCollection(false);
    setCollectionDialogOpen(false);
    setIsSubscribed(false);
    setSubscriberCount(0);

    async function loadPageData() {
      try {
        const token = localStorage.getItem("token");
        const settled = await Promise.allSettled([
          Get(`/videos/${videoId}`, undefined, { signal, skipLoading: false }),
          Get("/videos", { page: 1, limit: 20 }, { signal, skipLoading: true }),
          getDanmaku(videoId, undefined, { signal, skipLoading: true }),
          getVideoLikeStatus(videoId, { signal, skipLoading: true }),
          token
            ? getVideoCollectionMembership(videoId, {
                signal,
                skipLoading: true,
              })
            : Promise.resolve({ isInAny: false }),
        ]);

        if (cancelled) return;

        const valueOf = (result, fallback) =>
          result.status === "fulfilled" ? result.value : fallback;

        const videoRes = valueOf(settled[0], null);
        if (!videoRes) {
          const reason = settled[0].status === "rejected" ? settled[0].reason : null;
          if (isRequestCanceled(reason)) return;
          setLoadError("视频加载失败，请稍后重试");
          return;
        }

        const listRes = valueOf(settled[1], { videos: [] });
        const danmuRes = valueOf(settled[2], { danmuJs: [] });
        const likeStatusRes = valueOf(settled[3], { isLiked: false });
        const membershipRes = valueOf(settled[4], { isInAny: false });

        setVideoInfo(videoRes);
        setVideoList(
          (listRes.videos || []).filter(
            (v) => String(v.id) !== String(videoId)
          )
        );
        setDanmuComments(danmuRes.danmuJs ?? []);
        setIsLike(likeStatusRes.isLiked ?? false);
        setIsInCollection(membershipRes?.isInAny ?? false);

        const channelId = videoRes?.channel_id;
        if (channelId) {
          const [countSettled, subSettled] = await Promise.allSettled([
            getChannelSubscriberCount(channelId, {
              signal,
              skipLoading: true,
            }),
            token
              ? checkSubscription(channelId, {
                  signal,
                  skipLoading: true,
                })
              : Promise.resolve({ isSubscribed: false }),
          ]);
          if (cancelled) return;
          setSubscriberCount(
            valueOf(countSettled, { subscriberCount: 0 })?.subscriberCount ?? 0
          );
          setIsSubscribed(
            valueOf(subSettled, { isSubscribed: false })?.isSubscribed ?? false
          );
        }

        // 历史记录失败（如 token 过期）不应阻断看视频
        if (
          token &&
          historyAddedForRef.current !== videoId &&
          localStorage.getItem("pauseHistory") !== "1"
        ) {
          try {
            await addHistory(videoId);
            historyAddedForRef.current = videoId;
          } catch (historyErr) {
            if (!isRequestCanceled(historyErr)) {
              console.warn("添加观看历史失败", historyErr);
            }
          }
        }
      } catch (err) {
        if (isRequestCanceled(err) || cancelled) return;
        setLoadError("视频加载失败，请稍后重试");
      }
    }

    loadPageData();
    window.scrollTo(0, 0);

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [videoId]);

  const qualities = useMemo(() => {
    if (!videoInfo?.video_url) return undefined;
    // 当前上传链路只有一路源；多码率就绪后替换不同 src 即可
    return [
      { id: "source", label: "原画", src: videoInfo.video_url },
      { id: "high", label: "高清", src: videoInfo.video_url },
      { id: "sd", label: "流畅", src: videoInfo.video_url },
    ];
  }, [videoInfo?.video_url]);

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{loadError}</div>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className={styles.page}>

      </div>
    );
  }

  const channelName = videoInfo.channel || videoInfo.author || "未知频道";
  const avatarSrc = resolveAvatarUrl(videoInfo.channel_avatar);
  const hasLongDesc =
    videoInfo.description && videoInfo.description.length > 120;



  const handleLikeVideo = async () => {
    try {
      if (!localStorage.getItem("token")) {
        toast.error("请先登录后再点赞", { position: "top-center" });
        return;
      }

      handleLikeLoading(true);
      const res = await likeVideo(videoId);
      setIsLike(res.action === "liked");
      setVideoInfo({ ...videoInfo, likes: res.likes });
      const result = await getSingleVideoDesc(videoId);
      setVideoInfo(result);
      if (res.action === "liked") {
        toast.success("点赞成功", { position: "top-center" });
      } else {
        toast.success("已取消点赞", { position: "top-center" });
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(getRequestErrorMessage(error, "点赞失败，请稍后重试"), {
        position: "top-center",
      });
    } finally {
      handleLikeLoading(false);
    }
  };

  const handleOpenCollectionDialog = () => {
    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再收藏", { position: "top-center" });
      return;
    }
    setCollectionDialogOpen(true);
  };

  const handleToggleSubscribe = async () => {
    const channelId = videoInfo?.channel_id;
    if (!channelId) {
      toast.error("无法获取频道信息", { position: "top-center" });
      return;
    }
    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再订阅", { position: "top-center" });
      return;
    }

    setSubLoading(true);
    try {
      const res = isSubscribed
        ? await unsubscribeChannel(channelId)
        : await subscribeChannel(channelId);
      setIsSubscribed(res?.isSubscribed ?? !isSubscribed);
      if (typeof res?.subscriberCount === "number") {
        setSubscriberCount(res.subscriberCount);
      } else {
        setSubscriberCount((n) => Math.max(0, n + (isSubscribed ? -1 : 1)));
      }
      toast.success(isSubscribed ? "已取消订阅" : "订阅成功", {
        position: "top-center",
      });
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(
        getRequestErrorMessage(error, "操作失败，请稍后重试"),
        { position: "top-center" }
      );
    } finally {
      setSubLoading(false);
    }
  };


  function handleDanmakuVisibleChange(e) {
    const checked = e.target.checked;
    setDanmakuVisible(checked);
    playerRef.current?.setDanmakuVisible(checked);
  }

  async function submitDanmaku(raw) {
    const content = String(raw || "").trim();
    if (!content) return;

    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再发弹幕", { position: "top-center" });
      softGoLogin();
      return;
    }

    const play_time = playerRef.current?.getCurrentTime() ?? 0;
    setSendingDanmaku(true);
    try {
      const res = await sendDanmaku({
        video_id: Number(videoId),
        content,
        play_time,
      });
      playerRef.current?.pushDanmaku(res.danmuJs);
      setDanmakuText("");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(getRequestErrorMessage(error, "弹幕发送失败，请稍后重试"), {
        position: "top-center",
      });
    } finally {
      setSendingDanmaku(false);
    }
  }

  async function handleSendDanmaku(e) {
    e.preventDefault();
    await submitDanmaku(danmakuText);
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${isCompact ? styles.layoutStack : ""}`}>
        <main className={styles.main}>
          <VideoPlayer3
            ref={playerRef}
            videoId={videoId}
            video_url={videoInfo.video_url}
            thumbnail={videoInfo.thumbnail}
            danmuComments={danmuComments}
            qualities={qualities}
            onSendDanmaku={submitDanmaku}
          />

          <form className={styles.danmakuBar} onSubmit={handleSendDanmaku}>
            <label className={styles.danmakuToggle}>
              <input
                type="checkbox"
                checked={danmakuVisible}
                onChange={handleDanmakuVisibleChange}
              />
              显示弹幕
            </label>
            <input
              type="text"
              className={styles.danmakuInput}
              placeholder="发个弹幕吧"
              maxLength={200}
              value={danmakuText}
              onChange={(e) => setDanmakuText(e.target.value)}
              disabled={sendingDanmaku}
            />
            <button
              type="submit"
              className={styles.danmakuSendBtn}
              disabled={sendingDanmaku || !danmakuText.trim()}
            >
              {sendingDanmaku ? "发送中..." : "发送"}
            </button>
          </form>

          <div className={styles.meta}>
            <h1 className={styles.title}>{videoInfo.title}</h1>

            <div className={styles.actionBar}>
              <div className={styles.channelRow}>
                <div className={styles.channelAvatar}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={channelName} />
                  ) : (
                    <span>{channelName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.channelInfo}>
                  <span className={styles.channelName}>{channelName}</span>
                  <span className={styles.subCount}>
                    {formatSubscribers(subscriberCount)}
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.subscribeBtn} ${isSubscribed ? styles.subscribeBtnActive : ""}`}
                  onClick={handleToggleSubscribe}
                  disabled={subLoading}
                  aria-pressed={isSubscribed}
                >
                  {subLoading ? "…" : isSubscribed ? "已订阅" : "订阅"}
                </button>
              </div>

              <div className={styles.actions}>



                <button
                  type="button"
                  className={`${styles.actionPill} ${isLike ? styles.actionPillActive : ""}`}
                  onClick={() => handleLikeVideo()}
                  disabled={likeLoading}
                >
                  {!likeLoading && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                          fill="currentColor"
                          d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
                        />
                      </svg>
                      <span>{videoInfo.likes || 0}</span>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.actionPill} ${isInCollection ? styles.actionPillActive : ""}`}
                  onClick={handleOpenCollectionDialog}
                  aria-pressed={isInCollection}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8V9zm0 3h5v2h-5v-2z"
                      />
                    </svg>
                    <span>{isInCollection ? "已收藏" : "收藏"}</span>
                  </div>
                </button>
                <button type="button" className={styles.actionPill}>
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path
                      fill="currentColor"
                      d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
                    />
                  </svg>
                  <span>分享</span>
                </button>
              </div>
            </div>

            {videoInfo.description && (
              <div
                className={`${styles.description} ${isDescExpanded ? styles.descriptionExpanded : ""}`}
              >
                <p>{videoInfo.description}</p>
                {hasLongDesc && (
                  <button
                    type="button"
                    className={styles.descToggle}
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                  >
                    {isDescExpanded ? "收起" : "展开"}
                  </button>
                )}
                <div className={styles.descMeta}>
                  {formatViews(videoInfo.views)} ·{" "}
                  {videoInfo.uploaded_at
                    ? new Date(videoInfo.uploaded_at).toLocaleDateString(
                      "zh-CN"
                    )
                    : ""}
                </div>
              </div>
            )}
          </div>

          <CommentArea videoId={videoId} />
        </main>

        {!isCompact && (
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>接下来播放</h2>
            <div className={styles.sidebarList}>
              {videoList.map((item) => (
                <RightSideVideoItem key={item.id} {...item} />
              ))}
            </div>
          </aside>
        )}
      </div>

      {isCompact && videoList.length > 0 && (
        <section className={styles.mobileRecommend}>
          <h2 className={styles.sidebarTitle}>接下来播放</h2>
          <div className={styles.sidebarList}>
            {videoList.slice(0, 8).map((item) => (
              <RightSideVideoItem key={item.id} {...item} />
            ))}
          </div>
        </section>
      )}

      <SaveToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        videoId={videoId}
        onMembershipChange={setIsInCollection}
      />
    </div>
  );
});

export default VideoPlay;
