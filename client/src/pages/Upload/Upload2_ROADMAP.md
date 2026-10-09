# Upload2 打磨路线图

> 基于 shadcn Field 表单的新版上传页，目标：功能对齐旧版 `Upload.jsx`，并作为正式上传入口替换旧页。

---

## 一、当前进度总览

| 模块 | 状态 |
|------|------|
| shadcn Field 表单结构 | ✅ 已完成 |
| 上传接口字段对齐（`thumbnail` / `category_id` / `tags`） | ✅ 已完成 |
| 首帧自动封面（`captureVideoFirstFrame`） | ✅ 已完成 |
| 视频时长 `duration` 读取并提交 | ✅ 已完成 |
| 视频 100MB 大小校验 | ✅ 已完成 |
| 上传进度条 | ✅ 已完成 |
| 提交前封面校验（无封面则拦截） | ✅ 已完成 |
| `coverCapturing` 截帧 loading | ✅ 已完成 |
| 换视频时清空旧封面 state | ✅ 已完成 |
| 截帧中禁用选封面 / 提交 | ✅ 已完成 |
| 移动端上传区竖排（`grid-cols-1 md:grid-cols-2`） | ✅ 已完成 |
| blob URL 卸载清理 | ✅ 已完成 |

**整体完成度：P0 核心能力已通，进入 P1 体验打磨阶段。**

---

## 二、已完成项说明

### 2.1 表单与接口

- 使用 `Field` / `FieldGroup` / `FieldSet` 组织表单
- `FormData` 字段：
  - `video` — 视频文件
  - `thumbnail` — 封面（非 `cover`）
  - `category_id` — 分类（非 `category`）
  - `tags` — 逗号分隔字符串（`tags.join(",")`）
  - `duration` — `mm:ss` 格式

### 2.2 首帧封面

- 工具函数：`@/utils/captureVideoFirstFrame.js`
- 返回 `{ cover, duration }`
- 预览 URL 与截帧 URL **分开创建**，避免 `revokeObjectURL` 误伤预览
- 选视频后自动截帧；失败则提示手动上传

### 2.3 提交前封面兜底（校验型）

```js
if (!coverFile) {
  toast.error("请选择封面文件");
  return;
}
```

含义：无封面不允许提交，用户需手动上传或等待自动截帧成功。

> 注：此为**校验兜底**，非「提交前再自动截一次」。若需更稳，可在 `handleSubmit` 中增加 `captureVideoFirstFrame` 重试。

### 2.4 截帧 Loading

- `coverCapturing` 状态 + `Spinner`
- `try/finally` 确保 loading 关闭
- 换视频时先 `setCoverFile(null)` / `setCoverPreview(null)`
- 截帧中：`onClick={coverCapturing ? undefined : handleCoverSelect}`
- 提交按钮：`disabled={uploading || coverCapturing}`

### 2.5 响应式布局

- 上传区：`grid grid-cols-1 gap-4 md:grid-cols-2`
- SCSS 去掉 `.chooseFile` 的 `display: flex` 和固定 `60%/38%` 宽度
- `label` 需加 `block` 才能使 `mb-*` 生效

---

## 三、待优化项（按优先级）

### P1：交互小修（建议下一步，约 30 分钟）

| 项 | 说明 |
|----|------|
| 预览冒泡 | `<video>` / `<img>` 加 `onClick={(e) => e.stopPropagation()}`，避免点播放控件误触选文件 |
| 封面校验 | `handleCoverChange` 限制 10MB + jpg/png，与视频校验对称 |
| `playsInline` | 预览 `<video>` 加上，改善 iOS |
| 截帧中禁选视频 | `onClick={coverCapturing ? undefined : handleVideoSelect}`，避免连续选文件竞态 |

### P2：清除 / 重选（约 1 小时）

参考旧版 `Upload.jsx`，在视频、封面 label 旁加「清除」按钮：

| 操作 | 行为 |
|------|------|
| 清除视频 | 清视频预览、`coverFile`、`duration`、input value |
| 清除封面 | 清封面；若仍有视频，可重新 `captureVideoFirstFrame` |

可选：增加 `coverIsAuto` 标记，区分手动 / 自动封面。

### P3：移动端（约 30 分钟）

- 提交按钮：`w-full md:w-fit`
- 底部留白：`pb-[calc(56px+env(safe-area-inset-bottom)+1rem)]`（Mine 底栏下更重要）
- 修复 `w-9/10` → `w-full max-w-5xl` 或 `w-[90%]`（`w-9/10` 非合法 Tailwind）
- 分类/标签断点统一为 `max-md:flex-col`（与项目 768px 一致）

### P4：布局 / 路由（体验提升大，约 1～2 小时）

当前问题：Upload2 挂在 `MineLayout` 下，页面顶部仍有头像 + Tab，上传表单空间被挤压；Tab 无 Upload2 入口。

可选方案：

1. 独立路由 `/Upload`（全屏表单）
2. Upload2 路由下隐藏 Mine 的 profile / subNav
3. Mine Tab「上传」指向 Upload2，删除旧 `Upload.jsx`

### P5：代码整理（可放最后）

- 抽 `useUploadForm` Hook（state、handlers、blob 清理）
- `FieldError` 内联校验（替代部分 toast）
- 选视频后用文件名（去扩展名）预填标题
- `computeVideoDuration` 支持超过 1 小时（`h:mm:ss`）
- 删除未使用的 `videoPreviewRef`
- SCSS 与 Tailwind 职责划分：布局用 Tailwind，复杂样式留 SCSS

### P6：锦上添花

- 拖拽上传视频
- 上传前展示文件大小、时长、分辨率
- 离开页面前未提交内容确认（`beforeunload` / 路由拦截）

---

## 四、与旧版 Upload 对比

| 能力 | Upload（旧） | Upload2（新） |
|------|-------------|---------------|
| shadcn Field 表单 | ❌ | ✅ |
| 上传进度 | ✅ | ✅ |
| duration | ✅ | ✅ |
| 文件大小校验 | ✅ | ✅（仅视频） |
| 封面大小校验 | — | ❌ 待做 |
| 清除 / 重选 | ✅ | ❌ 待做 |
| 截帧 loading | ✅ | ✅ |
| 首帧封面 | ✅ | ✅ |
| 预览 stopPropagation | ✅ | ❌ 待做 |
| 移动端适配 | 部分 | 进行中 |

---

## 五、推荐执行顺序

```text
第 1 天  P1：冒泡 + 封面校验 + playsInline + 截帧中禁选视频
第 2 天  P2：清除按钮
第 3 天  P3：移动端按钮 / 留白 / 宽度
第 4 天  P4：路由布局 + 替换旧 Upload
有空时  P5～P6：Hook 抽取、体验增强
```

---

## 六、关键代码参考

### 6.1 引入 Spinner

```jsx
import { Spinner } from "@/components/ui/spinner";
```

### 6.2 封面区 loading UI

```jsx
{coverCapturing ? (
  <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
    <Spinner className="size-6" />
    <span>正在生成封面…</span>
  </div>
) : coverPreview ? (
  <img src={coverPreview} alt="封面预览" />
) : (
  <div>点击选择封面</div>
)}
```

### 6.3 选视频时截帧

```js
setCoverCapturing(true);
setCoverFile(null);
setCoverPreview(null);

try {
  // ... 设置 videoPreview
  const { cover, duration } = await captureVideoFirstFrame(file);
  setDuration(duration);
  if (!cover) {
    toast.message("未能自动截取封面，请手动上传一张");
    return;
  }
  setCoverFile(cover);
  setCoverPreview(URL.createObjectURL(cover));
} finally {
  setCoverCapturing(false);
}
```

### 6.4 blob URL 注意点

- 预览与截帧**不要共用**同一个 blob URL
- 截帧函数内部 `revoke` 自己的 URL，不影响预览
- 换文件 / 卸载组件时 `URL.revokeObjectURL`

---

## 七、相关文件

| 文件 | 说明 |
|------|------|
| `Upload2.jsx` | 主页面 |
| `Upload2.module.scss` | 上传区样式 |
| `cpns/TagsInput.jsx` | 标签输入 |
| `@/utils/captureVideoFirstFrame.js` | 首帧截取 + 时长 |
| `Upload.jsx` | 旧版上传（待替换） |
| `MineLayout.jsx` | 当前父布局 |

---

*最后更新：与 Upload2 打磨对话同步整理*
