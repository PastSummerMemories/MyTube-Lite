import { memo, useRef,useEffect,useState } from "react"
import { resolveMediaUrl, resolveThumbnailUrl } from "../../../utils/resolveMediaUrl"

import { PlayIcon } from "lucide-react"

const ShortSlide = memo(({ video,active}) => {

    const videoRef = useRef(null)
    const [paused,setPaused] = useState(true)


    const src = resolveMediaUrl(video.video_url)
    const thumbnail = resolveThumbnailUrl(video.thumbnail,video.video_url)
    const handleTogglePlay = () => {
        setPaused((prev) => !prev)
    }


    useEffect(() => {

        if(active) {
            if(videoRef.current) {
            videoRef.current.play()
            }
        } else {

            if(videoRef.current) {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }
        }
    
    },[active])


    return (

        <section key = {video.id} className = "min-h-full snap-start snap-always short-slide relative">
           
           <div className = "hint" onClick = {handleTogglePlay}>


            {paused && <div className = "w-full h-full bg-white flex items-center justify-center absolute top-0 left-0 opacity-30">
                <PlayIcon className = "w-6 h-6 text-black" />
            </div>}

           <video src= {src || undefined} 
                poster = {thumbnail || undefined}
                className = "w-full h-full object-cover bg-black"
                playsInline
                loop
                ref = {videoRef}
                preload="metadata"
                muted
            ></video> 

           </div>
        </section>

    )
    


})


export default ShortSlide


