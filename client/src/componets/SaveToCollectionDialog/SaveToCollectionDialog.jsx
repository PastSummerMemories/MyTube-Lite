import React, { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addVideoToCollection,
  createCollection,
  getMyCollections,
  getVideoCollectionMembership,
  removeVideoFromCollection,
} from "../../service/APIs";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import styles from "./SaveToCollectionDialog.module.scss";

const SaveToCollectionDialog = memo(function SaveToCollectionDialog({
  open,
  onOpenChange,
  videoId,
  isShort = false,
  onMembershipChange,
}) {
  const [collections, setCollections] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!open || !videoId) return undefined;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [list, membership] = await Promise.all([
          getMyCollections({ skipLoading: true }),
          getVideoCollectionMembership(videoId, { skipLoading: true }),
        ]);
        if (cancelled) return;
        setCollections(Array.isArray(list) ? list : []);
        setSelectedIds(new Set(membership?.collectionIds || []));
      } catch (error) {
        if (isRequestCanceled(error) || cancelled) return;
        toast.error("加载收藏夹失败");
        setCollections([]);
        setSelectedIds(new Set());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, videoId]);

  function notifyMembership(nextSet) {
    onMembershipChange?.(nextSet.size > 0);
  }

  async function toggleCollection(collection) {
    const id = collection.id;
    const inCollection = selectedIds.has(id);
    setBusyId(id);
    try {
      if (inCollection) {
        await removeVideoFromCollection(id, Number(videoId));
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, video_count: Math.max(0, Number(c.video_count || 0) - 1) }
              : c
          )
        );
        notifyMembership(next);
        toast.success(`已从「${collection.title}」移除`);
      } else {
        await addVideoToCollection(id, Number(videoId), { isShort });
        const next = new Set(selectedIds);
        next.add(id);
        setSelectedIds(next);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, video_count: Number(c.video_count || 0) + 1 }
              : c
          )
        );
        notifyMembership(next);
        toast.success(
          isShort
            ? `已将 Shorts 加入「${collection.title}」`
            : `已加入「${collection.title}」`
        );
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(inCollection ? "移除失败" : "添加失败");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      toast.error("请输入收藏夹名称");
      return;
    }

    setCreating(true);
    try {
      const res = await createCollection(title);
      const collectionId = res?.collectionId;
      if (collectionId) {
        await addVideoToCollection(collectionId, Number(videoId), { isShort });
        const created = {
          id: collectionId,
          title,
          video_count: 1,
        };
        setCollections((prev) => [created, ...prev]);
        const next = new Set(selectedIds);
        next.add(collectionId);
        setSelectedIds(next);
        notifyMembership(next);
        toast.success(
          isShort ? `已创建并将 Shorts 加入「${title}」` : `已创建并加入「${title}」`
        );
      }
      setNewTitle("");
      setShowCreate(false);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(error.response?.data?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialog} showCloseButton>
        <DialogHeader>
          <DialogTitle>保存到收藏夹</DialogTitle>
          <DialogDescription>
            {isShort
              ? "将以 Shorts 短视频身份保存，收藏夹中会单独标识"
              : "选择已有收藏夹，或新建一个"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 className={styles.spinner} />
            <span>加载中…</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {collections.length === 0 && (
              <li className={styles.empty}>还没有收藏夹，先创建一个吧</li>
            )}
            {collections.map((item) => {
              const checked = selectedIds.has(item.id);
              const busy = busyId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${checked ? styles.itemActive : ""}`}
                    onClick={() => toggleCollection(item)}
                    disabled={busy || busyId != null}
                  >
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemMeta}>
                        {Number(item.video_count || 0)} 个视频
                      </span>
                    </span>
                    <span className={`${styles.check} ${checked ? styles.checkOn : ""}`}>
                      {busy ? (
                        <Loader2 className={styles.spinnerSm} />
                      ) : (
                        checked && <Check size={16} />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {showCreate ? (
          <form className={styles.createForm} onSubmit={handleCreate}>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="收藏夹名称"
              maxLength={100}
              disabled={creating}
              autoFocus
            />
            <div className={styles.createActions}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={creating}
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle("");
                }}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={creating || !newTitle.trim()}>
                {creating ? "创建中…" : "创建并保存"}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={styles.createBtn}
            onClick={() => setShowCreate(true)}
          >
            <FolderPlus size={16} />
            新建收藏夹
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default SaveToCollectionDialog;
