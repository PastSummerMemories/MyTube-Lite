import { API_BASE } from "../config";

/** 相对路径 / 绝对 URL → 可请求的完整地址 */
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

/**
 * 封面解析：
 * - 完整 URL /uploads/... → 直接用
 * - 短名 demo25 → /uploads/thumbnails/demo25.jpg（兼容种子数据）
 * - 空值 → 由 video_url 推导同名 jpg
 */
export function resolveThumbnailUrl(thumbnail, video_url) {
  const fromVideoUrl = () => {
    if (!video_url) return null;
    return `${API_BASE}${video_url}`
      .replace("/videos/", "/thumbnails/")
      .replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
  };

  if (!thumbnail) return fromVideoUrl();

  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;

  if (thumbnail.startsWith("/")) return `${API_BASE}${thumbnail}`;

  // 纯文件名或短名：demo25 / demo25.jpg
  const file = /\.(jpe?g|png|webp|gif)$/i.test(thumbnail)
    ? thumbnail
    : `${thumbnail}.jpg`;
  return `${API_BASE}/uploads/thumbnails/${file}`;
}
