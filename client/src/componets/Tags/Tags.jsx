import React, { memo, useCallback, useEffect, useState } from "react";
import styles from "./Tags.module.scss";

const Tags = memo(({ tagList = [], sendData, customStyles, className, activeId, variant }) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = activeId !== undefined;

  const activeIndex = isControlled
    ? Math.max(
        0,
        tagList.findIndex((item) => String(item.id) === String(activeId))
      )
    : internalIndex;

  const handleClick = useCallback(
    (e) => {
      const el = e.target.closest("[data-index]");
      if (!el) return;

      const index = parseInt(el.dataset.index, 10);
      if (Number.isNaN(index) || index < 0 || index >= tagList.length) return;

      if (!isControlled) {
        setInternalIndex(index);
      }
      sendData?.(tagList[index].id);
    },
    [tagList, sendData, isControlled]
  );

  return (
    <div
      className={[
        styles.tags,
        variant === "text" ? styles.tagsText : "",
        variant === "side" ? styles.tagsSide : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={customStyles}
      onClick={handleClick}
    >
      {tagList.map((item, index) => (
        <span
          key={item.id}
          data-index={index}
          className={activeIndex === index ? styles.activeStyle : ""}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
});

export default Tags;
