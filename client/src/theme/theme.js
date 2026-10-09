export const THEME_STORAGE_KEY = "mytube-theme";

export function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // 隐私模式等场景下读不到本地存储时，保持当前深色外观
  }
  return "dark";
}

export function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // 写不进去也不影响当次切换
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", next === "light" ? "#f6f3ee" : "#0e1012");
  }

  return next;
}
