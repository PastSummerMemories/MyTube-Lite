import React, { memo, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogoutAction, getUserInfo } from "../../service/APIs.js";
import {
  changeAvatar,
  changeEmail,
  changeId,
  changeUserName,
  resetUser,
} from "../../store/userSlice";
import { API_BASE } from "../../config";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softGoLogin, softNavigate } from "../../utils/softNavigate";
import { toast } from "sonner";
import styles from "./Mine.module.scss";

const MINE_TABS = [
  { to: "/Mine", label: "概览", end: true },
  { to: "/Mine/History", label: "历史记录" },
  { to: "/Mine/Likes", label: "赞过" },
  { to: "/Mine/Favorites", label: "收藏夹" },
  { to: "/Mine/Subscriptions", label: "订阅" },
  { to: "/Mine/Upload", label: "上传" },
];

function resolveAvatarUrl(avatar) {
  if (!avatar) return null;
  return avatar.startsWith("http") ? avatar : `${API_BASE}${avatar}`;
}

const MineLayout = memo(() => {
  const location = useLocation();
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const { userName, email, avatar } = useSelector((state) => state.user);
  const avatarSrc = resolveAvatarUrl(avatar);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getUserInfo();
        if (cancelled || !res?.id) return;
        dispatch(changeUserName(res.username));
        dispatch(changeEmail(res.email));
        dispatch(changeAvatar(res.avatar));
        dispatch(changeId(res.id));
      } catch (error) {
        if (isRequestCanceled(error) || cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  async function handleLogout() {
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

  if (!token) {
    const redirectPath = location.pathname + location.search;
    return (
      <div className={`${styles.guestPage} pageEnterSoft`}>
        <div className={styles.guestCard}>
          <div className={styles.guestIcon}>
            <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM8 16V4h12v12H8ZM4 20V6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2H4Zm13-10-5-3v6l5-3Z"
              />
            </svg>
          </div>
          <h1 className={styles.guestTitle}>登录后查看你的内容</h1>
          <p className={styles.guestDesc}>
            登录即可同步观看历史、管理收藏与订阅，并上传视频
          </p>
          <button
            type="button"
            className={styles.signInBtn}
            onClick={() => softGoLogin(redirectPath || "/Mine")}
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.profile}>
        <div className={styles.profileMain}>
          <div className={styles.profileAvatar}>
            {avatarSrc ? (
              <img src={avatarSrc} alt={userName} />
            ) : (
              <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.profileName}>{userName}</h1>
            <p className={styles.profileEmail}>
              {email !== "none" ? email : ""}
            </p>
            <button type="button" className={styles.channelLink}>
              查看频道
            </button>
          </div>
        </div>
        <div className={styles.profileActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleLogout}
          >
            退出登录
          </button>
          <button type="button" className={styles.actionBtnSecondary}>
            切换账号
          </button>
        </div>
      </section>

      <nav className={styles.subNav} aria-label="我的内容">
        {MINE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={Boolean(tab.end)}
            className={({ isActive }) =>
              `${styles.subNavLink} ${isActive ? styles.subNavLinkActive : ""}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.subOutlet}>
        <Outlet />
      </div>
    </div>
  );
});

export default MineLayout;
