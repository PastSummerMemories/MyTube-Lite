import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Captions,
  CaptionsOff,
  Maximize,
  Minimize,
  Pause,
  Play,
  RectangleHorizontal,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import DanmuJs from "danmu.js";
import { parseVideoUrl } from "./parseVideoUrl";
import styles from "./VideoPlayer2.module.scss";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

async function requestFs(el) {
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
}

async function exitFs() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
}

const VideoPlayer2 = memo(
  forwardRef(function VideoPlayer2(
    {
      video_url,
      thumbnail,
      videoId,
      danmakuEnabled = true,
      danmuComments = [],
      qualities: qualitiesProp,
      onSendDanmaku,
    },
    ref
  ) {
    const rootRef = useRef(null);
    const videoRef = useRef(null);
    const layerRef = useRef(null);
    const danmuRef = useRef(null);
    const hideTimerRef = useRef(null);
    const seekingRef = useRef(false);

    const media = useMemo(
      () => parseVideoUrl(video_url, thumbnail, qualitiesProp),
      [video_url, thumbnail, qualitiesProp]
    );

    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [browserFs, setBrowserFs] = useState(false);
    const [theater, setTheater] = useState(false);
    const [danmakuOn, setDanmakuOn] = useState(true);
    const [qualityId, setQualityId] = useState(media?.qualities?.[0]?.id || "");
    const [qualityOpen, setQualityOpen] = useState(false);
    const [fsText, setFsText] = useState("");
    const [fsSending, setFsSending] = useState(false);

    const qualities = media?.qualities || [];
    const activeQuality =
      qualities.find((q) => q.id === qualityId) || qualities[0];
    const expanded = browserFs || theater;

    useEffect(() => {
      if (!media?.qualities?.length) return;
      setQualityId((prev) =>
        media.qualities.some((q) => q.id === prev)
          ? prev
          : media.qualities[0].id
      );
    }, [media]);

    const showControls = useCallback(() => {
      setControlsVisible(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        if (!videoRef.current?.paused) setControlsVisible(false);
        setQualityOpen(false);
      }, 2800);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getCurrentTime: () => videoRef.current?.currentTime ?? 0,
        setDanmakuVisible: (visible) => {
          setDanmakuOn(Boolean(visible));
          danmuRef.current?.setOpacity?.(visible ? 1 : 0);
        },
        pushDanmaku: (item) => {
          if (!item || !danmuRef.current) return;
          danmuRef.current.sendComment(item);
        },
        togglePlay: () => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        },
      }),
      []
    );

    // 弹幕：挂在播放器容器层，随浏览器/网页全屏一起走
    useEffect(() => {
      if (!videoId || !danmakuEnabled) return undefined;
      const video = videoRef.current;
      const layer = layerRef.current;
      if (!video || !layer) return undefined;

      const comments = danmuComments ?? [];
      const danmuInstance = new DanmuJs({
        container: layer,
        player: video,
        comments,
        defaultOff: false,
        area: { start: 0, end: 0.85 },
        channelSize: 40,
      });
      danmuRef.current = danmuInstance;
      danmuInstance.start();
      danmuInstance.setOpacity(danmakuOn ? 1 : 0);
      if (video.paused) danmuInstance.pause();

      const onPause = () => danmuInstance.pause();
      const onPlay = () => danmuInstance.play();
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);

      return () => {
        video.removeEventListener("pause", onPause);
        video.removeEventListener("play", onPlay);
        danmuInstance.stop();
        danmuRef.current = null;
      };
      // danmakuOn 不放依赖：显隐用 setOpacity，避免整实例重建
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, danmakuEnabled, danmuComments]);

    useEffect(() => {
      danmuRef.current?.setOpacity?.(danmakuOn ? 1 : 0);
    }, [danmakuOn]);

    // 全屏/网页全屏后通知弹幕层重算尺寸
    useEffect(() => {
      const resizeDanmu = () => {
        const inst = danmuRef.current;
        if (!inst) return;
        if (typeof inst.resize === "function") inst.resize();
        else if (typeof inst.update === "function") inst.update();
      };
      const onFsChange = () => {
        const fsEl = getFullscreenElement();
        setBrowserFs(Boolean(fsEl && fsEl === rootRef.current));
        window.setTimeout(resizeDanmu, 50);
      };
      document.addEventListener("fullscreenchange", onFsChange);
      document.addEventListener("webkitfullscreenchange", onFsChange);
      window.addEventListener("resize", resizeDanmu);
      return () => {
        document.removeEventListener("fullscreenchange", onFsChange);
        document.removeEventListener("webkitfullscreenchange", onFsChange);
        window.removeEventListener("resize", resizeDanmu);
      };
    }, []);

    useEffect(() => {
      if (theater) {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.setTimeout(() => {
          const inst = danmuRef.current;
          if (typeof inst?.resize === "function") inst.resize();
        }, 50);
        return () => {
          document.body.style.overflow = prev;
        };
      }
      return undefined;
    }, [theater]);

    useEffect(() => {
      return () => {
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      };
    }, []);

    const togglePlay = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
      showControls();
    }, [showControls]);

    const seekToRatio = useCallback((ratio) => {
      const v = videoRef.current;
      if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
      const next = Math.min(Math.max(ratio, 0), 1) * v.duration;
      v.currentTime = next;
      setCurrent(next);
    }, []);

    const onProgressPointer = useCallback(
      (e) => {
        const bar = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - bar.left) / bar.width;
        seekToRatio(ratio);
        showControls();
      },
      [seekToRatio, showControls]
    );

    const toggleMute = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = !v.muted;
      setMuted(v.muted);
      showControls();
    }, [showControls]);

    const onVolumeChange = useCallback(
      (e) => {
        const v = videoRef.current;
        if (!v) return;
        const next = Number(e.target.value);
        v.volume = next;
        v.muted = next === 0;
        setVolume(next);
        setMuted(v.muted);
        showControls();
      },
      [showControls]
    );

    const toggleBrowserFs = useCallback(async () => {
      const root = rootRef.current;
      if (!root) return;
      try {
        if (getFullscreenElement() === root) {
          await exitFs();
        } else {
          if (theater) setTheater(false);
          await requestFs(root);
        }
      } catch {
        // 部分环境禁用 Fullscreen API，可退回网页全屏
        setTheater((t) => !t);
      }
      showControls();
    }, [theater, showControls]);

    const toggleTheater = useCallback(() => {
      if (getFullscreenElement()) {
        exitFs().catch(() => {});
      }
      setTheater((t) => !t);
      showControls();
    }, [showControls]);

    const switchQuality = useCallback(
      (q) => {
        const v = videoRef.current;
        if (!v || !q?.src) return;
        const wasPlaying = !v.paused;
        const t = v.currentTime;
        setQualityId(q.id);
        setQualityOpen(false);
        const onLoaded = () => {
          v.currentTime = t;
          if (wasPlaying) v.play().catch(() => {});
          v.removeEventListener("loadedmetadata", onLoaded);
        };
        v.addEventListener("loadedmetadata", onLoaded);
        v.src = q.src;
        v.load();
        showControls();
      },
      [showControls]
    );

    const handleFsSend = useCallback(
      async (e) => {
        e.preventDefault();
        const text = fsText.trim();
        if (!text || !onSendDanmaku || fsSending) return;
        setFsSending(true);
        try {
          await onSendDanmaku(text);
          setFsText("");
        } finally {
          setFsSending(false);
        }
      },
      [fsText, onSendDanmaku, fsSending]
    );

    useEffect(() => {
      const onKey = (e) => {
        if (!rootRef.current) return;
        const tag = e.target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        const inPlayer =
          rootRef.current.contains(document.activeElement) ||
          rootRef.current.matches(":hover") ||
          expanded;
        if (!inPlayer) return;

        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "f":
            e.preventDefault();
            toggleBrowserFs();
            break;
          case "t":
            e.preventDefault();
            toggleTheater();
            break;
          case "escape":
            if (theater) {
              e.preventDefault();
              setTheater(false);
            }
            break;
          case "m":
            e.preventDefault();
            toggleMute();
            break;
          case "arrowright": {
            const v = videoRef.current;
            if (!v) break;
            v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
            showControls();
            break;
          }
          case "arrowleft": {
            const v = videoRef.current;
            if (!v) break;
            v.currentTime = Math.max(0, v.currentTime - 5);
            showControls();
            break;
          }
          default:
            break;
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [
      expanded,
      theater,
      togglePlay,
      toggleBrowserFs,
      toggleTheater,
      toggleMute,
      showControls,
    ]);

    if (!media || !activeQuality) {
      return <div className={styles.placeholder}>加载视频中...</div>;
    }

    const playedPct =
      duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
    const bufferedPct =
      duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

    return (
      <div
        ref={rootRef}
        className={`${styles.player} ${theater ? styles.theater : ""}`}
        tabIndex={0}
        onMouseMove={showControls}
        onMouseLeave={() => {
          if (!videoRef.current?.paused) setControlsVisible(false);
          setQualityOpen(false);
        }}
        onDoubleClick={toggleBrowserFs}
      >
        <video
          ref={videoRef}
          className={styles.video}
          src={activeQuality.src}
          poster={media.posterUrl || undefined}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onPlay={() => {
            setPlaying(true);
            showControls();
          }}
          onPause={() => {
            setPlaying(false);
            setControlsVisible(true);
          }}
          onTimeUpdate={() => {
            if (seekingRef.current) return;
            const v = videoRef.current;
            if (!v) return;
            setCurrent(v.currentTime);
            if (v.buffered.length > 0) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }
          }}
          onLoadedMetadata={() => {
            const v = videoRef.current;
            if (!v) return;
            setDuration(v.duration || 0);
          }}
          onVolumeChange={() => {
            const v = videoRef.current;
            if (!v) return;
            setVolume(v.volume);
            setMuted(v.muted);
          }}
        />

        <div ref={layerRef} className={styles.danmakuLayer} aria-hidden="true" />

        {!playing && (
          <button
            type="button"
            className={styles.centerPlay}
            aria-label="播放"
            onClick={togglePlay}
          >
            <Play size={28} fill="currentColor" />
          </button>
        )}

        <div
          className={`${styles.controls} ${
            controlsVisible || !playing ? styles.controlsVisible : ""
          }`}
        >
          <div
            className={styles.progressWrap}
            onClick={onProgressPointer}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(current)}
            aria-label="播放进度"
          >
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBuffered}
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className={styles.progressPlayed}
                style={{ width: `${playedPct}%` }}
              />
            </div>
          </div>

          <div className={styles.row}>
            <button
              type="button"
              className={styles.btn}
              aria-label={playing ? "暂停" : "播放"}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>

            <div className={styles.volumeWrap}>
              <button
                type="button"
                className={styles.btn}
                aria-label={muted || volume === 0 ? "取消静音" : "静音"}
                onClick={toggleMute}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <input
                className={styles.volumeSlider}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={onVolumeChange}
                aria-label="音量"
              />
            </div>

            <span className={styles.time}>
              {formatTime(current)} / {formatTime(duration)}
            </span>

            {expanded && typeof onSendDanmaku === "function" ? (
              <form className={styles.fsDanmaku} onSubmit={handleFsSend}>
                <input
                  className={styles.fsInput}
                  value={fsText}
                  maxLength={200}
                  placeholder="发个弹幕吧"
                  onChange={(e) => setFsText(e.target.value)}
                  onFocus={showControls}
                />
                <button
                  type="submit"
                  className={styles.fsSend}
                  disabled={fsSending || !fsText.trim()}
                >
                  发送
                </button>
              </form>
            ) : (
              <div className={styles.spacer} />
            )}

            <button
              type="button"
              className={styles.btn}
              aria-pressed={danmakuOn}
              aria-label={danmakuOn ? "关闭弹幕" : "开启弹幕"}
              title={danmakuOn ? "关闭弹幕" : "开启弹幕"}
              onClick={() => setDanmakuOn((v) => !v)}
            >
              {danmakuOn ? <Captions size={18} /> : <CaptionsOff size={18} />}
            </button>

            <div className={styles.menuWrap}>
              <button
                type="button"
                className={styles.btn}
                aria-label="清晰度"
                aria-expanded={qualityOpen}
                onClick={() => {
                  setQualityOpen((o) => !o);
                  showControls();
                }}
              >
                <Settings2 size={16} />
                {activeQuality.label}
              </button>
              {qualityOpen && (
                <div className={styles.menu} role="menu">
                  {qualities.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={q.id === activeQuality.id}
                      className={`${styles.menuItem} ${
                        q.id === activeQuality.id ? styles.menuItemActive : ""
                      }`}
                      onClick={() => switchQuality(q)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.btn}
              aria-pressed={theater}
              aria-label={theater ? "退出网页全屏" : "网页全屏"}
              title="网页全屏 (T)"
              onClick={toggleTheater}
            >
              <RectangleHorizontal size={18} />
            </button>

            <button
              type="button"
              className={styles.btn}
              aria-label={browserFs ? "退出全屏" : "全屏"}
              title="全屏 (F)"
              onClick={toggleBrowserFs}
            >
              {browserFs ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    );
  })
);

export default VideoPlayer2;
