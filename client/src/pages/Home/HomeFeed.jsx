import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import styles from "./HomeFeed.module.scss";
import { addHistory } from "../../service/APIs";
import { formatCount, formatTimeToMonthDay } from "../../utils/fromatTime";
import { resolveMediaUrl, resolveThumbnailUrl } from "../../utils/resolveMediaUrl";

const PREVIEW_DELAY_MS = 380;
const CAROUSEL_SIZE = 5;
const CAROUSEL_INTERVAL_MS = 4500;

/** 同一时间只保留一个悬停预览 */
let activePreviewStopRef = null;

function canHoverPreview() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function openVideo(navigate, id) {
  if (
    localStorage.getItem("token") &&
    localStorage.getItem("pauseHistory") !== "1"
  ) {
    addHistory(id);
  }
  navigate(`/videoPlay?id=${id}`);
}

function Cover({ src }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <span className={styles.coverEmpty} aria-hidden="true" />;
  }

  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

function VideoCard({ video }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const stopPreviewRef = useRef(() => {});
  const [previewing, setPreviewing] = useState(false);

  const channelName = video.channel || video.author || "未知频道";
  const thumb = resolveThumbnailUrl(video.thumbnail, video.video_url);
  const videoSrc = resolveMediaUrl(video.video_url);
  const uploaded = video.uploaded_at || video.uploadedAt;
  const dateText = uploaded ? formatTimeToMonthDay(uploaded) : "";

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
    };
  }, []);

  useEffect(() => {
    if (!previewing) return undefined;

    const el = videoRef.current;
    if (!el || !videoSrc) return undefined;

    el.muted = true;
    el.playsInline = true;
    const playPromise = el.play();
    if (playPromise?.catch) {
      playPromise.catch(() => setPreviewing(false));
    }

    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [previewing, videoSrc]);

  function open() {
    stopPreview();
    openVideo(navigate, video.id);
  }

  function startPreview() {
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

  function stopPreview() {
    stopPreviewRef.current();
    if (activePreviewStopRef === stopPreviewRef) {
      activePreviewStopRef = null;
    }
  }

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={open}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
    >
      <div className={`${styles.media} ${previewing ? styles.previewing : ""}`}>
        <Cover src={thumb} />
        {previewing && videoSrc ? (
          <video
            ref={videoRef}
            className={styles.preview}
            src={videoSrc}
            muted
            playsInline
            loop
            preload="auto"
          />
        ) : null}
        <div className={styles.overlay}>
          <span className={styles.stat}>
            <Play size={14} fill="currentColor" />
            {formatCount(video.views)}
          </span>
          <span className={styles.duration}>{video.duration || "00:00"}</span>
        </div>
      </div>
      <h3 className={styles.title}>{video.title || "无标题"}</h3>
      <p className={styles.meta}>
        <span className={styles.up}>UP</span>
        <span className={styles.channel}>{channelName}</span>
        {dateText ? <span>· {dateText}</span> : null}
      </p>
    </article>
  );
}

function Carousel({ videos }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = videos.length;
  const active = videos[index] || videos[0];

  useEffect(() => {
    setIndex((current) => (current >= count ? 0 : current));
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, CAROUSEL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (!active) return null;

  function openActive() {
    openVideo(navigate, active.id);
  }

  function step(delta) {
    setIndex((current) => (current + delta + count) % count);
  }

  return (
    <section
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button type="button" className={styles.carouselHit} onClick={openActive}>
        <div
          className={styles.carouselTrack}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {videos.map((video) => (
            <div className={styles.carouselSlide} key={video.id}>
              <Cover src={resolveThumbnailUrl(video.thumbnail, video.video_url)} />
            </div>
          ))}
        </div>
        <div className={styles.carouselCaption}>
          <h3 className={styles.carouselTitle}>{active.title || "无标题"}</h3>
          <span className={styles.carouselGo}>立即前往</span>
        </div>
      </button>

      {count > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselPrev}`}
            aria-label="上一张"
            onClick={() => step(-1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselNext}`}
            aria-label="下一张"
            onClick={() => step(1)}
          >
            <ChevronRight size={22} />
          </button>
          <div className={styles.dots}>
            {videos.map((video, dotIndex) => (
              <button
                key={video.id}
                type="button"
                className={dotIndex === index ? styles.dotActive : styles.dot}
                aria-label={`第 ${dotIndex + 1} 张`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function HomeFeed({ videos }) {
  if (!videos?.length) return null;

  const slides = videos.slice(0, Math.min(CAROUSEL_SIZE, videos.length));
  const rest = videos.slice(slides.length);

  return (
    <div className={styles.grid}>
      <Carousel videos={slides} />
      {rest.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
