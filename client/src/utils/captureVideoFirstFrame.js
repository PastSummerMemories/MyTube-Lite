/** 视频封面截帧工具：首帧默认 / 指定时间点 / 从已加载的 video 元素截取 */

export function formatVideoDuration(timeStamp) {
  const total = Math.max(0, Math.floor(Number(timeStamp) || 0));
  const minutes = String(Math.floor(total / 60));
  const seconds = String(total % 60);
  return `${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

function canvasToCoverFile(canvas, fileNameBase = "video") {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const base = String(fileNameBase).replace(/\.[^.]+$/, "") || "video";
        resolve(new File([blob], `${base}-cover.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88
    );
  });
}

function drawVideoToCoverFile(video, fileNameBase = "video") {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.resolve(null);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.drawImage(video, 0, 0, w, h);
  return canvasToCoverFile(canvas, fileNameBase);
}

/**
 * 从页面上已加载的 <video> 截取当前画面为封面 File
 * @param {HTMLVideoElement} video
 * @param {string} [fileNameBase]
 */
export function captureFrameFromVideoElement(video, fileNameBase = "video") {
  if (!video) return Promise.resolve(null);
  try {
    return drawVideoToCoverFile(video, fileNameBase);
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * 将离屏 video seek 到指定秒数后截帧
 * @param {File} file
 * @param {number} [timeSec] 目标时间（秒）；不传则取靠前的非黑帧
 * @returns {Promise<{ cover: File|null, duration: string, durationSec: number }>}
 */
export function captureVideoFrameAt(file, timeSec) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    let durationSec = 0;

    const finish = (cover) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve({
        cover,
        duration: formatVideoDuration(durationSec),
        durationSec,
      });
    };

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.onerror = () => finish(null);

    video.onloadedmetadata = () => {
      durationSec = Number.isFinite(video.duration) ? video.duration : 0;
      let seekTo;
      if (typeof timeSec === "number" && Number.isFinite(timeSec)) {
        seekTo = Math.min(Math.max(0, timeSec), Math.max(0, durationSec - 0.05));
      } else {
        seekTo = durationSec > 0 ? Math.min(0.15, durationSec * 0.05) : 0.1;
      }
      try {
        video.currentTime = seekTo;
      } catch {
        drawVideoToCoverFile(video, file.name).then(finish);
      }
    };

    video.onseeked = () => {
      drawVideoToCoverFile(video, file.name).then(finish);
    };

    video.src = url;
    video.load();
  });
}

/** 兼容旧调用：默认截取靠前非黑帧 */
export function captureVideoFirstFrame(file) {
  return captureVideoFrameAt(file);
}
