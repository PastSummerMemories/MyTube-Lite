import React, { memo, useCallback, useEffect, useState } from "react";
import styles from "./CommentArea.module.scss";
import { formatTimeToMonthDay } from "../../utils/fromatTime";
import { API_BASE } from "../../config";
import { addComment, toggleCommentLike } from "../../service/APIs";
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import { toast } from "sonner";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage";


function resolveAvatarUrl(avatar) {
  if (!avatar) return null;
  return avatar.startsWith("http") ? avatar : `${API_BASE}${avatar}`;
}

const CommentItem = memo(({ id, username, avatar, created_at, text, likes, liked, replies, depth = 0,parent_id= '',video_id= '',loadComments= () => {}}) => {
  const avatarSrc = resolveAvatarUrl(avatar);
  const displayName = username || "用户";
  const timeLabel = created_at ? formatTimeToMonthDay(created_at) : "";
  const [isLiked,setIsLiked] = useState(Boolean(liked));
  const [likeCount,setLikeCount] = useState(likes);
  const [loading,setLoading] = useState(false);
  const token = localStorage.getItem("token")
  const [showReplyInput,setShowReplyInput] = useState(false)
  const [replyContent,setReplyContent] = useState('')
  const [replyLoading,setReplyLoading] = useState(false)

  const onLike = useCallback(async function onLike(id) {
    if(!token) {
      toast.error("请先登录后再点赞哦~")
      return
    }
    setLoading(true)
    try{
      const res = await toggleCommentLike(id)
      setLoading(false)
      setIsLiked(res.liked)
      setLikeCount(res.likes)
      if(res.liked) 
      toast.success('点赞成功')
      else
      toast.success('已取消点赞~')
    } catch(error) {
      if (isRequestCanceled(error)) return
      toast.error(getRequestErrorMessage(error, "点赞失败，请稍后重试"))
    }finally{
      setLoading(false)
    }
  },[id,token])


  const onReply = useCallback(async function onReply(id,replyContent) {
      if(!token) {
        toast.error("请先登录后再回复哦~")
        return 
      } else{

        if(!replyContent.trim()) {
          toast.error("回复内容不能为空~")
          return
        }
      
        try{
          setReplyLoading(true)
          const res = await addComment({
            video_id: video_id,
            content: replyContent,
            parent_id: id,
          })
          toast.success('回复成功~')
          await loadComments()
          setReplyContent('')
          setShowReplyInput(false)

        } catch(error) {
          if (isRequestCanceled(error)) return
          toast.error(getRequestErrorMessage(error, "回复失败，请稍后重试"))
        } finally{
          setReplyLoading(false)
        }
      }
  
  },[id,token,parent_id,video_id,loadComments])

  
  useEffect(() => {
    if(showReplyInput) {
      setReplyContent('')
    }

  },[id,parent_id,showReplyInput])


  return (
    <article
      className={styles.commentItem}
      style={depth > 0 ? { marginLeft: `${Math.min(depth, 3) * 40}px` } : undefined}
    >
      <div className={styles.avatar}>
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} />
        ) : (
          <span>{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.username}>@{displayName}</span>
          {timeLabel && <span className={styles.time}>{timeLabel}</span>}
        </div>
        <p className={styles.content}>{text}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${isLiked ? styles.actionBtnActive : ""}`}
            onClick={() => onLike(id)}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
              />
            </svg>
            <span>{likeCount ?? 0}</span>
          </button>
          <button type="button" className={styles.actionBtn} onClick={() => setShowReplyInput(showReplyInput ? false : true)}>
            回复
          </button>
        </div>

        <div className = {styles.replyInputContainer} style={{display: showReplyInput ? 'block' : 'none'}}>
        <Input className = {styles.replyInput} placeholder="回复评论" value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
          disabled = {replyLoading}
        ></Input>
        <Button variant="default" className = {styles.replyBtn} onClick={() => onReply(id,replyContent,parent_id)}
          disabled={replyLoading}
          >{replyLoading ? '回复中...' : '回复'}</Button>
        </div>



        {replies && replies.map((item) => {
          return <CommentItem key={item.id} {...item} video_id={video_id} loadComments={loadComments} parent_id={id}></CommentItem>;
        })}


      </div>
    </article>
  );
});

export default CommentItem;
