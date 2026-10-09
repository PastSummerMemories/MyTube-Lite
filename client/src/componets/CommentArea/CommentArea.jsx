import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "./CommentArea.module.scss";
import CommentItem from "./CommentItem";
import { addComment, getCommentsTree } from "../../service/APIs";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { isRequestCanceled } from "../../utils/isRequestCanceled"
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage"

const CommentArea = memo(({ videoId, compact = false, hideHeading = false, onCountChange }) => {

  const token = localStorage.getItem("token")
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const onCountChangeRef = useRef(onCountChange)
  onCountChangeRef.current = onCountChange

  const loadComments = useCallback(async () => {
    const res = await getCommentsTree(videoId);
    const list = Array.isArray(res) ? res : [];
    setComments(list);
    onCountChangeRef.current?.(list.length);
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    loadComments();
  }, [videoId, loadComments]);


  const onAddComment = useCallback(async (commentContent) => {

    if(!token) {
      toast.error("请先登录后再评论哦~")
      return
    }

    if(!commentContent.trim()) {
      toast.error("评论内容不能为空~")
      return
    }

    try {
      setCommentLoading(true)
      await addComment({
        video_id: videoId,
        content: commentContent,
        parent_id: null,
      })
      await loadComments()
      toast.success('评论发表成功~')
      setCommentContent('')
    } catch (error) {
      if (isRequestCanceled(error)) return
      toast.error(getRequestErrorMessage(error, "评论发表失败，请稍后重试"))
    } finally {
      setCommentLoading(false)
    }

  }, [videoId, token, loadComments])

  return (
    <section className={`${styles.commentArea} ${compact ? styles.compact : ""}`}>


      {!hideHeading && (
        <h2 className={styles.heading}>
          <span>{comments.length}</span> 条评论
        </h2>
      )}

      <div className={styles.inputRow}>
        <div className={styles.inputAvatar}>U</div>
        <Input
          className={styles.input}
          value={commentContent}
          onChange={(e) => {
            setCommentContent(e.target.value)}}
          placeholder="在这里畅所欲言吧!"
          disabled={commentLoading}
        ></Input>
        <Button variant="default" onClick={() => onAddComment(commentContent)}
          className={styles.addCommentBtn}
          disabled = {commentLoading}
        >发表评论</Button>

      </div>

      <div className={styles.list}>
        {comments.map((item) => {
          return <CommentItem key={item.id} {...item} video_id={videoId} loadComments={loadComments} ></CommentItem>;
        })}
      </div>
    </section>
  );
});

export default CommentArea;
