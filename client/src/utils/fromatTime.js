// 转化成X月X日
function formatTimeToMonthDay(time) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatHistoryGroupDate(time) {
  const date = new Date(time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const watchDay = new Date(date);
  watchDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - watchDay) / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  return formatTimeToMonthDay(time);
}

function formatViews(views) {
  const n = Number(views) || 0;
  if (n >= 10000) {
    const val = (n / 10000).toFixed(1).replace(/\.0$/, "");
    return `${val}万次观看`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${val}千次观看`;
  }
  return `${n}次观看`;
}

function formatSubscribers(count) {
  const n = Number(count) || 0;
  if (n >= 10000) {
    const val = (n / 10000).toFixed(1).replace(/\.0$/, "");
    return `${val}万位订阅者`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${val}千位订阅者`;
  }
  return `${n} 位订阅者`;
}

function formatCount(count) {
  const n = Number(count) || 0;
  if (n >= 10000) {
    const val = (n / 10000).toFixed(1).replace(/\.0$/, "");
    return `${val}万`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${val}千`;
  }
  return String(n);
}

/** 动态流相对时间：今天/昨天 HH:mm、X天前、M月D日 */
function formatFeedTime(time) {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - day) / 86400000);
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  if (diffDays === 0) return `今天 ${hm}`;
  if (diffDays === 1) return `昨天 ${hm}`;
  if (diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 收藏时间文案：收藏于10小时前 / 昨天 / 6月3日 */
function formatCollectedAt(time) {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return "收藏于刚刚";
  if (diffHours < 24) return `收藏于${diffHours}小时前`;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - day) / 86400000);
  if (diffDays === 1) return "收藏于昨天";
  if (diffDays < 7) return `收藏于${diffDays}天前`;
  return `收藏于${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 历史记录观看时间：今天10:04 / 昨天18:20 / 6月3日 */
function formatWatchedAt(time) {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - day) / 86400000);
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  if (diffDays === 0) return `今天${hm}`;
  if (diffDays === 1) return `昨天${hm}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export {
  formatTimeToMonthDay,
  formatHistoryGroupDate,
  formatViews,
  formatSubscribers,
  formatCount,
  formatFeedTime,
  formatWatchedAt,
  formatCollectedAt,
};

