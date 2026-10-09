import Home from "../assets/home.png";
import Video from "../assets/list-video.png";
import TV from "../assets/tv.png";
import User from "../assets/circle-user.png";
import History from "../assets/history.png";
import Like from "../assets/thumb-up-line.png";
import Search from "../assets/search.png";
import Upload from "../assets/stackshare-line.png";
import Collection from "../assets/collection.svg";

/** 侧边栏：支持 children 作为二级菜单 */
export const NAV_ITEMS = [
  { key: "home", path: "/", label: "首页", icon: Home },
  { key: "shorts", path: "/Shorts", label: "Shorts", icon: Video },
  {
    key: "mine",
    path: "/Mine",
    label: "我",
    icon: User,
    children: [
      { key: "mine-home", path: "/Mine", label: "概览", icon: User },
      { key: "history", path: "/Mine/History", label: "历史记录", icon: History },
      { key: "likes", path: "/Mine/Likes", label: "赞过的视频", icon: Like },
      { key: "favorites", path: "/Mine/Favorites", label: "收藏夹", icon: Collection },
      { key: "sub", path: "/Mine/Subscriptions", label: "订阅", icon: TV },
      { key: "upload", path: "/Mine/Upload", label: "上传", icon: Upload },
    ],
  },
  { key: "search", path: "/Search", label: "搜索", icon: Search },
  { key: "agent", path: "/Agent", label: "智能搜索", icon: Search },
  { key: "test-agent", path: "/TestAgent", label: "工具 Agent", icon: Search },
];

export const PATH_TO_NAV_KEY = {
  "/": "home",
  "/Shorts": "shorts",
  "/Mine": "mine-home",
  "/Mine/History": "history",
  "/Mine/Likes": "likes",
  "/Mine/Favorites": "favorites",
  "/Mine/Subscriptions": "sub",
  "/Mine/Upload": "upload",
  "/Search": "search",
  "/Agent": "agent",
  "/TestAgent": "test-agent",
  "/videoPlay": "",
};

export function resolveNavKey(pathname) {
  if (Object.prototype.hasOwnProperty.call(PATH_TO_NAV_KEY, pathname)) {
    return PATH_TO_NAV_KEY[pathname];
  }
  if (pathname.startsWith("/Mine/")) return "mine-home";
  return "";
}

/** 当前应展开的一级菜单 */
export function resolveOpenKeys(pathname) {
  if (pathname === "/Mine" || pathname.startsWith("/Mine/")) return ["mine"];
  return [];
}

export function findNavItemByKey(key) {
  for (const item of NAV_ITEMS) {
    if (item.key === key) return item;
    if (item.children?.length) {
      const child = item.children.find((c) => c.key === key);
      if (child) return child;
    }
  }
  return null;
}
