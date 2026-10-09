import React, { memo } from "react";
import { useLocation } from "react-router-dom";
import styles from "./TheaterAtmosphere.module.scss";

/** 放映厅氛围底。首页用纯色，光斑和颗粒留在其它页面。 */
const TheaterAtmosphere = memo(function TheaterAtmosphere() {
  const quiet = useLocation().pathname === "/";

  return (
    <div className={styles.root} aria-hidden="true">
      {quiet ? null : (
        <>
          <div className={styles.glowA} />
          <div className={styles.glowB} />
          <div className={styles.glowC} />
          <div className={styles.vignette} />
          <div className={styles.grain} />
        </>
      )}
    </div>
  );
});

export default TheaterAtmosphere;
