import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { softGoLogin } from "../../utils/softNavigate";
import { toast } from "sonner";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  addHistory,
  getCommentsTree,
  getVideoCollectionMembership,
  getVideoLikeStatus,
  likeVideo,
} from "../../service/APIs";
import { Get } from "../../service";
import SaveToCollectionDialog from "../../componets/SaveToCollectionDialog/SaveToCollectionDialog";
import CommentArea from "../../componets/CommentArea/CommentArea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import useMediaWidth from "../../hooks/useMedia";
import { resolveMediaUrl, resolveThumbnailUrl } from "../../utils/resolveMediaUrl";
import { formatCount } from "../../utils/fromatTime";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import styles from "./Shorts.module.scss";

const WHEEL_COOLDOWN_MS = 520;
const SWIPE_THRESHOLD_PX = 56;
const SWIPE_MAX_HORIZONTAL = 80;

function mergeVideos(prev, incoming) {
  const ids = new Set(prev.map((v) => v.id));
  const unique = incoming.filter((v) => !ids.has(v.id));
  return unique.length ? [...prev, ...unique] : prev;
}

function resolveAvatarUrl(avatar) {
  return resolveMediaUrl(avatar);
}

const ShortSlide = memo(function ShortSlide({
  video,
  active,
  muted,
  onToggleMute,
  onLike,
  onOpenCollect,
  onOpenComments,
  likeBusy,
}) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const src = resolveMediaUrl(video.video_url);
  const poster = resolveThumbnailUrl(video.thumbnail, video.video_url);
  const avatar = resolveAvatarUrl(video.channel_avatar);
  const channelName = video.channel || video.author || "未知频道";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (active) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  const handleTogglePlay = () => {
    const el = videoRef.current;
    if (!el || !active) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  };

  return (
    <section className={styles.slide} data-short-id={video.id}>
      <div className={styles.stage}>
        <div
          className={styles.videoHit}
          onClick={handleTogglePlay}
          role="button"
          tabIndex={active ? 0 : -1}
          aria-label={paused ? "播放" : "暂停"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTogglePlay();
            }
          }}
        >
          <video
            ref={videoRef}
            className={styles.video}
            src={src || undefined}
            poster={poster || undefined}
            playsInline
            loop
            muted={muted}
            preload={active ? "auto" : "metadata"}
            draggable={false}
          />
          {paused && active && (
            <span className={styles.pauseIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="56" height="56">
                <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          )}
        </div>

        <div className={styles.meta}>
          <div className={styles.channelRow}>
            {avatar ? (
              <img className={styles.avatar} src={avatar} alt="" />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {(channelName[0] || "?").toUpperCase()}
              </span>
            )}
            <span className={styles.channelName}>@{channelName}</span>
          </div>
          <h2 className={styles.title}>{video.title || "无标题"}</h2>
        </div>

        <aside className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${video.isLiked ? styles.liked : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onLike(video);
            }}
            disabled={likeBusy}
            aria-label={video.isLiked ? "取消点赞" : "点赞"}
          >
            <Heart
              size={28}
              fill={video.isLiked ? "currentColor" : "none"}
            />
            <span>{formatCount(video.likes ?? 0)}</span>
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${video.isInCollection ? styles.saved : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCollect(video);
            }}
            aria-label="收藏"
          >
            <Bookmark
              size={28}
              fill={video.isInCollection ? "currentColor" : "none"}
            />
            <span>收藏</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(video);
            }}
            aria-label="评论"
          >
            <MessageCircle size={28} />
            <span>{formatCount(video.commentCount ?? 0)}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            <span>{muted ? "静音" : "声音"}</span>
          </button>
        </aside>
      </div>
    </section>
  );
});

function normalizeShortItem(v) {
  return {
    ...v,
    isLiked: false,
    isInCollection: false,
    commentCount:
      typeof v.commentCount === "number"
        ? v.commentCount
        : typeof v.comment_count === "number"
          ? v.comment_count
          : 0,
  };
}

const Shorts = memo(() => {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("id");
  const scrollerRef = useRef(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const historyAddedRef = useRef(new Set());
  const statusLoadedRef = useRef(new Set());
  const activeIndexRef = useRef(0);
  const videosLenRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelUnlockTimerRef = useRef(null);
  const pointerRef = useRef(null);
  const suppressClickRef = useRef(false);
  const commentsOpenRef = useRef(false);
  const commentCountLoadedRef = useRef(new Set());
  const focusDoneRef = useRef(null);
  const focusBusyRef = useRef(false);
  const initialLoadedRef = useRef(false);

  const isCompact = useMediaWidth(768);
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [collectVideoId, setCollectVideoId] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentVideoId, setCommentVideoId] = useState(null);

  activeIndexRef.current = activeIndex;
  videosLenRef.current = videos.length;
  commentsOpenRef.current = commentsOpen;

  const scrollToIndex = useCallback((index, behavior = "smooth") => {
    if (commentsOpenRef.current) return;
    const root = scrollerRef.current;
    if (!root) return;
    const len = videosLenRef.current;
    const next = Math.max(0, Math.min(index, len - 1));
    if (len <= 0) return;

    const slides = root.querySelectorAll(`.${styles.slide}`);
    const target = slides[next];
    if (!target) return;

    const top = target.offsetTop;
    root.scrollTo({ top, behavior });
    setActiveIndex(next);
  }, []);

  const goBy = useCallback(
    (delta) => {
      if (commentsOpenRef.current) return;
      scrollToIndex(activeIndexRef.current + delta);
    },
    [scrollToIndex]
  );

  const handleCommentCountChange = useCallback((videoId, count) => {
    setVideos((prev) =>
      prev.map((v) =>
        Number(v.id) === Number(videoId)
          ? { ...v, commentCount: count }
          : v
      )
    );
  }, []);

  const fetchPage = useCallback(async () => {
    if (!hasMoreRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    const page = pageRef.current;

    try {
      const result = await Get(
        "/videos/shorts",
        { page, limit: 8 },
        { skipLoading: page > 1 }
      );
      const list = Array.isArray(result?.videos) ? result.videos : [];
      const normalized = list.map(normalizeShortItem);

      setVideos((prev) => {
        const next = page === 1 ? normalized : mergeVideos(prev, normalized);
        if (page === 1 && next.length === 0) setEmpty(true);
        return next;
      });
      hasMoreRef.current = Boolean(result?.hasMore);
      pageRef.current = page + 1;
      if (page === 1) initialLoadedRef.current = true;
    } catch (error) {
      if (isRequestCanceled(error)) return;
      if (page === 1) {
        initialLoadedRef.current = true;
        setEmpty(true);
        toast.error("加载 Shorts 失败", { position: "top-center" });
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // 从收藏夹等入口带 ?id= 时，定位到对应短视频
  useEffect(() => {
    if (!focusId || focusDoneRef.current === focusId) return undefined;
    if (!initialLoadedRef.current || focusBusyRef.current) return undefined;

    let cancelled = false;

    async function focusTarget() {
      const existingIdx = videos.findIndex(
        (v) => String(v.id) === String(focusId)
      );
      if (existingIdx >= 0) {
        requestAnimationFrame(() => {
          if (cancelled) return;
          scrollToIndex(existingIdx, "auto");
          focusDoneRef.current = focusId;
        });
        return;
      }

      focusBusyRef.current = true;
      try {
        const detail = await Get(`/videos/${focusId}`, undefined, {
          skipLoading: true,
        });
        if (cancelled || !detail?.id) return;
        setVideos((prev) => {
          if (prev.some((v) => String(v.id) === String(focusId))) return prev;
          return [normalizeShortItem(detail), ...prev];
        });
        setEmpty(false);
        window.setTimeout(() => {
          if (cancelled) return;
          scrollToIndex(0, "auto");
          focusDoneRef.current = focusId;
        }, 40);
      } catch (error) {
        if (isRequestCanceled(error) || cancelled) return;
        toast.error("无法打开该 Shorts", { position: "top-center" });
        focusDoneRef.current = focusId;
      } finally {
        focusBusyRef.current = false;
      }
    }

    focusTarget();
    return () => {
      cancelled = true;
    };
  }, [focusId, videos, scrollToIndex]);

  // 滚轮 / 触控板：一次手势只切一条
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;

    const onWheel = (e) => {
      if (commentsOpenRef.current) return;
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      if (wheelLockRef.current) return;

      wheelLockRef.current = true;
      goBy(e.deltaY > 0 ? 1 : -1);

      clearTimeout(wheelUnlockTimerRef.current);
      wheelUnlockTimerRef.current = setTimeout(() => {
        wheelLockRef.current = false;
      }, WHEEL_COOLDOWN_MS);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      clearTimeout(wheelUnlockTimerRef.current);
    };
  }, [goBy, videos.length]);

  // 指针拖拽 / 触屏上下滑：超过阈值切下一条
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;

    // 点赞/收藏等真实按钮上不触发滑动；视频点击层是 div，不拦截
    const isInteractive = (target) =>
      Boolean(target?.closest?.("button, a, input, textarea"));

    const onPointerDown = (e) => {
      if (commentsOpenRef.current) return;
      if (e.button != null && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      pointerRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
    };

    const onPointerMove = (e) => {
      const p = pointerRef.current;
      if (!p || p.id !== e.pointerId) return;
      const dy = e.clientY - p.startY;
      const dx = e.clientX - p.startX;
      if (Math.abs(dy) > 10 || Math.abs(dx) > 10) p.moved = true;
    };

    const finish = (e) => {
      const p = pointerRef.current;
      if (!p || p.id !== e.pointerId) return;
      pointerRef.current = null;

      const dy = e.clientY - p.startY;
      const dx = e.clientX - p.startX;

      if (Math.abs(dx) > SWIPE_MAX_HORIZONTAL && Math.abs(dx) > Math.abs(dy)) {
        return;
      }

      if (Math.abs(dy) >= SWIPE_THRESHOLD_PX) {
        suppressClickRef.current = true;
        goBy(dy < 0 ? 1 : -1);
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 80);
      }
    };

    const onClickCapture = (e) => {
      if (!suppressClickRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", finish);
    root.addEventListener("pointercancel", finish);
    root.addEventListener("click", onClickCapture, true);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", finish);
      root.removeEventListener("pointercancel", finish);
      root.removeEventListener("click", onClickCapture, true);
    };
  }, [goBy, videos.length]);

  // 键盘上下（评论面板打开时不抢方向键）
  useEffect(() => {
    const onKeyDown = (e) => {
      if (commentsOpenRef.current) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") {
        e.preventDefault();
        goBy(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") {
        e.preventDefault();
        goBy(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBy]);

  // 滚动位置同步 activeIndex（按钮 scrollTo / 程序滚动后兜底）
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || videos.length === 0) return undefined;

    let raf = 0;
    const syncFromScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = root.scrollTop + root.clientHeight / 2;
        const slides = root.querySelectorAll(`.${styles.slide}`);
        let bestIdx = 0;
        let bestDist = Infinity;
        slides.forEach((el, idx) => {
          const center = el.offsetTop + el.offsetHeight / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });
        if (bestIdx !== activeIndexRef.current) {
          setActiveIndex(bestIdx);
        }
      });
    };

    root.addEventListener("scroll", syncFromScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", syncFromScroll);
      cancelAnimationFrame(raf);
    };
  }, [videos.length]);

  // 接近底部加载更多
  useEffect(() => {
    if (activeIndex >= videos.length - 3) {
      fetchPage();
    }
  }, [activeIndex, videos.length, fetchPage]);

  const activeVideoId = videos[activeIndex]?.id;

  // 当前片：补点赞/收藏状态 + 历史
  useEffect(() => {
    if (activeVideoId == null) return undefined;

    const videoId = activeVideoId;
    const token = localStorage.getItem("token");
    let cancelled = false;

    async function hydrate() {
      if (!statusLoadedRef.current.has(videoId)) {
        statusLoadedRef.current.add(videoId);
        try {
          const [likeRes, membershipRes] = await Promise.all([
            getVideoLikeStatus(videoId, { skipLoading: true }).catch(() => ({
              isLiked: false,
            })),
            token
              ? getVideoCollectionMembership(videoId, {
                  skipLoading: true,
                }).catch(() => ({ isInAny: false }))
              : Promise.resolve({ isInAny: false }),
          ]);
          if (cancelled) return;
          setVideos((prev) =>
            prev.map((v) =>
              Number(v.id) === Number(videoId)
                ? {
                    ...v,
                    isLiked: likeRes?.isLiked ?? false,
                    isInCollection: membershipRes?.isInAny ?? false,
                  }
                : v
            )
          );
        } catch {
          statusLoadedRef.current.delete(videoId);
        }
      }

      if (!commentCountLoadedRef.current.has(videoId)) {
        commentCountLoadedRef.current.add(videoId);
        try {
          const tree = await getCommentsTree(videoId, { skipLoading: true });
          if (cancelled) return;
          const count = Array.isArray(tree) ? tree.length : 0;
          handleCommentCountChange(videoId, count);
        } catch {
          commentCountLoadedRef.current.delete(videoId);
        }
      }

      if (
        token &&
        !historyAddedRef.current.has(videoId) &&
        localStorage.getItem("pauseHistory") !== "1"
      ) {
        try {
          await addHistory(videoId);
          historyAddedRef.current.add(videoId);
        } catch (err) {
          if (!isRequestCanceled(err)) {
            console.warn("添加观看历史失败", err);
          }
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [activeVideoId, handleCommentCountChange]);

  const handleLike = async (video) => {
    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再点赞", { position: "top-center" });
      softGoLogin();
      return;
    }
    setLikeBusy(true);
    try {
      const res = await likeVideo(video.id);
      const liked = res.action === "liked";
      setVideos((prev) =>
        prev.map((v) =>
          Number(v.id) === Number(video.id)
            ? {
                ...v,
                isLiked: liked,
                likes:
                  typeof res.likes === "number"
                    ? res.likes
                    : Math.max(0, (v.likes || 0) + (liked ? 1 : -1)),
              }
            : v
        )
      );
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("点赞失败，请稍后重试", { position: "top-center" });
    } finally {
      setLikeBusy(false);
    }
  };

  const handleOpenCollect = (video) => {
    if (!localStorage.getItem("token")) {
      toast.error("请先登录后再收藏", { position: "top-center" });
      softGoLogin();
      return;
    }
    setCollectVideoId(video.id);
    setCollectionDialogOpen(true);
  };

  const handleOpenComments = (video) => {
    setCommentVideoId(video.id);
    setCommentsOpen(true);
  };

  if (empty && videos.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>暂无 Shorts 内容</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        tabIndex={0}
        aria-label="Shorts 视频流，上下滑动切换"
      >
        {videos.map((video, index) => (
          <ShortSlide
            key={video.id}
            video={video}
            active={index === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onLike={handleLike}
            onOpenCollect={handleOpenCollect}
            onOpenComments={handleOpenComments}
            likeBusy={likeBusy}
          />
        ))}
      </div>

      <div className={styles.navBtns}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={activeIndex <= 0 || commentsOpen}
          onClick={() => scrollToIndex(activeIndex - 1)}
          aria-label="上一条"
        >
          <ChevronUp size={22} />
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={activeIndex >= videos.length - 1 || commentsOpen}
          onClick={() => scrollToIndex(activeIndex + 1)}
          aria-label="下一条"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      <SaveToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        videoId={collectVideoId}
        isShort
        onMembershipChange={(isInAny) => {
          setVideos((prev) =>
            prev.map((v) =>
              Number(v.id) === Number(collectVideoId)
                ? { ...v, isInCollection: isInAny }
                : v
            )
          );
        }}
      />

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className={styles.commentSheet}
          showCloseButton
        >
          <SheetHeader className={styles.commentSheetHeader}>
            <SheetTitle>评论</SheetTitle>
            <SheetDescription className="sr-only">
              查看并发表当前短视频的评论
            </SheetDescription>
          </SheetHeader>
          <div className={styles.commentSheetBody}>
            {commentVideoId != null && (
              <CommentArea
                key={commentVideoId}
                videoId={commentVideoId}
                compact
                hideHeading
                onCountChange={(count) =>
                  handleCommentCountChange(commentVideoId, count)
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

export default Shorts;
