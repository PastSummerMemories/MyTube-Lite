import { resolveMediaUrl, resolveThumbnailUrl } from "../../utils/resolveMediaUrl";

/**
 * @typedef {{ id: string, label: string, src: string }} QualitySource
 */

/**
 * 解析播放地址；若未传入 qualities，默认「原画」单档。
 * @returns {{ videoUrl: string, posterUrl: string, qualities: QualitySource[] } | null}
 */
export function parseVideoUrl(video_url, thumbnail, qualities) {
  if (!video_url && (!qualities || qualities.length === 0)) return null;

  const posterUrl = resolveThumbnailUrl(thumbnail, video_url) || "";
  const list =
    Array.isArray(qualities) && qualities.length > 0
      ? qualities.map((q, i) => ({
          id: String(q.id ?? i),
          label: q.label || `清晰度${i + 1}`,
          src: resolveMediaUrl(q.src || q.url || video_url),
        }))
      : [
          {
            id: "source",
            label: "原画",
            src: resolveMediaUrl(video_url),
          },
        ];

  return {
    videoUrl: list[0].src,
    posterUrl,
    qualities: list,
  };
}
