import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import TagsInput from "./cpns/TagsInput";
import styles from "./Upload2.module.scss";
import { getVideoCategories, uploadVideo } from "@/service/APIs";
import { Button } from "@/components/ui/button";
import { isRequestCanceled } from "@/utils/isRequestCanceled";
import {
  captureFrameFromVideoElement,
  captureVideoFirstFrame,
  formatVideoDuration,
} from "@/utils/captureVideoFirstFrame";

const COVER_ACCEPT = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

const Upload2 = memo(() => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverSource, setCoverSource] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState("00:00");
  const [durationSec, setDurationSec] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [coverCapturing, setCoverCapturing] = useState(false);
  const [frameCapturing, setFrameCapturing] = useState(false);
  const [frameDialogOpen, setFrameDialogOpen] = useState(false);

  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const frameVideoRef = useRef(null);

  const MAX_VIDEO_MB = 100;

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [videoPreview, coverPreview]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getVideoCategories();
        if (cancelled) return;
        const list = Array.isArray(res) ? res : [];
        setCategories(list);
        if (list[0]?.id != null) {
          setCategory(String(list[0].id));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!frameDialogOpen) return undefined;
    const id = window.setTimeout(() => {
      const v = frameVideoRef.current;
      if (!v) return;
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setDurationSec(v.duration);
        setDuration(formatVideoDuration(v.duration));
      }
      try {
        v.currentTime = scrubTime || 0;
      } catch {
        // ignore
      }
    }, 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameDialogOpen]);

  const applyCover = (file, source) => {
    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      setCoverSource(null);
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverSource(source);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;

    const trimmedTitle = videoTitle.trim();
    if (!videoFile) {
      toast.error("请选择视频文件");
      return;
    }
    if (!trimmedTitle) {
      toast.error("请填写标题");
      return;
    }
    if (!coverFile) {
      toast.error("请设置封面（从视频取帧或上传图片）");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("thumbnail", coverFile);
    formData.append("title", trimmedTitle);
    formData.append("description", videoDescription.trim());
    formData.append("duration", duration);
    if (category) formData.append("category_id", category);
    if (tags.length) formData.append("tags", tags.join(","));

    setUploading(true);
    setProgress(0);

    try {
      const res = await uploadVideo(formData, (event) => {
        if (!event.total) return;
        setProgress(Math.round((event.loaded / event.total) * 100));
      });
      toast.success("视频上传成功");
      if (res?.videoId) {
        navigate(`/videoPlay?id=${res.videoId}`);
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
  };

  const handleVideoSelect = () => {
    videoInputRef.current?.click();
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`视频不能超过 ${MAX_VIDEO_MB}MB`);
      e.target.value = "";
      return;
    }

    setCoverCapturing(true);
    applyCover(null);

    try {
      if (videoPreview) URL.revokeObjectURL(videoPreview);

      const previewUrl = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoPreview(previewUrl);
      setScrubTime(0);
      setDurationSec(0);
      setDuration("00:00");
      setFrameDialogOpen(false);

      const { cover, duration: durText, durationSec: sec } =
        await captureVideoFirstFrame(file);
      setDuration(durText);
      setDurationSec(sec || 0);
      setScrubTime(sec > 0 ? Math.min(0.15, sec * 0.05) : 0);

      if (!cover) {
        toast.message("未能自动截取封面，可点「选取封面帧」或上传图片");
        return;
      }
      applyCover(cover, "auto");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error("封面截取失败，请重试");
    } finally {
      setCoverCapturing(false);
    }
  };

  const handleClearVideo = (e) => {
    e.stopPropagation();
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    applyCover(null);
    setVideoFile(null);
    setVideoPreview(null);
    setDuration("00:00");
    setDurationSec(0);
    setScrubTime(0);
    setFrameDialogOpen(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleClearCover = (e) => {
    e.stopPropagation();
    applyCover(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleCoverSelect = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSize = file.size / 1024 / 1024;
    if (fileSize > 10) {
      toast.error("封面文件不能超过 10MB，请重新选择");
      e.target.value = "";
      return;
    }

    if (!COVER_ACCEPT.includes(file.type)) {
      toast.error("封面只能是 JPG / PNG / WebP 格式");
      e.target.value = "";
      return;
    }

    applyCover(file, "upload");
  };

  const openFrameDialog = (e) => {
    e?.stopPropagation?.();
    if (!videoPreview) {
      toast.error("请先选择视频");
      return;
    }
    setFrameDialogOpen(true);
  };

  const syncScrubFromFrameVideo = () => {
    const v = frameVideoRef.current;
    if (!v) return;
    setScrubTime(v.currentTime || 0);
    if (Number.isFinite(v.duration) && v.duration > 0) {
      setDurationSec(v.duration);
      setDuration(formatVideoDuration(v.duration));
    }
  };

  const handleScrubChange = (e) => {
    const next = Number(e.target.value);
    setScrubTime(next);
    const v = frameVideoRef.current;
    if (v) {
      try {
        v.currentTime = next;
      } catch {
        // ignore
      }
    }
  };

  const handleUseCurrentFrame = async () => {
    const v = frameVideoRef.current;
    if (!v || !videoFile) {
      toast.error("请先选择视频");
      return;
    }
    if (!v.videoWidth) {
      toast.error("视频尚未加载完成，请稍后再试");
      return;
    }

    setFrameCapturing(true);
    try {
      v.pause();
      const cover = await captureFrameFromVideoElement(v, videoFile.name);
      if (!cover) {
        toast.error("截取当前帧失败，请换个位置再试");
        return;
      }
      applyCover(cover, "frame");
      setFrameDialogOpen(false);
      toast.success(
        `已使用 ${formatVideoDuration(v.currentTime)} 处画面作为封面`
      );
    } catch {
      toast.error("截取当前帧失败，请重试");
    } finally {
      setFrameCapturing(false);
    }
  };

  const coverLabel =
    coverSource === "frame"
      ? "封面（视频帧）"
      : coverSource === "upload"
        ? "封面（本地图片）"
        : coverSource === "auto"
          ? "封面（默认首帧）"
          : "封面文件 *";

  const busy = uploading || coverCapturing || frameCapturing;

  return (
    <div className={`${styles.main_wrap} py-4 md:px-5 md:py-6 h-auto`}>
      <div
        className={`${styles.content} w-9/10 mx-auto h-auto pb-10 md:pb-0 min-w-0`}
      >
        <section className={styles.mainTitle}>
          <span>上传视频</span>
          <p className={styles.subInfo}>
            选视频后默认用靠前帧作封面；也可弹窗选取任意一帧，或上传本地图片
          </p>
        </section>

        <form className={styles.form} onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet>
              <section
                className={`${styles.chooseFile} grid grid-cols-1 gap-4 md:grid-cols-2`}
              >
                <div
                  className={`${styles.dropZone1} w-full min-w-0`}
                  onClick={coverCapturing ? undefined : handleVideoSelect}
                >
                  <div className="mb-2 flex items-center justify-between md:mb-3">
                    <label
                      className={`${styles.label} text-sm block md:text-base`}
                    >
                      视频文件 *
                    </label>
                    {videoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={handleClearVideo}
                      >
                        清除
                      </Button>
                    )}
                  </div>
                  <input
                    type="file"
                    name="video"
                    accept="video/*"
                    className={styles.input}
                    ref={videoInputRef}
                    onChange={handleVideoChange}
                  />
                  <div className={styles.fillZone}>
                    {videoPreview ? (
                      <video
                        src={videoPreview}
                        controls
                        playsInline
                        muted
                        onClick={(e) => e.stopPropagation()}
                        className={styles.videoEl}
                      />
                    ) : (
                      <div className={styles.insideTips}>
                        <p className={styles.mainTips}>点击选择视频</p>
                        <p className={styles.subTips}>
                          支持 MP4、AVI、MOV、WMV，大小不超过 100MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${styles.dropZone2} w-full min-w-0`}>
                  <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
                    <label
                      className={`${styles.label} text-sm block md:text-base`}
                    >
                      {coverLabel}
                    </label>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {videoFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={openFrameDialog}
                        >
                          选取封面帧
                        </Button>
                      )}
                      {coverFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={handleClearCover}
                        >
                          清除
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCoverSelect();
                        }}
                      >
                        上传图片
                      </Button>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className={styles.input}
                    ref={coverInputRef}
                    onChange={handleCoverChange}
                  />
                  <div
                    className={styles.fillZone}
                    onClick={coverCapturing ? undefined : handleCoverSelect}
                  >
                    {coverCapturing ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-6" />
                        <span>正在生成默认封面…</span>
                      </div>
                    ) : coverPreview ? (
                      <img
                        src={coverPreview}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.coverEl}
                        alt="封面预览"
                      />
                    ) : (
                      <div className={styles.insideTips}>
                        <p className={styles.mainTips}>点击上传封面图片</p>
                        <p className={styles.subTips}>
                          或点上方「选取封面帧」从视频截取
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="videoTitle" className="mt-6">
                视频标题
              </FieldLabel>
              <Input
                id="videoTitle"
                type="text"
                placeholder="输入视频标题"
                required
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="videoDescription">视频描述</FieldLabel>
              <Textarea
                id="videoDescription"
                placeholder="输入视频描述"
                required
                rows={4}
                className="min-h-24"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
              />
            </Field>

            <FieldSet>
              <FieldLegend>分类与标签</FieldLegend>
              <FieldGroup className="flex w-full min-w-0 flex-row gap-4 max-sm:flex-col">
                <Field className="min-w-0 flex-1">
                  <FieldLabel htmlFor="videoCategory">视频分类</FieldLabel>
                  <Select
                    value={category || null}
                    onValueChange={(value) => setCategory(value ?? "")}
                  >
                    <SelectTrigger id="videoCategory" className="w-full">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} align="start">
                      <SelectGroup>
                        {categories.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="min-w-0 flex-1">
                  <FieldLabel htmlFor="videoTags">标签</FieldLabel>
                  <TagsInput
                    value={tags}
                    onChange={setTags}
                    placeholder="输入后按回车添加"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            {uploading && (
              <div className="mt-4 w-full" aria-live="polite">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  上传中 {progress}%
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="mt-2 w-fit px-6 hover:cursor-pointer"
            >
              {uploading ? "上传中…" : "上传"}
            </Button>
          </FieldGroup>
        </form>
      </div>

      <Dialog
        open={frameDialogOpen}
        onOpenChange={(open) => {
          if (frameCapturing) return;
          setFrameDialogOpen(open);
          if (!open) {
            frameVideoRef.current?.pause();
          }
        }}
      >
        <DialogContent
          className={`sm:max-w-2xl ${styles.frameDialog}`}
          showCloseButton={!frameCapturing}
        >
          <DialogHeader>
            <DialogTitle>选取封面帧</DialogTitle>
            <DialogDescription>
              拖动进度到合适画面，确认后用作封面
            </DialogDescription>
          </DialogHeader>

          {videoPreview && (
            <div className={styles.framePickerBody}>
              <video
                ref={frameVideoRef}
                src={videoPreview}
                controls
                playsInline
                muted
                className={styles.frameVideo}
                onLoadedMetadata={syncScrubFromFrameVideo}
                onTimeUpdate={syncScrubFromFrameVideo}
                onSeeked={syncScrubFromFrameVideo}
              />
              <div className={styles.scrubRow}>
                <input
                  type="range"
                  className={styles.scrub}
                  min={0}
                  max={Math.max(durationSec || 0, 0.01)}
                  step={0.05}
                  value={Math.min(scrubTime, durationSec || 0)}
                  disabled={frameCapturing || durationSec <= 0}
                  onChange={handleScrubChange}
                  aria-label="选择封面时间点"
                />
                <span className={styles.scrubTime}>
                  {formatVideoDuration(scrubTime)} / {duration || "00:00"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className={styles.frameDialogFooter}>
            <Button
              type="button"
              variant="outline"
              disabled={frameCapturing}
              onClick={() => setFrameDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={frameCapturing || !videoPreview}
              onClick={handleUseCurrentFrame}
            >
              {frameCapturing ? "截取中…" : "使用当前帧"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default Upload2;
