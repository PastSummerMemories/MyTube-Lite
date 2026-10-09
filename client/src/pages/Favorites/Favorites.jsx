import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FolderPlus,
  MoreVertical,
  Play,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addHistory,
  createCollection,
  deleteCollection,
  getCollectionVideos,
  getMyCollections,
  removeVideoFromCollection,
} from "../../service/APIs";
import {
  formatCollectedAt,
  formatCount,
} from "../../utils/fromatTime";
import {
  resolveMediaUrl,
  resolveThumbnailUrl,
} from "../../utils/resolveMediaUrl";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softGoLogin } from "../../utils/softNavigate";
import styles from "./Favorites.module.scss";

const SORT_TABS = [
  { id: "recent", label: "最近收藏" },
  { id: "views", label: "最多播放" },
  { id: "upload", label: "最近投稿" },
];

const TYPE_TABS = [
  { id: "all", label: "全部" },
  { id: "video", label: "视频" },
  { id: "shorts", label: "Shorts" },
];

function isShortVideo(video) {
  if (!video) return false;
  if (video.is_short === true || video.is_short === 1 || video.is_short === "1") {
    return true;
  }
  return false;
}

function FolderIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
      />
    </svg>
  );
}

function PlayIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}

function CommentIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
      />
    </svg>
  );
}

const Favorites = memo(() => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const activeId = searchParams.get("id");

  const [collections, setCollections] = useState([]);
  const [videos, setVideos] = useState([]);
  const [collectionMeta, setCollectionMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [typeFilter, setTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyCollections();
      setCollections(Array.isArray(list) ? list : []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setCollections([]);
      toast.error("加载收藏夹失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (collectionId) => {
    setDetailLoading(true);
    try {
      const res = await getCollectionVideos(collectionId);
      setCollectionMeta(res?.collection || null);
      setVideos(Array.isArray(res?.videos) ? res.videos : []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setVideos([]);
      setCollectionMeta(null);
      toast.error("加载收藏夹内容失败");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchCollections();
  }, [token, fetchCollections]);

  useEffect(() => {
    if (!token || loading || collections.length === 0) return;
    if (!activeId) {
      setSearchParams({ id: String(collections[0].id) }, { replace: true });
    }
  }, [token, loading, collections, activeId, setSearchParams]);

  useEffect(() => {
    if (token && activeId) {
      fetchDetail(activeId);
      setKeyword("");
      setSortBy("recent");
      setTypeFilter("all");
      setBatchMode(false);
      setSelectedIds([]);
      setMenuOpenId(null);
    } else {
      setVideos([]);
      setCollectionMeta(null);
    }
  }, [token, activeId, fetchDetail]);

  useEffect(() => {
    if (!menuOpenId) return undefined;
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenId]);

  const shortCount = useMemo(() => {
    if (collectionMeta?.short_count != null) {
      return Number(collectionMeta.short_count) || 0;
    }
    return videos.filter(isShortVideo).length;
  }, [collectionMeta, videos]);

  const filteredVideos = useMemo(() => {
    let list = [...videos];
    if (typeFilter === "shorts") {
      list = list.filter(isShortVideo);
    } else if (typeFilter === "video") {
      list = list.filter((v) => !isShortVideo(v));
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          String(v.title || "").toLowerCase().includes(q) ||
          String(v.channel || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "views") {
      list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    } else if (sortBy === "upload") {
      list.sort(
        (a, b) =>
          new Date(b.uploaded_at || b.created_at || 0).getTime() -
          new Date(a.uploaded_at || a.created_at || 0).getTime()
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.added_at || 0).getTime() -
          new Date(a.added_at || 0).getTime()
      );
    }
    return list;
  }, [videos, keyword, sortBy, typeFilter]);

  const coverThumb = useMemo(() => {
    const first = videos[0];
    if (!first) return null;
    return resolveThumbnailUrl(first.thumbnail, first.video_url);
  }, [videos]);

  const totalViews = useMemo(() => {
    if (collectionMeta?.total_views != null) {
      return Number(collectionMeta.total_views) || 0;
    }
    return videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0);
  }, [collectionMeta, videos]);

  const activeCollection = useMemo(
    () => collections.find((c) => String(c.id) === String(activeId)),
    [collections, activeId]
  );

  async function handleCreate(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      toast.error("请输入收藏夹名称");
      return;
    }
    setCreating(true);
    try {
      const res = await createCollection(title);
      toast.success("创建成功");
      setNewTitle("");
      setShowCreate(false);
      await fetchCollections();
      if (res?.collectionId) {
        setSearchParams({ id: String(res.collectionId) });
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(error.response?.data?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCollection(collectionId, title) {
    if (!window.confirm(`确定删除收藏夹「${title}」？`)) return;
    try {
      await deleteCollection(collectionId);
      toast.success("已删除");
      const rest = collections.filter((c) => c.id !== collectionId);
      if (String(activeId) === String(collectionId)) {
        if (rest[0]) {
          setSearchParams({ id: String(rest[0].id) });
        } else {
          setSearchParams({});
        }
      }
      fetchCollections();
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("删除失败");
    }
  }

  async function handleRemoveVideo(videoId) {
    if (!activeId) return;
    try {
      await removeVideoFromCollection(Number(activeId), videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setCollections((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? { ...c, video_count: Math.max(0, Number(c.video_count || 0) - 1) }
            : c
        )
      );
      setSelectedIds((prev) => prev.filter((id) => id !== videoId));
      setMenuOpenId(null);
      toast.success("已从收藏夹移除");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("移除失败");
    }
  }

  async function handleBatchRemove() {
    if (!activeId || selectedIds.length === 0) return;
    if (!window.confirm(`确定移除选中的 ${selectedIds.length} 个视频？`)) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          removeVideoFromCollection(Number(activeId), id)
        )
      );
      const removeSet = new Set(selectedIds);
      setVideos((prev) => prev.filter((v) => !removeSet.has(v.id)));
      setCollections((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? {
                ...c,
                video_count: Math.max(
                  0,
                  Number(c.video_count || 0) - selectedIds.length
                ),
              }
            : c
        )
      );
      setSelectedIds([]);
      setBatchMode(false);
      toast.success("已移除");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("批量移除失败");
    }
  }

  function goPlay(video) {
    if (!video?.id) return;
    if (
      localStorage.getItem("token") &&
      localStorage.getItem("pauseHistory") !== "1"
    ) {
      addHistory(video.id);
    }
    if (isShortVideo(video)) {
      navigate(`/Shorts?id=${video.id}`);
      return;
    }
    navigate(`/videoPlay?id=${video.id}`);
  }

  function handlePlayAll() {
    if (filteredVideos.length === 0) {
      toast.message("当前没有可播放的视频");
      return;
    }
    goPlay(filteredVideos[0]);
  }

  function toggleSelect(videoId) {
    setSelectedIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.guest}>
          <div className={styles.guestIcon}>
            <FolderIcon size={36} />
          </div>
          <h1>登录后管理收藏夹</h1>
          <p>登录即可创建收藏夹并保存喜欢的视频</p>
          <button type="button" onClick={() => softGoLogin()}>
            登录
          </button>
        </div>
      </div>
    );
  }

  const title =
    collectionMeta?.title || activeCollection?.title || "收藏夹";
  const videoCount =
    collectionMeta?.video_count ??
    videos.length ??
    Number(activeCollection?.video_count || 0);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.pageTitle}>我的收藏</h1>
          <span className={styles.pageCount}>
            {loading ? "…" : `${collections.length} 个收藏夹`}
          </span>
        </div>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? <X size={16} /> : <FolderPlus size={16} />}
          {showCreate ? "取消" : "新建"}
        </button>
      </div>

      {showCreate && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="输入收藏夹名称"
            maxLength={100}
            disabled={creating}
            autoFocus
          />
          <button type="submit" disabled={creating || !newTitle.trim()}>
            {creating ? "创建中…" : "创建"}
          </button>
        </form>
      )}

      <div className={styles.folderTabs} role="tablist" aria-label="收藏夹">
        {!loading && collections.length === 0 && (
          <p className={styles.tabsHint}>还没有收藏夹，点击右上角新建</p>
        )}
        {collections.map((item) => {
          const active = String(item.id) === String(activeId);
          return (
            <div
              key={item.id}
              className={`${styles.folderTab} ${
                active ? styles.folderTabActive : ""
              }`}
              role="presentation"
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={styles.folderTabBtn}
                onClick={() => setSearchParams({ id: String(item.id) })}
              >
                <FolderIcon size={15} />
                <span className={styles.folderTabName}>{item.title}</span>
                <span className={styles.folderTabCount}>
                  {Number(item.video_count || 0)}
                </span>
              </button>
              <button
                type="button"
                className={styles.folderTabDelete}
                aria-label={`删除 ${item.title}`}
                title="删除收藏夹"
                onClick={() => handleDeleteCollection(item.id, item.title)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {!activeId && (
        <div className={styles.emptyMain}>
          <p>{loading ? "加载中…" : "请选择或创建一个收藏夹"}</p>
        </div>
      )}

      {activeId && (
        <>
          <header className={styles.detailHeader}>
            <div className={styles.cover}>
              {coverThumb ? (
                <img src={coverThumb} alt="" />
              ) : (
                <div className={styles.coverPlaceholder}>
                  <FolderIcon size={28} />
                </div>
              )}
            </div>

            <div className={styles.headerInfo}>
              <h2 className={styles.collectionTitle}>{title}</h2>
              <p className={styles.metaLine}>
                <span>公开</span>
                <span className={styles.dot}>·</span>
                <span>{videoCount} 个内容</span>
                {shortCount > 0 && (
                  <>
                    <span className={styles.dot}>·</span>
                    <span>{shortCount} 个 Shorts</span>
                  </>
                )}
                <span className={styles.dot}>·</span>
                <span>{formatCount(totalViews)} 次播放</span>
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.playAllBtn}
                onClick={handlePlayAll}
                disabled={detailLoading || filteredVideos.length === 0}
              >
                <Play size={15} fill="currentColor" />
                播放全部
              </button>
              {batchMode ? (
                <>
                  <button
                    type="button"
                    className={styles.batchDanger}
                    disabled={selectedIds.length === 0}
                    onClick={handleBatchRemove}
                  >
                    移除 ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    className={styles.batchBtn}
                    onClick={() => {
                      setBatchMode(false);
                      setSelectedIds([]);
                    }}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.batchBtn}
                  onClick={() => setBatchMode(true)}
                  disabled={videos.length === 0}
                >
                  批量操作
                </button>
              )}
            </div>
          </header>

          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.typeTabs} role="tablist" aria-label="内容类型">
                {TYPE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={typeFilter === tab.id}
                    className={`${styles.typeTab} ${
                      typeFilter === tab.id ? styles.typeTabActive : ""
                    }`}
                    onClick={() => setTypeFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={styles.sortTabs}>
                {SORT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${styles.sortTab} ${
                      sortBy === tab.id ? styles.sortTabActive : ""
                    }`}
                    onClick={() => setSortBy(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索当前收藏夹"
              />
            </label>
          </div>

          <div className={styles.content}>
            {detailLoading && (
              <div className={styles.emptyMain}>
                <p>加载中…</p>
              </div>
            )}

            {!detailLoading && filteredVideos.length === 0 && (
              <div className={styles.emptyMain}>
                <div className={styles.emptyIcon}>
                  <FolderIcon size={28} />
                </div>
                <p>
                  {keyword.trim()
                    ? "没有匹配的内容"
                    : typeFilter === "shorts"
                      ? "还没有收藏 Shorts"
                      : typeFilter === "video"
                        ? "还没有收藏普通视频"
                        : "这个收藏夹还是空的"}
                </p>
                {!keyword.trim() && (
                  <button type="button" onClick={() => navigate("/")}>
                    去发现视频
                  </button>
                )}
              </div>
            )}

            {!detailLoading && filteredVideos.length > 0 && (
              <div className={styles.videoGrid}>
                {filteredVideos.map((item) => {
                  const thumb = resolveThumbnailUrl(
                    item.thumbnail,
                    item.video_url
                  );
                  const channelName = item.channel || "未知频道";
                  const avatar = resolveMediaUrl(item.channel_avatar);
                  const selected = selectedIds.includes(item.id);
                  const shortItem = isShortVideo(item);

                  return (
                    <article
                      key={item.id}
                      className={`${styles.videoCard} ${
                        selected ? styles.videoCardSelected : ""
                      } ${shortItem ? styles.videoCardShort : ""}`}
                    >
                      <div
                        className={`${styles.thumbWrap} ${
                          shortItem ? styles.thumbWrapShort : ""
                        }`}
                        onClick={() => {
                          if (batchMode) {
                            toggleSelect(item.id);
                            return;
                          }
                          goPlay(item);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (batchMode) toggleSelect(item.id);
                            else goPlay(item);
                          }
                        }}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" loading="lazy" />
                        ) : (
                          <div className={styles.thumbFallback}>
                            <PlayIcon size={28} />
                          </div>
                        )}
                        {shortItem && (
                          <span className={styles.shortsBadge}>Shorts</span>
                        )}
                        <div className={styles.thumbOverlay}>
                          <span className={styles.stat}>
                            <PlayIcon size={12} />
                            {formatCount(item.views)}
                          </span>
                          <span className={styles.stat}>
                            <CommentIcon size={12} />
                            {formatCount(item.comment_count)}
                          </span>
                          {item.duration && (
                            <span className={styles.duration}>
                              {item.duration}
                            </span>
                          )}
                        </div>
                        {batchMode && (
                          <span
                            className={`${styles.check} ${
                              selected ? styles.checkOn : ""
                            }`}
                          >
                            {selected ? "✓" : ""}
                          </span>
                        )}
                      </div>

                      <h3
                        className={styles.videoTitle}
                        onClick={() => !batchMode && goPlay(item)}
                      >
                        {item.title}
                      </h3>

                      <div className={styles.videoFooter}>
                        <span className={styles.channelMeta}>
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              className={styles.channelAvatar}
                            />
                          ) : null}
                          <span className={styles.channelName}>
                            {channelName}
                          </span>
                          <span className={styles.collectedAt}>
                            {formatCollectedAt(item.added_at)}
                          </span>
                        </span>

                        {!batchMode && (
                          <div className={styles.moreWrap}>
                            <button
                              type="button"
                              className={styles.moreBtn}
                              aria-label="更多操作"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId((id) =>
                                  id === item.id ? null : item.id
                                );
                              }}
                            >
                              <MoreVertical size={15} />
                            </button>
                            {menuOpenId === item.id && (
                              <div
                                className={styles.moreMenu}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVideo(item.id)}
                                >
                                  移出收藏夹
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default Favorites;
