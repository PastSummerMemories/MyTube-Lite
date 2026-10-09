import React, { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { likeVideo } from "../../service/APIs";
import { resolveMediaUrl, resolveThumbnailUrl } from "../../utils/resolveMediaUrl";
import { formatCount, formatFeedTime } from "../../utils/fromatTime";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import styles from "./SubscriptionFeedCard.module.scss";

const SubscriptionFeedCard = memo(function SubscriptionFeedCard(props) {
  const {
    id,
    title,
    views,
    likes,
    duration,
    uploaded_at,
    thumbnail,
    video_url,
    channel,
    channel_avatar,
    author,
    comment_count,
  } = props;

  const navigate = useNavigate();
  const [likeCount, setLikeCount] = useState(Number(likes) || 0);
  const [likeBusy, setLikeBusy] = useState(false);

  const channelName = channel || author || "未知频道";
  const avatarSrc = resolveMediaUrl(channel_avatar);
  const thumbSrc = resolveThumbnailUrl(thumbnail, video_url);

  function goPlay() {
    navigate(`/videoPlay?id=${id}`);
  }

  async function handleShare(e) {
    e.stopPropagation();
    const url = `${window.location.origin}/videoPlay?id=${id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  function handleComment(e) {
    e.stopPropagation();
    navigate(`/videoPlay?id=${id}`);
  }

  async function handleLike(e) {
    e.stopPropagation();
    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再点赞");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const res = await likeVideo(id);
      if (typeof res?.likes === "number") {
        setLikeCount(res.likes);
      } else if (res?.action === "liked") {
        setLikeCount((n) => n + 1);
      } else if (res?.action === "unliked") {
        setLikeCount((n) => Math.max(0, n - 1));
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("点赞失败");
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.user}>
          <div className={styles.avatar}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="" />
            ) : (
              <span>{channelName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className={styles.userMeta}>
            <div className={styles.channelName}>{channelName}</div>
            <div className={styles.timeLine}>
              {formatFeedTime(uploaded_at)}
              <span className={styles.dot}>·</span>
              投稿了视频
            </div>
          </div>
        </div>
      </header>

      <button type="button" className={styles.body} onClick={goPlay}>
        <div className={styles.thumbWrap}>
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className={styles.thumb} loading="lazy" />
          ) : (
            <div className={styles.thumbPlaceholder} />
          )}
          {duration && <span className={styles.duration}>{duration}</span>}
        </div>
        <div className={styles.videoMeta}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 5v14l11-7L8 5z"
                />
              </svg>
              {formatCount(views)}
            </span>
            <span className={styles.stat}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
                />
              </svg>
              {formatCount(comment_count)}
            </span>
          </div>
        </div>
      </button>

      <footer className={styles.footer}>
        <button type="button" className={styles.action} onClick={handleShare}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
            />
          </svg>
          <span>分享</span>
        </button>
        <button type="button" className={styles.action} onClick={handleComment}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
            />
          </svg>
          <span>{formatCount(comment_count)}</span>
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={handleLike}
          disabled={likeBusy}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
            />
          </svg>
          <span>{formatCount(likeCount)}</span>
        </button>
      </footer>
    </article>
  );
});

export default SubscriptionFeedCard;
