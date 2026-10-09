import { Get } from '@/service'
import { isRequestCanceled } from '@/utils/isRequestCanceled'
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import styles from "./Shorts.module.scss"
import ShortSlide2 from './cpns/ShortSlide2'
import { getVideoCollectionMembership, getVideoLikeStatus, likeVideo } from '@/service/APIs'
import { softGoLogin } from '@/utils/softNavigate'
import { ArrowDown, ArrowUp, Bookmark, MessageCircle } from 'lucide-react'
import CommentArea from "@/componets/CommentArea/CommentArea"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import useMediaWidth from "@/hooks/useMedia";
import { useSearchParams } from 'react-router-dom'
import SaveToCollectionDialog from '@/componets/SaveToCollectionDialog/SaveToCollectionDialog'





function mergeVideos(prev, incoming) {

    const ids = new Set(prev.map(v => v.id))
    const unique = incoming.filter(v => !ids.has(v.id))
    return unique.length ? [...prev, ...unique] : prev
}


const Shorts2 = memo(() => {


    const WHEEL_COOLDOWN_MS = 520
    const SWIPE_THRESHOLD_PX = 56
    const SWIPE_MAX_HORIZONTAL = 80

    const pageRef = useRef(1)
    const hasMoreRef = useRef(true)
    const fetchingRef = useRef(false)
    const scrollerRef = useRef(null)
    const activeIndexRef = useRef(0)
    const videosLenRef = useRef(0)
    const wheelLockRef = useRef(false)
    const wheelUnlockRef = useRef(null)
    const pointerRef = useRef(null)
    const suppressClickRef = useRef(false)
    const focusDoneRef = useRef(null)
    const focusBusyRef = useRef(null)
    const initialLoadedRef = useRef(false)


    const [videos, setVideos] = useState([])
    const [empty, setEmpty] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [muted, setMuted] = useState(true)
    const [likeBusy, setLikeBusy] = useState(false)

    // 评论
    const [commentsOpen, setCommentsOpen] = useState(false)
    const [commentVideoId, setCommentVideoId] = useState(null)

    // 收藏
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
    const [collectionVideoId, setCollectionVideoId] = useState(null)

    const commentsOpenRef = useRef(null)
    const isCompact = useMediaWidth(768)
    const [searchParams] = useSearchParams()
    const focusId = searchParams.get("id")


    activeIndexRef.current = activeIndex
    videosLenRef.current = videos.length


    const fetchPage = useCallback(async () => {

        if (!hasMoreRef.current || fetchingRef.current)
            return

        fetchingRef.current = true;
        const page = pageRef.current

        try {

            const result = await Get(
                "/videos/shorts",
                { page, limit: 8 },
                { skipLoading: page > 1 }
            )

            const list = Array.isArray(result?.videos) ? result.videos : []

            setVideos((prev) => {
                const next = page === 1 ? list : mergeVideos(prev, list)
                if (page === 1 && next.length === 0)
                    setEmpty(true)
                return next
            })

            if (page === 1)
                initialLoadedRef.current = true

            hasMoreRef.current = Boolean(result?.hasMore)
            pageRef.current = page + 1
        } catch (error) {

            if (isRequestCanceled(error))
                return
            if (page === 1) {
                setEmpty(true)
                toast.error("加载短视频失败", { position: "top-center" })
            }

        } finally {
            fetchingRef.current = false
        }

    }, [])


    const scrollToIndex = useCallback((index, behavior = "smooth") => {

        const root = scrollerRef.current
        if (!root)
            return

        const len = videosLenRef.current
        const next = Math.max(0, Math.min(index, len - 1))
        if (len <= 0)
            return

        const slides = root.querySelectorAll(`.${styles.slide}`)
        const target = slides[next]
        if (!target)
            return


        root.scrollTo({ top: target.offsetTop, behavior })
        setActiveIndex(next)
    }, [])

    const goBy = useCallback((delta) => {
        scrollToIndex(activeIndexRef.current + delta)
    }, [scrollToIndex])



    async function handleLike(video) {
        if (!localStorage.getItem("token")) {
            toast.error("请先登录后再点赞", { position: "top-center" });
            softGoLogin();
            return;
        }

        setLikeBusy(true);
        try {
            const res = await likeVideo(video.id);
            const liked = res.action === "liked";
            setVideos((prev) =>
                prev.map((v) =>
                    Number(v.id) === Number(video.id)
                        ? {
                            ...v,
                            isLiked: liked,
                            likes:
                                typeof res.likes === "number"
                                    ? res.likes
                                    : Math.max(0, (v.likes || 0) + (liked ? 1 : -1)),
                        }
                        : v
                )
            );
        } catch (error) {
            if (isRequestCanceled(error)) return;
            toast.error("点赞失败，请稍后重试", { position: "top-center" });
        } finally {
            setLikeBusy(false);
        }
    }


    // 打开评论
    function handleOpenComments(video) {
        setCommentVideoId(video.id)
        setCommentsOpen(true)
    }

    function handleCommentCountChange(videoId, count) {
        setVideos(prev =>
            prev.map(v => Number(v.id) === Number(videoId) ? { ...v, commentCount: count } : v)
        )
    }

    // 打开收藏夹
    function handleOpenCollect(video) {
        if (!localStorage.getItem("token")) {
            toast.error("请先登录后再收藏", { position: "top-center" })
            softGoLogin()
            return
        }

        setCollectionDialogOpen(true)
        setCollectionVideoId(video.id)
    }


    useEffect(() => {
        fetchPage()
    }, [fetchPage])





    // 读地址栏的id
    useEffect(() => {

        if (!focusId || focusDoneRef.current === focusId)
            return
        if (!initialLoadedRef.current || focusBusyRef.current)
            return

        let cancelled = false

        async function focusTarget() {

            // 先找一下有没有id，有的话就直接跳到对应的页面
            const existingId = videos.findIndex(v => String(v.id) === String(focusId))

            if (existingId >= 0) {

                if (cancelled)
                    return

                requestAnimationFrame(() => {
                    scrollToIndex(existingId, "auto")
                })
                return
            }


            // 设置成忙碌状态，避免频繁调用
            focusBusyRef.current = true


            try {

                // 获取视频的详情信息，没有的话就返回
                const detail = await Get(`/videos?id=${existingId}`, undefined, {
                    skipLoading: true
                })

                if (cancelled || !detail.id)
                    return


                // 把找到的详情信息加到列表中，如果原先就有的话，就不加了
                setVideos((prev) => {

                    if (prev.some(v => String(v.id) === String(existingId)))
                        return prev
                    else
                        return [detail, ...prev]
                })

                // 等待40ms,跳转到列表的第一条视频
                setTimeout(() => {
                    if (cancelled)
                        return
                    scrollToIndex(0, "auto")
                    focusDoneRef.current = existingId
                }, 40)


            } catch (error) {
                if (isRequestCanceled(error) || cancelled)
                    return
                toast.error("无法打开该视频", { position: "top-center" })
                focusDoneRef.current = focusId
            } finally {
                focusBusyRef.current = false
            }

        }

        focusTarget()
        return () => {
            cancelled = true
        }


    }, [focusId, videos, scrollToIndex])



    useEffect(() => {

        const root = scrollerRef.current
        if (!root || videos.length === 0)
            return

        const sync = () => {
            const mid = root.scrollTop + root.clientHeight / 2
            const slides = root.querySelectorAll(`.${styles.slide}`)
            let bestIdx = 0
            let bestDist = Infinity
            slides.forEach((el, idx) => {
                const center = el.offsetTop + el.offsetHeight / 2
                const dist = Math.abs(center - mid)
                if (dist < bestDist) {
                    bestDist = dist
                    bestIdx = idx
                }
            })

            setActiveIndex(prev => prev === bestIdx ? prev : bestIdx)
        }

        root.addEventListener("scroll", sync, { passive: true })

        return () => root.removeEventListener("scroll", sync)
    }, [videos.length])

    useEffect(() => {

        const root = scrollerRef.current
        if (!root)
            return

        const onWheel = (e) => {

            if (commentsOpenRef.current) return;

            const deltaY = e.deltaY
            if (Math.abs(deltaY) < 8)
                return

            e.preventDefault()
            if (wheelLockRef.current)
                return

            wheelLockRef.current = true
            const direction = deltaY > 0 ? 1 : -1
            goBy(direction)

            clearTimeout(wheelUnlockRef.current)
            wheelUnlockRef.current = setTimeout(() => {
                wheelLockRef.current = false
            }, WHEEL_COOLDOWN_MS)

        }


        root.addEventListener("wheel", onWheel, { passive: false })

        return () => root.removeEventListener("wheel", onWheel)
    }, [goBy, videos.length])

    useEffect(() => {


        const onKeyDown = (e) => {

            if (commentsOpenRef.current) return;
            const key = e.key
            if (e.key === "ArrowDown" || e.key === "j") {
                e.preventDefault()
                goBy(1)
            }
            else if (e.key === "ArrowUp" || e.key === "k") {
                e.preventDefault()
                goBy(-1)
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)

    }, [goBy])

    // 触屏以及鼠标拖拽切条
    useEffect(() => {

        const root = scrollerRef.current
        if (!root)
            return

        const onPointerDown = (e) => {

            if (commentsOpenRef.current) return;
            if (e.button !== null && e.button !== 0)
                return
            pointerRef.current = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY
            }
        }

        const finish = (e) => {
            const p = pointerRef.current
            if (!p || p.id !== e.pointerId)
                return
            pointerRef.current = null

            const dy = e.clientY - p.startY
            const dx = e.clientX - p.startX

            // 横向滑动大于默认值，同时大于竖向滑动，判定为误触
            if (Math.abs(dx) > SWIPE_MAX_HORIZONTAL && Math.abs(dx) > Math.abs(dy))
                return

            // 未到达滑动阈值，返回
            if (Math.abs(dy) < SWIPE_THRESHOLD_PX)
                return

            suppressClickRef.current = true
            goBy(dy < 0 ? 1 : -1)
            setTimeout(() => {
                suppressClickRef.current = focusId
            }, 80)

        }


        const onClickCapture = (e) => {
            if (!suppressClickRef.current)
                return
            e.preventDefault()
            e.stopPropagation()
            suppressClickRef.current = false
        }

        root.addEventListener("pointerdown", onPointerDown)
        root.addEventListener("pointerup", finish)
        root.addEventListener("pointercancel", finish)
        root.addEventListener("click", onClickCapture, true)

        return () => {
            root.removeEventListener("pointerdown", onPointerDown);
            root.removeEventListener("pointerup", finish);
            root.removeEventListener("pointercancel", finish);
            root.removeEventListener("click", onClickCapture, true);
        }

    }, [goBy, videos.length])


    // 到达底部加载更多
    useEffect(() => {

        if (activeIndex >= videos.length - 3 && videos.length > 0) {
            fetchPage()
        }
    }, [activeIndex, videos.length, fetchPage])


    const activeIndexId = videos[activeIndex]?.id

    useEffect(() => {


        if (activeIndexId === null)
            return
        let cancelled = false


        async function getId() {

            try {
                const token = localStorage.getItem("token");
                const [likeRes, membershipRes] = await Promise.all([
                    getVideoLikeStatus(activeIndexId, { skipLoading: true }),
                    token
                        ? getVideoCollectionMembership(activeIndexId, { skipLoading: true }).catch(() => ({
                            isInAny: false,
                        }))
                        : Promise.resolve({ isInAny: false }),
                ]);
                setVideos((prev) =>
                    prev.map((v) =>
                        Number(v.id) === Number(activeIndexId)
                            ? {
                                ...v,
                                isLiked: likeRes?.isLiked ?? false,
                                isInCollection: membershipRes?.isInAny ?? false,
                            }
                            : v
                    )
                )


            } catch (error) {
                if (isRequestCanceled(error) || cancelled)
                    return
                toast.error("获取视频点赞信息失败", { position: "top-center" })
            }

        }

        getId()


        return () => {
            cancelled = true
        }

    }, [activeIndexId])


    if (empty && videos.length === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.empty}>暂无 Shorts 内容</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.scroller} ref={scrollerRef}>
                {videos.map((v, i) => (
                    <ShortSlide2 key={v.id} video={v} active={i === activeIndex} muted={muted} likeBusy={likeBusy}
                        isLiked={v.isLiked}
                        isFavorited={v.isFavorited}
                        onToggleMute={() => setMuted((m) => !m)}
                        onLike={handleLike}
                        onOpenComments={handleOpenComments}
                        onOpenCollection={handleOpenCollect}
                    />
                ))}
            </div>


            <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
                <SheetContent
                    side={isCompact ? "bottom" : "right"}
                    className={styles.commentSheet}
                    showCloseButton
                >
                    <SheetHeader className={styles.commentSheetHeader}>
                        <SheetTitle>评论</SheetTitle>
                        <SheetDescription className="sr-only">
                            查看并发表当前短视频的评论
                        </SheetDescription>
                    </SheetHeader>
                    <div className={styles.commentSheetBody}>
                        {commentVideoId != null && (
                            <CommentArea
                                key={commentVideoId}
                                videoId={commentVideoId}
                                compact
                                hideHeading
                                onCountChange={(count) =>
                                    handleCommentCountChange(commentVideoId, count)
                                }
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <SaveToCollectionDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                videoId={collectionVideoId}
                isShort
                onMembershipChange={(isInAny) => {
                    setVideos((prev) =>
                        prev.map((v) =>
                            Number(v.id) === Number(collectionVideoId)
                                ? { ...v, isInCollection: isInAny }
                                : v
                        )
                    );
                }}
            ></SaveToCollectionDialog>


            <div className={styles.arrowGroup}>

                <button className={styles.actionBtn}
                    style={{
                        marginBottom: '25px'
                    }}
                    disabled = {activeIndex <= 0}
                    onClick = {() => scrollToIndex(activeIndex - 1)}
                >
                    <ArrowUp size={28} style={{
                        color: 'white'
                    }}></ArrowUp>

                </button>

                <button className={styles.actionBtn}
                    disabled = {activeIndex >= videos.length - 1}
                    onClick = {() => {
                        scrollToIndex(activeIndex + 1)
                    }}
                >
                    <ArrowDown size={28} style={{
                        color: 'white'
                    }}></ArrowDown>
                </button>
            </div>

        </div>
    );
})

export default Shorts2