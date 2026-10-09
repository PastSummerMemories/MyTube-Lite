import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "./Home.module.scss";
import HomeFeed from "./Home/HomeFeed";
import { Get } from "../service";
import { getCategories } from "../service/APIs";
import { useScrollToBottom } from "../hooks/useScrollBottom";
import Tags from "../componets/Tags/Tags";
import LearningNotice from "../componets/LearningNotice/LearningNotice";
import { isRequestCanceled } from "../utils/isRequestCanceled";
import { getRequestErrorMessage } from "../utils/getRequestErrorMessage";

const ALL_TAG = { id: "0", name: "全部分区" };

/** 按视口估算一页数量，避免大屏首屏撑不满无法触发滚动加载 */
function getHomePageLimit() {
  const side = window.innerWidth >= 720 ? 168 + 48 : 32;
  const contentWidth = Math.max(window.innerWidth - side, 320);
  const cols = Math.max(1, Math.floor(contentWidth / 300));
  const usableHeight = Math.max(window.innerHeight - 160, 400);
  const rows = Math.max(2, Math.ceil(usableHeight / 280) + 1);
  return Math.min(48, Math.max(12, cols * rows));
}

function mergeVideos(prev, incoming) {
  const ids = new Set(prev.map((v) => v.id));
  const unique = incoming.filter((v) => !ids.has(v.id));
  return unique.length ? [...prev, ...unique] : prev;
}

function normalizeCategoryTags(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const tags = list
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || "").trim(),
    }))
    .filter((item) => item.id && item.name);
  return [ALL_TAG, ...tags];
}

const Home = memo(() => {
  const [videoList, setVideoList] = useState([]);
  const [homeTags, setHomeTags] = useState([ALL_TAG]);
  const [categoryId, setCategoryId] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const categoryRef = useRef(categoryId);
  const reqIdRef = useRef(0);

  const fetchData = useCallback(async ({ reset = false } = {}) => {
    if (!reset && (fetchingRef.current || !hasMoreRef.current)) return;

    const reqId = ++reqIdRef.current;
    fetchingRef.current = true;
    setLoading(true);
    setError("");

    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
      setHasMore(true);
      setVideoList([]);
    }

    const page = pageRef.current;
    const cat = categoryRef.current;
    const params = { page, limit: getHomePageLimit() };
    if (cat && cat !== "0") params.category_id = cat;

    try {
      const result = await Get("/videos", params);
      if (reqId !== reqIdRef.current) return;
      const list = Array.isArray(result?.videos) ? result.videos : [];
      setVideoList((prev) => (reset ? list : mergeVideos(prev, list)));
      hasMoreRef.current = Boolean(result?.hasMore);
      setHasMore(Boolean(result?.hasMore));
      pageRef.current = page + 1;
    } catch (err) {
      if (isRequestCanceled(err)) return;
      if (reqId !== reqIdRef.current) return;
      setError(getRequestErrorMessage(err, "加载失败，请稍后重试"));
    } finally {
      if (reqId === reqIdRef.current) {
        fetchingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  function handleCategoryChange(id) {
    const next = String(id ?? "0");
    if (next === categoryRef.current) return;
    categoryRef.current = next;
    setCategoryId(next);
    fetchData({ reset: true });
  }

  // loading / 列表变化后重新检测：大屏首屏撑不满时继续拉取
  useScrollToBottom(() => fetchData({ reset: false }), 20, [
    videoList.length,
    loading,
    hasMore,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const rows = await getCategories();
        if (cancelled) return;
        setHomeTags(normalizeCategoryTags(rows));
      } catch (err) {
        if (isRequestCanceled(err) || cancelled) return;
        // 分类拉失败时仍保留「全部分区」，不阻断首页
        console.warn("load categories failed:", err);
      } finally {
        if (!cancelled) fetchData({ reset: true });
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  return (
    <div className={styles.wrapper}>
      <LearningNotice />
      <div className={styles.tagsBar}>
        <Tags
          tagList={homeTags}
          activeId={categoryId}
          sendData={handleCategoryChange}
          variant="side"
        />
      </div>
      <div className={styles.tagsSpacer} aria-hidden="true" />

      {error && videoList.length === 0 ? (
        <div className={styles.statusBox}>
          <p>{error}</p>
          <button type="button" onClick={() => fetchData({ reset: true })}>
            重新加载
          </button>
        </div>
      ) : null}

      <HomeFeed videos={videoList} />

      {!error && !loading && videoList.length === 0 ? (
        <div className={styles.statusBox}>
          <p>这个分区暂时没有视频</p>
        </div>
      ) : null}

      {error && videoList.length > 0 ? (
        <div className={styles.footerStatus}>
          <span>{error}</span>
          <button type="button" onClick={() => fetchData({ reset: false })}>
            重试
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className={styles.footerStatus}>加载中…</p>
      ) : null}

      {!loading && !error && !hasMore && videoList.length > 0 ? (
        <p className={styles.footerStatus}>已经到底了</p>
      ) : null}
    </div>
  );
});

export default Home;
