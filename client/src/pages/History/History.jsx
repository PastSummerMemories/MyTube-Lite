import React, { memo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  deleteAllHistories,
  deleteHistory,
  getHisotry,
} from "../../service/APIs";
import {
  formatHistoryGroupDate,
  formatWatchedAt,
} from "../../utils/fromatTime";
import { resolveThumbnailUrl } from "../../utils/resolveMediaUrl";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softGoLogin } from "../../utils/softNavigate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import styles from "./Histories.module.scss";

const DATE_FILTERS = [
  { id: "", label: "全部" },
  { id: "today", label: "今天" },
  { id: "week", label: "本周" },
  { id: "month", label: "本月" },
];

function groupByDate(histories) {
  const grouped = {};

  histories.forEach((item) => {
    const groupDate = formatHistoryGroupDate(item.watched_at);
    if (!grouped[groupDate]) grouped[groupDate] = [];
    grouped[groupDate].push(item);
  });

  return Object.entries(grouped)
    .map(([date, list]) => ({
      date,
      list,
      sortKey: Math.max(...list.map((i) => new Date(i.watched_at).getTime())),
    }))
    .sort((a, b) => b.sortKey - a.sortKey);
}

const History = memo(() => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [historyGroups, setHistoryGroups] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pauseHistory, setPauseHistory] = useState(
    () => localStorage.getItem("pauseHistory") === "1"
  );
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistories = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const histories = await getHisotry({
          keyword: params.keyword ?? searchValue,
          date: params.date ?? dateFilter,
          limit: 100,
        });
        setHistoryGroups(groupByDate(histories.list || []));
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setHistoryGroups([]);
      } finally {
        setLoading(false);
      }
    },
    [searchValue, dateFilter]
  );

  useEffect(() => {
    if (token) fetchHistories({ date: dateFilter });
    // 仅日期筛选变化时自动刷新；搜索走表单提交
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dateFilter]);

  function handleSearch(e) {
    e.preventDefault();
    fetchHistories({ keyword: searchValue, date: dateFilter });
  }

  function handleDateFilter(id) {
    setDateFilter(id);
  }

  async function handleDeleteOk() {
    setIsDeleteModalOpen(false);
    try {
      await deleteAllHistories();
      setSearchValue("");
      await fetchHistories({ keyword: "", date: dateFilter });
      toast.success("已清空观看历史");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("清空失败");
    }
  }

  async function handleDeleteOne(videoId) {
    setDeletingId(videoId);
    try {
      await deleteHistory(videoId);
      setHistoryGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            list: group.list.filter((item) => item.id !== videoId),
          }))
          .filter((group) => group.list.length > 0)
      );
      toast.success("已删除该条记录");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  function handleTogglePause(checked) {
    setPauseHistory(checked);
    if (checked) {
      localStorage.setItem("pauseHistory", "1");
      toast.success("已暂停记录观看历史");
    } else {
      localStorage.removeItem("pauseHistory");
      toast.success("已恢复记录观看历史");
    }
  }

  const totalCount = historyGroups.reduce((sum, g) => sum + g.list.length, 0);

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
          <h1>登录后查看观看历史</h1>
          <p>登录即可同步你在各设备上的观看记录</p>
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
        <div className={styles.titleRow}>
          <span className={styles.titleIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
              />
            </svg>
          </span>
          <div>
            <h1 className={styles.pageTitle}>历史记录</h1>
            <p className={styles.pageDesc}>
              {loading ? "加载中..." : `共 ${totalCount} 条记录`}
            </p>
          </div>
        </div>

        <label className={styles.pauseToggle}>
          <span>记录浏览历史</span>
          <input
            type="checkbox"
            checked={!pauseHistory}
            onChange={(e) => handleTogglePause(!e.target.checked)}
          />
          <span className={styles.switch} aria-hidden="true" />
        </label>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {DATE_FILTERS.map((item) => (
            <button
              key={item.id || "all"}
              type="button"
              className={`${styles.filterTab} ${dateFilter === item.id ? styles.filterTabActive : ""}`}
              onClick={() => handleDateFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="搜索标题 / 频道名"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>

        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={totalCount === 0}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
          清空历史
        </button>
      </div>

      <div className={styles.content}>
        {!loading && totalCount === 0 && (
          <div className={styles.empty}>
            <p>暂无观看记录</p>
            <button type="button" onClick={() => navigate("/")}>
              去发现视频
            </button>
          </div>
        )}

        <div className={styles.timeline}>
          {historyGroups.map((group) => (
            <section key={group.date} className={styles.dateGroup}>
              <div className={styles.dateMarker}>
                <span className={styles.dateDot} />
                <h2 className={styles.dateTitle}>{group.date}</h2>
              </div>

              <ul className={styles.historyList}>
                {group.list.map((item) => {
                  const thumb = resolveThumbnailUrl(item.thumbnail, item.video_url);
                  const channelName = item.channel || item.author || "未知频道";
                  return (
                    <li key={`${item.id}-${item.watched_at}`} className={styles.historyItem}>
                      <button
                        type="button"
                        className={styles.itemMain}
                        onClick={() => navigate(`/videoPlay?id=${item.id}`)}
                      >
                        <div className={styles.thumbWrap}>
                          {thumb ? (
                            <img src={thumb} alt="" loading="lazy" />
                          ) : (
                            <div className={styles.thumbPlaceholder} />
                          )}
                          {item.duration && (
                            <span className={styles.duration}>{item.duration}</span>
                          )}
                        </div>

                        <div className={styles.itemInfo}>
                          <h3 className={styles.itemTitle}>{item.title}</h3>
                          <p className={styles.itemChannel}>
                            <span className={styles.upBadge}>UP</span>
                            {channelName}
                          </p>
                          <p className={styles.itemTime}>
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                              <path
                                fill="currentColor"
                                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"
                              />
                            </svg>
                            {formatWatchedAt(item.watched_at)}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={styles.deleteOneBtn}
                        aria-label="删除该条历史"
                        disabled={deletingId === item.id}
                        onClick={() => handleDeleteOne(item.id)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                          />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空历史</DialogTitle>
          </DialogHeader>
          <DialogDescription>清空后无法恢复，确定要继续吗？</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteOk}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default History;
