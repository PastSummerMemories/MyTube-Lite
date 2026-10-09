import React, { memo, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./NavBar.module.scss";
import Icon from "./Icon";
import { useTheme } from "../theme/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSelector } from "react-redux";
import NavBarList from "./NavBarList/NavBarList";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";

const HEADER_LINKS = [
  { to: "/", label: "首页", end: true },
  { to: "/Shorts", label: "Shorts" },
  { to: "/Agent", label: "智能搜索" },
  { to: "/TestAgent", label: "工具 Agent" },
];

const NavBar = memo(() => {
  const [keyword, setKeyword] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { avatar, userName } = useSelector((state) => state.user);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const avatarSrc = resolveMediaUrl(avatar);
  const fallbackText = (userName || "U").slice(0, 1).toUpperCase();

  useEffect(() => {
    if (location.pathname === "/Search") {
      setKeyword(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  function handleSearch(e) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;

    navigate(`/Search?q=${encodeURIComponent(q)}`, {
      state: { searchTs: Date.now() },
    });
  }

  return (
    <header className={styles.container}>
      <div className={styles.left}>
        <Icon />
        <nav className={styles.links} aria-label="主导航">
          {HEADER_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <div className={styles.searchBox}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn} aria-label="搜索">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className={styles.right}>
        <button type="button" className={styles.iconBtn} aria-label="更多">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.themeBtn}
          aria-label={isDark ? "切换到白天模式" : "切换到黑夜模式"}
          title={isDark ? "切换到白天" : "切换到黑夜"}
          onClick={toggleTheme}
        >
          {isDark ? (
            <Sun size={22} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Moon size={22} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
        <Popover open={accountOpen} onOpenChange={setAccountOpen}>
          <PopoverTrigger
            className={styles.avatarBtn}
            aria-label="账号"
          >
            <Avatar size="default">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
              <AvatarFallback>{fallbackText}</AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-auto max-w-none gap-0 p-0"
          >
            <NavBarList onClose={() => setAccountOpen(false)} />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
});

export default NavBar;
