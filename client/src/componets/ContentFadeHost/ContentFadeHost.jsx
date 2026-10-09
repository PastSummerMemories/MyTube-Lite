import React, { memo, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  bindContentFade,
  unbindContentFade,
} from "../../utils/contentFade";
import { sleep } from "../../utils/softNavigate";
import styles from "./ContentFadeHost.module.scss";

const FADE_MS = 220;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

/**
 * 挂在 MainLayout 的 <main> 内：遮罩只盖住主内容，不影响顶栏与侧栏。
 */
const ContentFadeHost = memo(function ContentFadeHost() {
  const [show, setShow] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const ctrlRef = useRef(null);

  useEffect(() => {
    const reduced = () => prefersReducedMotion();

    const ctrl = {
      async leave() {
        if (reduced()) return;
        setBlocking(true);
        setShow(false);
        await sleep(16);
        setShow(true);
        await sleep(FADE_MS);
      },
      async enter() {
        if (reduced()) {
          setShow(false);
          setBlocking(false);
          return;
        }
        await sleep(40);
        setShow(false);
        await sleep(FADE_MS);
        setBlocking(false);
      },
      async reveal() {
        if (reduced()) return;
        setBlocking(true);
        setShow(true);
        await sleep(16);
        setShow(false);
        await sleep(FADE_MS);
        setBlocking(false);
      },
    };

    ctrlRef.current = ctrl;
    bindContentFade(ctrl);
    return () => unbindContentFade(ctrl);
  }, []);

  return (
    <div className={styles.host}>
      <Outlet />
      <div
        className={`${styles.fade} ${show ? styles.show : ""}`}
        style={{ pointerEvents: blocking ? "auto" : "none" }}
        aria-hidden={!blocking}
      />
    </div>
  );
});

export default ContentFadeHost;
