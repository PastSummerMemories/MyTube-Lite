import React, { memo } from "react";
import {
  Bookmark,
  Bot,
  CircleHelp,
  Clapperboard,
  History,
  Home,
  LogOut,
  MessageSquareText,
  Settings,
  Sparkles,
  ThumbsUp,
  Tv,
  Upload,
  UserRound,
} from "lucide-react";
import styles from "./NavBarList.module.scss";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutAction } from "../../service/APIs";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { resetUser } from "../../store/userSlice";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";
import { softGoLogin, softNavigate } from "../../utils/softNavigate";
import { toast } from "sonner";
import useMediaWidth from "../../hooks/useMedia";

const SITE_LINKS = [
  { name: "首页", Icon: Home, path: "/" },
  { name: "Shorts", Icon: Clapperboard, path: "/Shorts" },
  { name: "智能搜索", Icon: Sparkles, path: "/Agent" },
  { name: "工具 Agent", Icon: Bot, path: "/TestAgent" },
];

const MINE_LINKS = [
  { name: "概览", Icon: UserRound, path: "/Mine" },
  { name: "历史记录", Icon: History, path: "/Mine/History" },
  { name: "赞过的视频", Icon: ThumbsUp, path: "/Mine/Likes" },
  { name: "收藏夹", Icon: Bookmark, path: "/Mine/Favorites" },
  { name: "订阅", Icon: Tv, path: "/Mine/Subscriptions" },
  { name: "上传", Icon: Upload, path: "/Mine/Upload" },
];

function displayEmail(email) {
  const value = String(email || "").trim();
  if (!value) return "";
  if (/^(none|null|undefined)$/i.test(value)) return "";
  return value;
}

const NavBarList = memo(({ onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isNarrow = useMediaWidth(768);
  const token = localStorage.getItem("token");
  const { userName, email, avatar } = useSelector((state) => state.user);
  const avatarSrc = resolveMediaUrl(avatar);
  const fallbackText = (userName || "U").slice(0, 1).toUpperCase();
  const emailText = displayEmail(email);
  const displayName = userName || (token ? "用户" : "游客");

  function go(path) {
    onClose?.();
    navigate(path);
  }

  const menuItems = [
    ...(isNarrow ? SITE_LINKS : []),
    ...MINE_LINKS,
    {
      name: "设置",
      Icon: Settings,
      path: "/Settings",
      requireAuth: true,
    },
    {
      name: "帮助",
      Icon: CircleHelp,
      path: "/Help",
    },
    {
      name: "反馈",
      Icon: MessageSquareText,
      path: "/Feedback",
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.requireAuth || Boolean(token)
  );

  async function handleLogout() {
    onClose?.();
    try {
      await LogoutAction();
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    dispatch(resetUser());
    toast.success("已退出登录", { position: "top-center" });
    await softNavigate("/Mine", { replace: true });
  }

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <button
          type="button"
          className={styles.avatarBtn}
          aria-label="前往我的页面"
          onClick={() => go("/Mine")}
        >
          <Avatar size="lg" className={styles.avatar}>
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
            <AvatarFallback>{fallbackText}</AvatarFallback>
          </Avatar>
        </button>
        <div className={styles.rightSide}>
          <p className={styles.name}>{displayName}</p>
          {emailText ? <p className={styles.email}>{emailText}</p> : null}
          {!token ? (
            <button
              type="button"
              className={styles.loginBtn}
              onClick={() => {
                onClose?.();
                softGoLogin("/Mine");
              }}
            >
              登录账号
            </button>
          ) : (
            <button
              type="button"
              className={styles.channel}
              onClick={() => go("/Mine")}
            >
              查看频道
            </button>
          )}
        </div>
      </div>

      <div className={styles.menu}>
        {visibleItems.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              type="button"
              className={styles.listItem}
              key={item.name}
              onClick={() => go(item.path)}
            >
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon size={18} strokeWidth={1.85} />
              </span>
              <span className={styles.itemLabel}>{item.name}</span>
            </button>
          );
        })}
      </div>

      {token ? (
        <>
          <div className={styles.divider} />
          <button
            type="button"
            className={`${styles.listItem} ${styles.logoutItem}`}
            onClick={handleLogout}
          >
            <span className={styles.iconWrap} aria-hidden="true">
              <LogOut size={18} strokeWidth={1.85} />
            </span>
            <span className={styles.itemLabel}>退出账号</span>
          </button>
        </>
      ) : null}
    </div>
  );
});

export default NavBarList;
