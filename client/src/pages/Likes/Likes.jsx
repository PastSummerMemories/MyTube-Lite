import React, { memo, useCallback, useEffect, useState } from "react";
import styles from "./Likes.module.scss";
import {  getUserLikedVideos } from "../../service/APIs";
import VideoItem from "../../componets/VideoItem/VideoItem.jsx";
import { useNavigate } from "react-router-dom";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softGoLogin } from "../../utils/softNavigate";

const Likes = memo(() => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [likedVideos, setLikedVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLikedVideos = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const likes = await getUserLikedVideos()
        setLikedVideos(likes);
        setFilteredVideos(likes);
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setLikedVideos([]);
        setFilteredVideos([]);
      } finally {
        setLoading(false);
      }
    },[]
  );

  useEffect(() => {
    if (token) fetchLikedVideos();
  }, [token,fetchLikedVideos]);

  function handleSearch(e) {
    e.preventDefault()
    const filteredVideos = likedVideos.filter(item => {
      if (item.title?.toLowerCase().includes(searchValue.toLowerCase())) {
        return item;
      }
    })
    setFilteredVideos(filteredVideos);
  }




  const totalCount = filteredVideos.length || 0

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.guest}>
          <div className={styles.guestIcon}>
            <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
              />
            </svg>
          </div>
          <h1>登录后查看观看赞过的视频</h1>
          <p>登录即可同步你在各设备上的赞过的视频</p>
          <button type="button" onClick={() => softGoLogin()}>
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>赞过的视频</h1>
          <p className={styles.pageDesc}>
            {loading ? "加载中..." : `共 ${totalCount} 个视频`}
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="搜索点赞过的视频"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>

      </div>


      <div className={styles.content}>
        {!loading && totalCount === 0 && (
          <div className={styles.empty}>
            <p>暂无点赞视频</p>
            <button type="button" onClick={() => navigate("/")}>
              去发现视频
            </button>
          </div>
        )}


        <div className={styles.videoGrid}>
          {filteredVideos.map((group) => (
            <VideoItem key={`${group.id}`} {...group} />
          ))}
        </div>
      </div>

  
    </div>
  );
});

export default Likes;
