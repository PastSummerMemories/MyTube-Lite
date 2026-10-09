import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './Search.module.scss'
import gridStyles from '../../styles/videoGrid.module.scss'
import Tags from '../../componets/Tags/Tags'
import { getCategories, searchVideos } from '../../service/APIs'
import VideoItem from '../../componets/VideoItem/VideoItem'
import { useScrollToBottom } from '../../hooks/useScrollBottom'
import NoContent from '../../assets/NoContent.png'
import NoMore from '../../assets/NoMore.png'
import { toast } from 'sonner'
import { isRequestCanceled } from '../../utils/isRequestCanceled'
import { Button } from "@/components/ui/button"
import { useSelector } from 'react-redux'
import { ChevronUp } from 'lucide-react';
import { ChevronDown } from 'lucide-react';


function mergeVideos(prev, incoming) {
  const ids = new Set(prev.map((v) => v.id))
  const unique = incoming.filter((v) => !ids.has(v.id))
  return unique.length ? [...prev, ...unique] : prev
}

const Search = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const pendingCount = useSelector((state) => state.loadingStore.pendingCount)

  const query = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const date = searchParams.get('date') ?? ''
  const sort = searchParams.get('sort') ?? ''

  const [expanded, setExpanded] = useState(false)
  const [videoList, setVideoList] = useState([])
  const [categoryList, setCategoryList] = useState([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)




  // 搜索的过滤器，当选中日期，分区，排序方式的时候会被调用，
  // 用于更新searchparams
  const updateFilter = useCallback(
    (key, value) => {

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)   //读取查询字符串
          if (value) {
            next.set(key, String(value))
          } else {
            next.delete(key)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const fetchData = useCallback(async () => {
    const q = query.trim()
    if (!q || fetchingRef.current) return   //如果没输入，或者正在请求，直接返回
    if (!hasMoreRef.current) return

    fetchingRef.current = true
    const page = pageRef.current

    try {
      const result = await searchVideos({
        q,
        category_id: categoryId || undefined,
        date: date || undefined,
        page,
        sort: sort || undefined,
        limit: 12,
      })

      setVideoList((prev) =>
        page === 1 ? result.videos : mergeVideos(prev, result.videos)
      )   //第一页的时候不用merge，第二页开始merge
      hasMoreRef.current = result.hasMore
      setHasMore(result.hasMore)
      setTotalVideos(result.totalVideos)
      pageRef.current = page + 1   //不需要根据pageRef的值渲染内容，所以没有用useState
    } catch (error) {
      if (isRequestCanceled(error)) return
      toast.error('搜索数据获取失败，请稍后尝试~')
    } finally {
      fetchingRef.current = false
    }
  }, [query, categoryId, date, sort,toast])

  useScrollToBottom(fetchData, 20, [videoList.length, hasMore])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setVideoList([])
      setTotalVideos(0)
      return
    }

    pageRef.current = 1
    hasMoreRef.current = true
    setHasMore(true)
    fetchingRef.current = false
    setVideoList([])
    // 每次搜索条件改变的时候，把所有和搜索相关的数据重置
    fetchData()
  }, [query, location.state?.searchTs, date, categoryId, sort, fetchData])

  useEffect(() => {
    getCategories().then(setCategoryList)  
  }, [])   //只在进页面的时候获取一次分类数据

  useEffect(() => {
    if (date || sort) {
      setExpanded(true)
    }
  }, [date, sort])    //选中date和sort的时候,会展开

  const handleCategoryChange = useCallback(
    (id) => updateFilter('category_id', id),
    [updateFilter]
  )   

  const handleDateChange = useCallback(
    (id) => updateFilter('date', id),
    [updateFilter]
  )

  const handleSortChange = useCallback(
    (id) => updateFilter('sort', id),
    [updateFilter]
  )

  return (
    <div className={styles.wrapper}>

      <div className={styles.filterBar}>
        <div className={styles.totalVideos}>
          <div className={styles.totalVideosText}>
            { query ? `[${query}]相关的搜索结果共计${totalVideos}个` : '请输入关键词进行搜索'}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.agentEntry}
            onClick={() => navigate('/Agent')}
          >
            试试智能搜索
          </Button>
        </div>

        <div className={styles.tagsRow}>
          <Tags
            tagList={[{ id: '', name: '全部分区' }, ...categoryList]}
            activeId={categoryId}
            sendData={handleCategoryChange}
          />
        </div>

        <div
          className={`${styles.tagsRow} ${expanded ? styles.expanded : styles.collapsed}`}
        >
          <Tags
            tagList={[
              { id: '', name: '全部时间' },
              { id: 'today', name: '今天' },
              { id: 'week', name: '这周' },
              { id: 'month', name: '这个月' },
            ]}
            activeId={date}
            sendData={handleDateChange}
          />
        </div>

        <div
          className={`${styles.tagsRow} ${expanded ? styles.expanded : styles.collapsed}`}
        >
          <Tags
            tagList={[
              { id: '', name: '不排序' },
              { id: 'relevance', name: '按相关度排序' },
              { id: 'views', name: '按播放量排序' },
              { id: 'likes', name: '按点赞量排序' },
              { id: 'latest', name: '按最新上传排序' },
            ]}
            activeId={sort}
            sendData={handleSortChange}
          />
        </div>

        <Button variant="outline"   
          size  = "lg"      
          className={styles.moreFilter}
          onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? '收起更多筛选条件' : '展开更多筛选条件'}
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </Button>

      </div>

      <div
        className={`${styles.filterSpacer} ${expanded ? styles.filterSpacerExpanded : ''}`}
        aria-hidden="true"
      />

      <div
        className={gridStyles.videoList}
        style={{ marginTop: expanded ? '100px' : '80px' }}
      >
        {videoList.map((item) => (
          <VideoItem key={item.id} {...item} />
        ))}
      </div>

      {!hasMore && videoList.length > 0 && <div className={styles.noMore}>
        <img src={NoMore} alt="no more" />
        <div className={styles.noMoreText}>没有更多了</div>

      </div>}

      { pendingCount === 0 &&  videoList.length === 0 && query.trim() && (
        <div className={styles.noContent}>
          <img src={NoContent} alt="no content" />
          <div className={styles.noContentText}>
            非常抱歉，没有找到和{query}相关的视频
          </div>
        </div>
      )}
    </div>
  )
})

export default Search
