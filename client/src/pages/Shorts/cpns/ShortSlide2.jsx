import { resolveMediaUrl, resolveThumbnailUrl } from '@/utils/resolveMediaUrl'
import React, { memo, useRef, useState, useEffect } from 'react'
import styles from "../Shorts.module.scss"
import { softGoLogin } from '@/utils/softNavigate'
import { getVideoLikeStatus, likeVideo } from '@/service/APIs'
import { isRequestCanceled } from '@/utils/isRequestCanceled'
import { Bookmark, Heart, MessageCircle, Volume2, VolumeX } from 'lucide-react'
import { formatCount } from '@/utils/fromatTime'


const ShortSlide2 = memo(function ShortSlide2({ video, active, muted, likeBusy, onToggleMute, onLike, onOpenComments,onOpenCollection}) {


  const videoRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [liked,setLiked] = useState(false)
  const [collected,setCollected] = useState(false)


  const src = resolveMediaUrl(video.video_url)
  const poster = resolveThumbnailUrl(video.thumbnail, video.video_url)
  const author = video?.author ? video.author : "佚名"
  const avatar = video?.channel_avatar ? video.channel_avatar : ""


  useEffect(() => {
    const el = videoRef.current
    if (!el)
      return
    el.muted = muted
  }, [muted])


  useEffect(() => {
    const el = videoRef.current
    if (!el)
      return
    if (active) {
      el.play().catch(() => { })
      setPaused(false)
    }
    else {
      el.pause()
      el.currentTime = 0
      setPaused(false)
    }
  }, [active, src])




  function handleTogglePlay() {

    const el = videoRef.current
    if (!el)
      return
    if (el.paused) {
      el.play().catch(() => { })
      setPaused(false)
    } else {
      el.pause()
      setPaused(true)
    }

  }

  return (
    <section className={styles.slide} data-short-id={video.id}>
      <div className={styles.stage}>

        <aside className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${video.isLiked ? styles.liked : ""}`}
            disabled={likeBusy}
            onClick={(e) => {
              e.stopPropagation();
              onLike(video);
            }}
          >
            <Heart size={28} fill={video.isLiked ? "currentColor" : "none"} />
            <span>{formatCount(video.likes ?? 0)}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(video);
            }}
          >
            <MessageCircle size={28} />
            <span>{formatCount(video.commentCount ?? 0)}</span>
          </button>


          <button
            type="button"
            className={`${styles.actionBtn} ${video.isFavorited || video.isInCollection ? styles.saved : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCollection(video)
            }}
          >
            <Bookmark size = {28} fill = {video.isInCollection ? "currentColor" : "none"}></Bookmark>
            <span>{video.isInCollection ? '已收藏' : '收藏'}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
          >
            {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            <span>{muted ? "静音" : "声音"}</span>
          </button>
        </aside>



        <div
          className={styles.videoHit}
          onClick={handleTogglePlay}
          role="button"
          tabIndex={active ? 0 : -1}
        >
          <video
            ref={videoRef}
            className={styles.video}
            src={src || undefined}
            poster={poster || undefined}
            playsInline
            loop
            muted={muted}
            preload={active ? "auto" : "metadata"}
          />
          {paused && active && (
            <span className={styles.pauseIcon} aria-hidden>
              ▶
            </span>
          )}
        </div>
        <div className={styles.meta}>


          <div className = {styles.channelRow}>
          <img className = {styles.avatar} src= {avatar} alt="暂无图像" />
            <h3>@{author}</h3>
          </div>

          <h2 className={styles.title}>{video.title || "无标题"}</h2>
        </div>


        

      </div>
    </section>

  )
})

export default ShortSlide2