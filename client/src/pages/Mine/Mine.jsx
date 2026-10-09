import React, { memo, useEffect, useRef, useState } from "react";
import styles from "./Mine.module.scss";
import { useNavigate } from "react-router-dom";
import useMediaWidth from "../../hooks/useMedia.jsx";
import { getHisotry, getUserLikedVideos } from "../../service/APIs.js";
import VideoItem from "../../componets/VideoItem/VideoItem";
import { isRequestCanceled } from "../../utils/isRequestCanceled";

const QUICK_LINKS = [
  { icon: "history", label: "历史记录", path: "/Mine/History" },
  { icon: "upload", label: "上传视频", path: "/Mine/Upload" },
  { icon: "favorite", label: "收藏夹", path: "/Mine/Favorites" },
  { icon: "sub", label: "订阅", path: "/Mine/Subscriptions" },
  { icon: "like", label: "赞过的视频", path: "/Mine/Likes" },
];

const Mine = memo(() => {
  const navigate = useNavigate();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const histroyScrollRef = useRef(null);
  const likedVideosScrollRef = useRef(null);
  const isMobile = useMediaWidth(640);
  const [likedVideos, setLikedVideos] = useState([]);

  async function fetchHistories() {
    setLoading(true);
    try {
      const histories = await getHisotry({ limit: 12 });
      setHistoryList(histories.list || []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLikedVideos() {
    try {
      const list = await getUserLikedVideos({ limit: 12 });
      setLikedVideos(list || []);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setLikedVideos([]);
    }
  }

  useEffect(() => {
    fetchHistories();
    fetchLikedVideos();
  }, []);

  function handleScroll(ref, direction) {
    const el = ref.current;
    if (!el) return;
    const amount = isMobile ? 280 : 360;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div className={styles.overview}>
      <section className={styles.quickLinks}>
        {QUICK_LINKS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.quickLink}
            onClick={() => navigate(item.path)}
          >
            <span className={styles.quickLinkIcon} data-icon={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>历史记录</h2>
          <div className={styles.sectionControls}>
            <button
              type="button"
              className={styles.textBtn}
              onClick={() => navigate("/Mine/History")}
            >
              查看全部
            </button>
            {historyList.length > 0 && (
              <>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="向左滚动"
                  onClick={() => handleScroll(histroyScrollRef, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="向右滚动"
                  onClick={() => handleScroll(histroyScrollRef, 1)}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <p className={styles.hint}>加载中...</p>}

        {!loading && historyList.length === 0 && (
          <div className={styles.emptyState}>
            <p>暂无观看记录</p>
            <button type="button" onClick={() => navigate("/")}>
              去发现视频
            </button>
          </div>
        )}

        {!loading && historyList.length > 0 && (
          <div className={styles.historyScroll} ref={histroyScrollRef}>
            {historyList.map((item) => (
              <div key={item.id} className={styles.historyCard}>
                <VideoItem {...item} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>赞过的视频</h2>
          <div className={styles.sectionControls}>
            <button
              type="button"
              className={styles.textBtn}
              onClick={() => navigate("/Mine/Likes")}
            >
              查看全部
            </button>
            {likedVideos.length > 0 && (
              <>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="向左滚动"
                  onClick={() => handleScroll(likedVideosScrollRef, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="向右滚动"
                  onClick={() => handleScroll(likedVideosScrollRef, 1)}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        {!loading && likedVideos.length === 0 && (
          <div className={styles.emptyState}>
            <p>暂无点赞记录</p>
            <button type="button" onClick={() => navigate("/")}>
              去发现视频
            </button>
          </div>
        )}

        {!loading && likedVideos.length > 0 && (
          <div className={styles.historyScroll} ref={likedVideosScrollRef}>
            {likedVideos.map((item) => (
              <div key={item.id} className={styles.historyCard}>
                <VideoItem {...item} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export default Mine;
