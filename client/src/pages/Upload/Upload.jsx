import React, { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories, uploadVideo } from "../../service/APIs";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import styles from "./Upload.module.scss";

const MENU_MAX_HEIGHT = 240;
const MENU_GAP = 6;

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_VIDEO_MB = 100;

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = formatDuration(video.duration);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("00:00");
    };
    video.src = url;
  });
}

/** 截取视频首帧（略向后 seek，避免纯黑帧）→ JPEG File */
function captureVideoFirstFrame(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");

    video.onerror = () => finish(null);

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seekTo = duration > 0 ? Math.min(0.15, duration * 0.05) : 0.1;
      try {
        video.currentTime = seekTo;
      } catch {
        // 部分格式不支持 seek，直接尝试画当前帧
        drawFrame();
      }
    };

    video.onseeked = () => drawFrame();

    function drawFrame() {
      try {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        if (!w || !h) {
          finish(null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish(null);
              return;
            }
            const base = file.name.replace(/\.[^.]+$/, "") || "video";
            finish(new File([blob], `${base}-cover.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.88
        );
      } catch {
        finish(null);
      }
    }

    video.src = url;
    // 某些浏览器需要显式 load
    video.load();
  });
}

const Upload = memo(() => {
  const navigate = useNavigate();
  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState([]);
  const categoryRef = useRef(null);
  const categoryMenuRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbPreview, setThumbPreview] = useState("");
  const [duration, setDuration] = useState("00:00");
  /** 当前封面是否为自动截取的首帧（手动选图后为 false） */
  const [thumbAuto, setThumbAuto] = useState(false);
  const [thumbCapturing, setThumbCapturing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (!cancelled) setCategories(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (isRequestCanceled(err) || cancelled) return;
        setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!categoryOpen) {
      setMenuStyle(null);
      return undefined;
    }

    function updateMenuPosition() {
      const trigger = categoryRef.current?.querySelector("button");
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
      const spaceAbove = rect.top - MENU_GAP;
      const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 160) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        maxHeight,
        zIndex: 1000,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + MENU_GAP, top: "auto" }
          : { top: rect.bottom + MENU_GAP, bottom: "auto" }),
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [categoryOpen]);

  useEffect(() => {
    if (!categoryOpen) return undefined;

    function handlePointerDown(e) {
      const inTrigger = categoryRef.current?.contains(e.target);
      const inMenu = categoryMenuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setCategoryOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setCategoryOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryOpen]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [videoPreview, thumbPreview]);

  async function applyAutoThumbnail(file) {
    setThumbCapturing(true);
    try {
      const cover = await captureVideoFirstFrame(file);
      if (!cover) {
        toast.message("未能自动截取封面，请手动上传一张");
        return;
      }
      setThumbPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(cover);
      });
      setThumbFile(cover);
      setThumbAuto(true);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    } finally {
      setThumbCapturing(false);
    }
  }

  async function handleVideoChange(e) {
    const file = e.target.files?.[0];
    console.log('file:',file)
    if (!file) return;

    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`视频不能超过 ${MAX_VIDEO_MB}MB`);
      e.target.value = "";
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    const d = await readVideoDuration(file);
    setDuration(d);

    // 每次换视频都默认用新视频的首帧作封面（之后仍可手动更换）
    await applyAutoThumbnail(file);
  }

  function handleThumbChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    setThumbAuto(false);
  }

  function clearVideo() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview("");
    setDuration("00:00");
    if (videoInputRef.current) videoInputRef.current.value = "";
    // 首帧封面随视频一起清掉
    if (thumbAuto) {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
      setThumbFile(null);
      setThumbPreview("");
      setThumbAuto(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  }

  async function clearThumb() {
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(null);
    setThumbPreview("");
    setThumbAuto(false);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
    // 仍有视频时，重新截取首帧作为默认封面
    if (videoFile) {
      await applyAutoThumbnail(videoFile);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("请填写标题");
      return;
    }
    if (!videoFile) {
      toast.error("请选择视频文件");
      return;
    }

    let coverFile = thumbFile;
    if (!coverFile && videoFile) {
      coverFile = await captureVideoFirstFrame(videoFile);
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    if (coverFile) formData.append("thumbnail", coverFile);
    formData.append("title", trimmedTitle);
    formData.append("description", description.trim());
    formData.append("duration", duration);
    if (categoryId) formData.append("category_id", categoryId);
    if (tags.trim()) formData.append("tags", tags.trim());

    setUploading(true);
    setProgress(0);

    try {
      const res = await uploadVideo(formData, (event) => {
        if (!event.total) return;
        setProgress(Math.round((event.loaded / event.total) * 100));
      });
      const videoId = res?.videoId;
      toast.success("视频上传成功");
      if (videoId) {
        navigate(`/videoPlay?id=${videoId}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      const message =
        error.response?.data?.message || error.message || "上传失败，请重试";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>上传视频</h1>
        <p className={styles.subtitle}>
          选择本地视频后默认截取首帧作为封面，也可手动更换
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.mediaRow}>
          <section className={styles.mediaBlock}>
            <div className={styles.labelRow}>
              <label className={styles.label}>视频文件 *</label>
              {videoFile && (
                <button type="button" className={styles.clearBtn} onClick={clearVideo} disabled={uploading}>
                  清除
                </button>
              )}
            </div>
            <div
              className={styles.dropzone}
              onClick={() => !uploading && videoInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  videoInputRef.current?.click();
                }
              }}
            >
              {videoPreview ? (
                <video className={styles.videoPreview} src={videoPreview} controls muted />
              ) : (
                <div className={styles.placeholder}>
                  <span>点击选择视频</span>
                  <span className={styles.hint}>MP4 / WebM / MOV / AVI，最大 {MAX_VIDEO_MB}MB</span>
                </div>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept={VIDEO_ACCEPT}
              className={styles.hiddenInput}
              onChange={handleVideoChange}
              disabled={uploading}
            />
            {videoFile && (
              <p className={styles.fileMeta}>
                {videoFile.name} · 时长 {duration}
              </p>
            )}
          </section>

          <section className={styles.mediaBlock}>
            <div className={styles.labelRow}>
              <label className={styles.label}>
                封面{thumbAuto ? "（视频首帧）" : ""}
              </label>
              {thumbFile && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={clearThumb}
                  disabled={uploading || thumbCapturing}
                >
                  {thumbAuto ? "重新截取" : "改回首帧"}
                </button>
              )}
            </div>
            <div
              className={`${styles.dropzone} ${styles.thumbZone}`}
              onClick={() => !uploading && !thumbCapturing && thumbInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  thumbInputRef.current?.click();
                }
              }}
            >
              {thumbPreview ? (
                <img className={styles.thumbPreview} src={thumbPreview} alt="封面预览" />
              ) : (
                <div className={styles.placeholder}>
                  <span>{thumbCapturing ? "正在截取首帧…" : "选择视频后自动生成"}</span>
                  <span className={styles.hint}>也可点击上传 JPG / PNG / WebP</span>
                </div>
              )}
            </div>
            <input
              ref={thumbInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className={styles.hiddenInput}
              onChange={handleThumbChange}
              disabled={uploading || thumbCapturing}
            />
          </section>
        </div>

        <section className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="upload-title">
              标题 *
            </label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="视频标题"
              maxLength={120}
              disabled={uploading}
              className={styles.control}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="upload-desc">
              简介
            </label>
            <textarea
              id="upload-desc"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单介绍一下视频内容"
              rows={4}
              maxLength={2000}
              disabled={uploading}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <span className={styles.label} id="upload-category-label">
                分类
              </span>
              <div className={styles.selectWrap} ref={categoryRef}>
                <button
                  type="button"
                  id="upload-category"
                  className={`${styles.selectTrigger} ${categoryOpen ? styles.selectTriggerOpen : ""}`}
                  onClick={() => !uploading && setCategoryOpen((open) => !open)}
                  disabled={uploading}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  aria-labelledby="upload-category-label"
                >
                  <span className={categoryId ? styles.selectValue : styles.selectPlaceholder}>
                    {categoryId
                      ? categories.find((c) => String(c.id) === String(categoryId))?.name || "已选分类"
                      : "不选择分类"}
                  </span>
                  <ChevronDown
                    className={`${styles.selectIcon} ${categoryOpen ? styles.selectIconOpen : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {categoryOpen &&
                  menuStyle &&
                  createPortal(
                    <ul
                      ref={categoryMenuRef}
                      className={styles.selectMenu}
                      style={menuStyle}
                      role="listbox"
                      aria-labelledby="upload-category-label"
                    >
                      <li role="option" aria-selected={!categoryId}>
                        <button
                          type="button"
                          className={`${styles.selectOption} ${!categoryId ? styles.selectOptionActive : ""}`}
                          onClick={() => {
                            setCategoryId("");
                            setCategoryOpen(false);
                          }}
                        >
                          <span>不选择分类</span>
                          {!categoryId && <Check className={styles.selectCheck} aria-hidden="true" />}
                        </button>
                      </li>
                      {categories.map((cat) => {
                        const active = String(cat.id) === String(categoryId);
                        return (
                          <li key={cat.id} role="option" aria-selected={active}>
                            <button
                              type="button"
                              className={`${styles.selectOption} ${active ? styles.selectOptionActive : ""}`}
                              onClick={() => {
                                setCategoryId(String(cat.id));
                                setCategoryOpen(false);
                              }}
                            >
                              <span>{cat.name}</span>
                              {active && <Check className={styles.selectCheck} aria-hidden="true" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>,
                    document.body
                  )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="upload-tags">
                标签
              </label>
              <Input
                id="upload-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="逗号分隔，如 react,前端"
                disabled={uploading}
                className={styles.control}
              />
            </div>
          </div>
        </section>

        {uploading && (
          <div className={styles.progressWrap} aria-live="polite">
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressText}>上传中 {progress}%</span>
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={uploading}>
            取消
          </Button>
          <Button type="submit" disabled={uploading || !videoFile || !title.trim()}>
            {uploading ? "上传中…" : "发布视频"}
          </Button>
        </div>
      </form>
    </div>
  );
});

export default Upload;
