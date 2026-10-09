import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  UNSAFE_NavigationContext as NavigationContext,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import {
  contentFadeEnter,
  contentFadeLeave,
  contentFadeReveal,
  hasContentFade,
} from "../../utils/contentFade";
import { bindSoftNavigate, unbindSoftNavigate } from "../../utils/softNavigate";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

function toPath(to) {
  if (typeof to === "string") return to;
  if (!to || typeof to !== "object") return "";
  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

function pathKey(path) {
  return String(path || "").split("#")[0];
}

function currentKey() {
  return pathKey(`${window.location.pathname}${window.location.search}`);
}

/**
 * 拦截 navigator；淡入淡出只作用在 MainLayout 注册的主内容区。
 */
const RouteTransition = memo(function RouteTransition({ children }) {
  const navigationContext = useContext(NavigationContext);
  const location = useLocation();
  const navigationType = useNavigationType();
  const skipRef = useRef(0);
  const inFlightRef = useRef(null);
  const lastKeyRef = useRef(location.key);
  const rawNavigator = navigationContext.navigator;

  const runWithFade = useCallback((apply) => {
    if (skipRef.current > 0 || prefersReducedMotion() || !hasContentFade()) {
      apply();
      return Promise.resolve();
    }
    if (inFlightRef.current) return inFlightRef.current;

    inFlightRef.current = (async () => {
      await contentFadeLeave();
      skipRef.current += 1;
      try {
        apply();
      } finally {
        skipRef.current -= 1;
      }
      await contentFadeEnter();
    })().finally(() => {
      inFlightRef.current = null;
    });

    return inFlightRef.current;
  }, []);

  const patchedNavigator = useMemo(() => {
    const pushOrReplace = (method, to, state) => {
      const next = pathKey(toPath(to));
      if (!next || next === currentKey()) {
        method.call(rawNavigator, to, state);
        return;
      }
      runWithFade(() => method.call(rawNavigator, to, state));
    };

    return {
      ...rawNavigator,
      createHref: (...args) => rawNavigator.createHref(...args),
      encodeLocation: rawNavigator.encodeLocation
        ? (...args) => rawNavigator.encodeLocation(...args)
        : undefined,
      go: (n) => rawNavigator.go(n),
      push(to, state) {
        pushOrReplace(rawNavigator.push, to, state);
      },
      replace(to, state) {
        pushOrReplace(rawNavigator.replace, to, state);
      },
    };
  }, [rawNavigator, runWithFade]);

  const ctx = useMemo(
    () => ({ ...navigationContext, navigator: patchedNavigator }),
    [navigationContext, patchedNavigator]
  );

  useEffect(() => {
    bindSoftNavigate((to, options = {}) => {
      const { replace = false, state } = options;
      if (replace) patchedNavigator.replace(to, state);
      else patchedNavigator.push(to, state);
    });
    return () => unbindSoftNavigate();
  }, [patchedNavigator]);

  useEffect(() => {
    if (location.key === lastKeyRef.current) return;
    lastKeyRef.current = location.key;

    if (navigationType !== "POP") return;
    if (inFlightRef.current || skipRef.current > 0) return;
    if (!hasContentFade() || prefersReducedMotion()) return;

    let cancelled = false;
    (async () => {
      await contentFadeReveal();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [location.key, navigationType]);

  return (
    <NavigationContext.Provider value={ctx}>{children}</NavigationContext.Provider>
  );
});

export default RouteTransition;
