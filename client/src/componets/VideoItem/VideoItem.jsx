import React, { memo, useEffect, useRef, useState } from "react";
import styles from "./VideoItem.module.scss";
import { useNavigate } from "react-router-dom";
import { addHistory } from "../../service/APIs";
import { formatViews } from "../../utils/fromatTime";
import { resolveMediaUrl, resolveThumbnailUrl } from "../../utils/resolveMediaUrl";

const PREVIEW_DELAY_MS = 380;

/** 同一时间只保留一个悬停预览（存 stop 函数的 ref） */
let activePreviewStopRef = null;

function canHoverPreview() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function ThumbPlaceholder({ size = 28 }) {
  return (
    <div className={styles.noThumb} aria-hidden="true">
      <span className={styles.noThumbIcon}>
        <svg viewBox="0 0 24 24" width={size} height={size} focusable="false">
          <path
            fill="currentColor"
            d="M8 5v14l11-7L8 5zm2.2 3.4 5.5 3.6-5.5 3.6V8.4z"
          />
        </svg>
      </span>
    </div>
  );
}

const VideoItem = memo((props) => {
  const {
    author,
    title,
    views,
    duration,
    id,
    video_url,
    thumbnail,
    channel,
    channel_avatar,
    opacity,
    plain = false,
  } = props;

  const navigate = useNavigate();
  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const stopPreviewRef = useRef(() => {});

  const resolvedThumb = resolveThumbnailUrl(thumbnail, video_url);
  const videoSrc = resolveMediaUrl(video_url);

  const [thumbSrc, setThumbSrc] = useState(resolvedThumb);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    setThumbSrc(resolvedThumb);
    setThumbFailed(false);
  }, [resolvedThumb]);

  stopPreviewRef.current = () => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setPreviewing(false);
  };

  useEffect(() => {
    return () => {
      clearTimeout(hoverTimerRef.current);
      if (activePreviewStopRef === stopPreviewRef) {
        activePreviewStopRef = null;
      }
      stopPreviewRef.current();
    };
  }, []);

  useEffect(() => {
    if (!previewing) return undefined;

    const video = videoRef.current;
    if (!video || !videoSrc) return undefined;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        setPreviewing(false);
      });
    }

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [previewing, videoSrc]);

  const avatarSrc = resolveMediaUrl(channel_avatar);
  const channelName = channel || author || "未知频道";

  function handlePreviewEnter() {
    if (!videoSrc || !canHoverPreview()) return;

    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (activePreviewStopRef && activePreviewStopRef !== stopPreviewRef) {
        activePreviewStopRef.current();
      }
      activePreviewStopRef = stopPreviewRef;
      setPreviewing(true);
    }, PREVIEW_DELAY_MS);
  }

  function handlePreviewLeave() {
    stopPreviewRef.current();
    if (activePreviewStopRef === stopPreviewRef) {
      activePreviewStopRef = null;
    }
  }

  function goToPlayPage() {
    if (opacity === "0") return;
    handlePreviewLeave();
    if (
      localStorage.getItem("token") &&
      localStorage.getItem("pauseHistory") !== "1"
    ) {
      addHistory(id);
    }
    navigate(`/videoPlay?id=${id}`);
  }

  if (opacity === "0") {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <article
      className={plain ? `${styles.videoItem} ${styles.plain}` : styles.videoItem}
      onClick={goToPlayPage}
    >
      <div
        className={`${styles.preview} ${previewing ? styles.previewPlaying : ""}`}
        onMouseEnter={handlePreviewEnter}
        onMouseLeave={handlePreviewLeave}
      >
        {thumbSrc && !thumbFailed ? (
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            className={styles.thumbImg}
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <ThumbPlaceholder />
        )}

        {previewing && videoSrc && (
          <video
            ref={videoRef}
            className={styles.previewVideo}
            src={videoSrc}
            muted
            playsInline
            loop
            preload="auto"
          />
        )}

        {!previewing && duration && (
          <span className={styles.duration}>{duration}</span>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.avatar}>
          {avatarSrc ? (
            <img src={avatarSrc} alt={channelName} />
          ) : (
            <span>{channelName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className={styles.info}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.channel}>{channelName}</p>
          <p className={styles.subInfo}>{formatViews(views)}</p>
        </div>

        <button
          type="button"
          className={styles.menu}
          aria-label="更多操作"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 0 24 24"
            width="24"
            focusable="false"
          >
            <path d="M12 4a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Z" />
          </svg>
        </button>
      </div>
    </article>
  );
});

export default VideoItem;
