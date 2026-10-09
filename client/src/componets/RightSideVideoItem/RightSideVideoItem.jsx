import React, { memo, useEffect, useState } from "react";
import styles from "./RightSideVideo.module.scss";
import { useNavigate } from "react-router-dom";
import { formatViews } from "../../utils/fromatTime";

import { resolveThumbnailUrl } from "../../utils/resolveMediaUrl";

const RightSideVideoItem = memo((props) => {
  const { author, title, views, duration, id, video_url, thumbnail, channel } = props;
  const navigate = useNavigate();
  const resolvedThumb = resolveThumbnailUrl(thumbnail, video_url);
  const [thumbSrc, setThumbSrc] = useState(resolvedThumb);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbSrc(resolvedThumb);
    setThumbFailed(false);
  }, [resolvedThumb]);

  function goToPlayPage() {
    navigate(`/videoPlay?id=${id}`);
    window.scrollTo(0, 0);
  }

  return (
    <article className={styles.item} onClick={goToPlayPage}>
      <div className={styles.thumb}>
        {thumbSrc && !thumbFailed ? (
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div className={styles.noThumb} aria-hidden="true">
            <span className={styles.noThumbIcon}>
              <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
                <path
                  fill="currentColor"
                  d="M8 5v14l11-7L8 5zm2.2 3.4 5.5 3.6-5.5 3.6V8.4z"
                />
              </svg>
            </span>
          </div>
        )}
        {duration && <span className={styles.duration}>{duration}</span>}
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.channel}>{channel || author}</p>
        <p className={styles.views}>{formatViews(views)}</p>
      </div>
    </article>
  );
});

export default RightSideVideoItem;
