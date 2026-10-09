import React, { memo, useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import DanmuJs from "danmu.js"
import { parseVideoUrl } from './parseVideoUrl'
import styles from "./VideoPlayer3.module.scss";
import { Pause, Play, Volume2, VolumeX, Maximize, Minimize, Settings2,Captions,CaptionsOff} from 'lucide-react';


function getFullScreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  )
}

async function requestFs(el) {
  if (el.requestFullscreen) return el.requestFullscreen()
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
  if (el.msRequestFullscreen) return el.msRequestFullscreen()
}

async function exitFs() {

  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();

}


function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0)
    return "00:00"

  const total = Math.floor(sec)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return `${String(minutes).padStart(2, 0)}:${String(seconds).padStart(2, 0)}`
}

const VideoPlayer3 = memo(forwardRef(function videoPlayer3({
  video_url,
  videoId,
  thumbnail,
  qualities,
  onSendDanmaku,
  danmuComments = [],
  danmakuEnabled = true
},ref)  {

  const media = useMemo(() => {
    return parseVideoUrl(video_url, thumbnail, qualities)
  }, [video_url, thumbnail, qualities])

  const qualityList = media?.qualities || []
  const [qualityId, setQualityId] = useState(qualityList[0]?.id || "")
  const [qualityOpen, setQualityOpen] = useState(false)
  const activeQuality = qualityList.find((q) => q.id === qualityId) || qualityList[0]

  useEffect(() => {
    if (!qualityList.length)
      return
    setQualityId((prev) => qualityList.some((q) => q.id === prev) ? prev : qualityList[0].id)
  }, [qualityList])

  // 切换清晰度的函数
  function switchQuality(q) {

    const v = videoRef.current
    if (!v || !q?.src || q.id === activeQuality?.id) {
      setQualityOpen(false)
      return
    }

    const wasPlaying = !v.paused
    const t = v.currentTime

    setQualityId(q.id)
    setQualityOpen(false)

    const onLoaded = () => {
      v.currentTime = t
      if (wasPlaying)
        v.play().catch(() => {
          console.log('errored occured')
        })
      v.removeEventListener("loadedmetadata", onLoaded)
    }

    v.addEventListener("loadedmetadata", onLoaded)
    v.src = q.src
    v.load()
    showControls()
  }


  function closeQualityMenu() {
    setQualityOpen(false)
  }

  const rootRef = useRef(null)
  const [browserFs, setBrowserFs] = useState(false)

  const videoRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [controlVisible, setControlVisible] = useState(true)
  const hideTimeRef = useRef(null)
  const [volumeHudVisible, setVolumeHudVisible] = useState(false)
  const volumeHudTimerRef = useRef(null)


  // 弹幕
  const layerRef = useRef(null)
  const danmuRef = useRef(null)
  const [danmakuOn,setDanmakuOn] = useState(true)
  useEffect(() => {

    if(!videoId || !danmakuEnabled)
        return
    
    const video = videoRef.current
    const layer = layerRef.current
    if(!video || !layer)
      return

    const instance = new DanmuJs({
      container:layer,
      player:video,
      comments:danmuComments ?? [],
      defaultOff:false,
      area:{ start:0,end: 0.85 },
      channelSize:40
    })

    danmuRef.current = instance
    instance.start()
    instance.setOpacity(danmakuOn ? 1 :0)
    if(video.paused)
        instance.pause()

    const onPause = () => instance.pause()
    const onPlay = () => instance.play()
    video.addEventListener("pause",onPause)
    video.addEventListener("play",onPlay)

    return () => {
      video.removeEventListener("pause",onPause)
      video.removeEventListener("play",onPlay)
      instance.stop()
      danmuRef.current = null
    }

  },[videoId,danmakuEnabled,danmuComments])

  useEffect(() => {
    danmuRef.current?.setOpacity?.(danmakuOn ? 1 : 0)
  },[danmakuOn])

  // 全屏时在视频控件中显示发送弹幕的输入框
  const [fsText,setFsText] = useState("")
  const [fsSending,setFsSending] = useState(false)

  async function handleFsSend(e) {
    e.preventDefault()

    const text = fsText.trim()
    if(!text || !onSendDanmaku || fsSending)
        return

    setFsSending(true)
    try {
      await onSendDanmaku(text); // 父组件里会取 currentTime、发请求、pushDanmaku
      setFsText("");
    } finally {
      setFsSending(false);
    }
    showControls();

  }

  // 显示控件，两秒后隐藏
  function showControls() {
    setControlVisible(true)
    if (hideTimeRef.current)
      window.clearTimeout(hideTimeRef.current)

    hideTimeRef.current = window.setTimeout(() => {
      const v = videoRef.current
      if (v && !v.paused)
        setControlVisible(false)
    }, 2000)
  }


  useEffect(() => {

    const onKey = (e) => {
      if (!rootRef.current)
        return

      const tag = e.target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" && tag !== "range")
        return

      // 只有鼠标在播放器上、或播放器被聚焦、或正在全屏时才响应
      const inPlayer = rootRef.current.contains(document.activeElement) || rootRef.current.matches(":hover") || browserFs

      if (!inPlayer)
        return

      const key = e.key.toLowerCase()

      switch (key) {

        case " ":
        case "k":
          if (e.repeat) return
          e.preventDefault()
          togglePlay()
          return
        case "arrowleft": {
          const v = videoRef.current
          if (!v)
            break
          e.preventDefault()
          v.currentTime = Math.max(0, v.currentTime - 5)
          setCurrent(v.currentTime)
          showControls()
          break;
        }

        case "arrowright": {
          const v = videoRef.current
          if (!v)
            break
          e.preventDefault()
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 5)
          setCurrent(v.currentTime)
          showControls()
          break;
        }

        case "arrowup": {

          const v = videoRef.current
          if (!v)
            break
          e.preventDefault()
          v.volume = Math.min(1, (v.muted ? 0 : v.volume) + 0.05)
          v.muted = false
          setVolume(v.volume)
          setMuted(false)
          showControls()
          flashVolumeHod()
          break
        }

        case "arrowdown": {

          const v = videoRef.current
          if (!v)
            break
          e.preventDefault()
          v.volume = Math.max(0, (v.muted ? 0 : v.volume) - 0.05)
          setVolume(v.volume)
          setMuted(v.volume === 0)
          showControls()
          flashVolumeHod()
          break
        }


        case "m":
          if (e.repeat) return;
          e.preventDefault();
          toggleMute();
          flashVolumeHod()
          break;

        case "f": {
          if (e.repeat)
            return
          e.preventDefault()
          toggleFullScreen()
          break
        }

        default:
          break

      }

    }


    window.addEventListener("keydown", onKey)

    return () => {
      window.removeEventListener("keydown", onKey)
    }

  }, [browserFs, playing, volume, muted, duration])


  useEffect(() => {
    const onFsChange = () => {
      const fsEl = getFullScreenElement()
      setBrowserFs(Boolean(fsEl && fsEl === rootRef.current))
      showControls()

      window.setTimeout(resizeDanmaku,50)
    }

    const resizeDanmaku = () => {
      const inst = danmuRef.current
      if(!inst)
        return
      if (typeof inst.resize === "function") inst.resize();
      else if (typeof inst.update === "function") inst.update();
    
    }


    document.addEventListener("fullscreenchange", onFsChange)
    document.addEventListener("webkitfullscreenchange", onFsChange)


    return () => {
      document.removeEventListener("fullscreenchange", onFsChange)
      document.removeEventListener("webkitfullscreenchange", onFsChange)
    }
  }, [])


  useEffect(() => {

    return () => {
      if (hideTimeRef.current)
        window.clearTimeout(hideTimeRef.current)
    }
  }, [])

  useEffect(() => {

    const v = videoRef.current

    if (!v)
      return

    const onPlay = () => {
      setPlaying(true)
      showControls()
    }
    const onPause = () => {
      setPlaying(false)
      setControlVisible(true)
      if (hideTimeRef.current)
        window.clearTimeout(hideTimeRef.current)
    }
    const onTimeUpdate = () => setCurrent(v.currentTime || 0)
    const onLoadedMetadata = () => setDuration(v.duration || 0)
    const onVolumeChange = () => {
      setMuted(v.muted || v.volume === 0)
      setVolume(v.muted ? 0 : v.volume)
    }

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('volumechange', onVolumeChange)

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("volumechange", onVolumeChange);
    }
  }, [media.videoUrl])


  useEffect(() => {

    return () => {
      if (hideTimeRef.current) window.clearTimeout(hideTimeRef.current)
      if (volumeHudTimerRef.current) window.clearTimeout(volumeHudTimerRef.current)
    }
  }, [])


  async function toggleFullScreen() {

    const root = rootRef.current
    if (!root)
      return

    try {
      if (getFullScreenElement() === root) {
        await exitFs()
      } else {
        await requestFs(root)
      }
    } catch (err) {
      console.warn('fullscreen failed:', err)
    }

    showControls()
  }


  function togglePlay() {
    const v = videoRef.current
    if (!v)
      return
    if (v.paused)
      v.play().catch(() => {
        console.log('error')
      })
    else
      v.pause()

    showControls()
  }


  function onSeek(e) {
    const v = videoRef.current
    if (!v || !duration)
      return
    const next = Number(e.target.value)
    v.currentTime = next
    setCurrent(next)

    showControls()
  }


  function toggleMute() {
    const v = videoRef.current
    if (!v)
      return
    v.muted = !v.muted

    showControls()
  }


  function onVolumeInput(e) {
    const v = videoRef.current
    if (!v)
      return
    const next = Number(e.target.value)
    v.volume = next
    v.muted = next === 0
    setVolume(next)
    setMuted(next === 0)

    showControls()
  }


  function flashVolumeHod() {
    setVolumeHudVisible(true)
    showControls()
    if (volumeHudTimerRef.current) {
      window.clearTimeout(volumeHudTimerRef.current)
    }

    volumeHudTimerRef.current = window.setTimeout(() => {
      setVolumeHudVisible(false)
    }, 1200)
  }


  const progress = duration > 0 ? (current / duration) * 100 : 0



  useImperativeHandle(
    ref,
    () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      setDanmakuVisible: (visible) => {
        setDanmakuOn(Boolean(visible));
        danmuRef.current?.setOpacity?.(visible ? 1 : 0);
      },
      pushDanmaku: (item) => {
        if (!item || !danmuRef.current) return;
        danmuRef.current.sendComment(item);
      }
    }),
    []

  )


  return (

    <div
      ref={rootRef}
      className={`${styles.player} ${controlVisible ? styles.showControls : styles.hideControls} ${browserFs ? styles.isFullscreen : ""}`}
      onMouseMove={showControls}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v && !v.paused) setControlVisible(false);
      }}
    >

      <video className={styles.video} src={activeQuality?.src || ""} poster={media?.posterUrl || ""} playsInline preload="metadata" ref={videoRef}
        onClick={() => {
          togglePlay()
          closeQualityMenu()
        }}
      >

      </video>


      <div ref = {layerRef} className = {styles.danmakuLayer} aria-hidden = "true"></div>



      {volumeHudVisible && <div className={styles.volumeHud} aria-live="polite">
        {muted || volume === 0 ? (
          <VolumeX size={28}></VolumeX>
        ) : <div className = {styles.innerHud}>
          <Volume2 size = {28} style = {{
            marginRight:'10px'
          }}></Volume2>
          {Math.round(muted ? 0 : volume * 100)}%</div>}

      </div>}

      <div className={styles.controls}>

        <button type="button" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <Pause size={18}></Pause> : <Play size={18} />}
        </button>

        <input
          className={styles.seek}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onSeek}
          style={{ "--val": duration > 0 ? current / duration : 0 }}
          aria-label="进度"
        />

        <span className={styles.time}>
          {formatTime(current)} / {formatTime(duration)}
        </span>

        <div className={`${styles.volumeWrap} ${volumeHudVisible ? styles.volumeWrapOpen : ""}`}>
          <div className={styles.volumePanel}>
            <input
              type="range"
              className={styles.volume}
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={onVolumeInput}
              style={{ "--val": muted ? 0 : volume }}
              aria-label="音量"
            />
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted || volume === 0 ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
        </div>


        {browserFs && typeof onSendDanmaku === "function" && (
        <form className={styles.fsDanmaku} onSubmit={handleFsSend}>
          <input
            className={styles.fsInput}
            value={fsText}
            maxLength={200}
            placeholder="发个弹幕吧"
            onChange={(e) => setFsText(e.target.value)}
            onFocus={showControls}
            onKeyDown={(e) => e.stopPropagation()} // 避免空格触发播停
          />
          <button
            type="submit"
            className={styles.fsSend}
            disabled={fsSending || !fsText.trim()}
          >
            {fsSending ? "..." : "发送"}
          </button>
        </form>
      )}



        {
          qualityList.length > 0 && (
            <div className={styles.menuWrap}>
              <button
                type="button"
                aria-label="清晰度"
                aria-expanded={qualityOpen}
                onClick={() => {
                  setQualityOpen((o) => !o);
                  showControls();
                }}
              >
                <Settings2 size={16} />
                <span>{activeQuality?.label || "清晰度"}</span>
              </button>

              {qualityOpen && (
                <div className={styles.menu} role="menu">
                  {qualityList.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={q.id === activeQuality?.id}
                      className={`${styles.menuItem} ${
                        q.id === activeQuality?.id ? styles.menuItemActive : ""
                      }`}
                      onClick={() => switchQuality(q)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }


        <button type = "button"
          onClick = {() => {
            const next = danmakuOn ? false : true
            setDanmakuOn(prev => !prev)
            danmuRef.current?.setOpacity?.(next ? 1 : 0)
            showControls()
          }}
          aria-label = {danmakuOn ? "关闭弹幕" : "开启弹幕"}
        >
          {danmakuOn ? <Captions size = {18}/> : <CaptionsOff size = {18}/>}

        </button>


        <button type="button" onClick={toggleFullScreen} aria-label={browserFs ? "退出全屏" : "全屏播放"}>
          {browserFs ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
      </div>


    </div>
  )


}))

export default VideoPlayer3