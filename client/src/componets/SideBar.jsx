import React, { memo, useEffect, useState } from "react";
import useMediaWidth from "../hooks/useMedia";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS, resolveOpenKeys } from "../config/navItem";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import styles from "./SideBar.module.scss";

function NavIcon({ src }) {
  return <img src={src} alt="" className={styles.icon} />;
}

function itemClassName({ isActive }) {
  return cn(styles.item, isActive && styles.itemActive);
}

function childClassName({ isActive }) {
  return cn(styles.item, styles.childItem, isActive && styles.itemActive);
}

function isBottomItemActive(item, pathname) {
  if (item.children?.length) {
    return pathname === "/Mine" || pathname.startsWith("/Mine/");
  }
  if (item.path === "/") return pathname === "/";
  return pathname === item.path;
}

const SideBar = memo(({ variant = "side" }) => {
  const isBottom = variant === "bottom";
  const isNarrow = useMediaWidth(1200);
  const isShow = useSelector((state) => state.sideBar.showBar);
  const { pathname } = useLocation();

  const routeOpenKey = resolveOpenKeys(pathname)[0] || "";
  const [openKeys, setOpenKeys] = useState(() =>
    routeOpenKey ? [routeOpenKey] : []
  );
  const inMineSection =
    pathname === "/Mine" || pathname.startsWith("/Mine/");

  useEffect(() => {
    if (!routeOpenKey) return;
    setOpenKeys((prev) =>
      prev.includes(routeOpenKey) ? prev : [...prev, routeOpenKey]
    );
  }, [routeOpenKey]);

  function setGroupOpen(key, open) {
    setOpenKeys((prev) => {
      if (open) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((k) => k !== key);
    });
  }

  if (isBottom) {
    return (
      <nav className={styles.bottomBar} aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = isBottomItemActive(item, pathname);
          const to = item.path || item.children?.[0]?.path || "#";

          return (
            <NavLink
              key={item.key}
              to={to}
              end={item.path === "/"}
              title={item.label}
              className={cn(styles.bottomItem, active && styles.bottomItemActive)}
              onClick={(e) => {
                if (!to || to === "#") e.preventDefault();
              }}
            >
              {item.icon ? <NavIcon src={item.icon} /> : null}
              <span className={styles.bottomLabel}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }

  if (!isShow) return null;

  return (
    <div
      className={cn(styles.root, isNarrow && styles.collapsed)}
      style={{ width: isNarrow ? 80 : 240 }}
    >
      <aside
        className={styles.sider}
        style={{ width: isNarrow ? 80 : 240 }}
        aria-label="主导航"
      >
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            if (item.children?.length) {
              const open = !isNarrow && openKeys.includes(item.key);

              if (isNarrow) {
                return (
                  <NavLink
                    key={item.key}
                    to={item.path || "#"}
                    title={item.label}
                    className={itemClassName}
                    onClick={(e) => {
                      if (!item.path) e.preventDefault();
                    }}
                  >
                    {item.icon ? <NavIcon src={item.icon} /> : null}
                    <span className={styles.label}>{item.label}</span>
                  </NavLink>
                );
              }

              return (
                <Collapsible
                  key={item.key}
                  open={open}
                  onOpenChange={(nextOpen) => setGroupOpen(item.key, nextOpen)}
                >
                  <CollapsibleTrigger
                    type="button"
                    className={cn(
                      styles.groupTrigger,
                      inMineSection && styles.groupTriggerActive
                    )}
                  >
                    {item.icon ? <NavIcon src={item.icon} /> : null}
                    <span className={styles.label}>{item.label}</span>
                    <svg
                      className={cn(styles.chevron, open && styles.chevronOpen)}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"
                      />
                    </svg>
                  </CollapsibleTrigger>
                  <CollapsibleContent className={styles.children}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.key}
                        to={child.path || "#"}
                        end={child.path === "/Mine"}
                        className={childClassName}
                        onClick={(e) => {
                          if (!child.path) e.preventDefault();
                        }}
                      >
                        {child.icon ? <NavIcon src={child.icon} /> : null}
                        <span className={styles.label}>{child.label}</span>
                      </NavLink>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={item.path || "#"}
                end={item.path === "/"}
                title={item.label}
                className={itemClassName}
                onClick={(e) => {
                  if (!item.path) e.preventDefault();
                }}
              >
                {item.icon ? <NavIcon src={item.icon} /> : null}
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </div>
  );
});

export default SideBar;
