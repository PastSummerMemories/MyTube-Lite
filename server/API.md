# YouTube Clone API 接口文档

## 概述


| 项目     | 说明                                     |
| -------- | :--------------------------------------- |
| 基础 URL | `http://localhost:5000`                  |
| API 前缀 | `/api`                                   |
| 静态资源 | `/uploads`（视频、封面、头像）           |
| 数据格式 | JSON（上传接口为 `multipart/form-data`） |
| 默认端口 | `5000`（可通过 `PORT` 环境变量修改）     |
| 统一响应 | `{ code, message, data }`，`code` 与 HTTP 状态码一致 |


成功示例：

```json
{
  "code": 200,
  "message": "ok",
  "data": { "videos": [], "hasMore": false }
}
```

失败示例：

```json
{
  "code": 401,
  "message": "未登录",
  "data": null
}
```


---

## 认证说明

需要登录的接口，请在请求头携带 JWT：

```http
Authorization: Bearer <token>
```


| 说明        | 值                    |
| --------- | -------------------- |
| Token 有效期 | 7 天                  |
| 获取方式      | 注册 / 登录接口返回的 `token` |
| 前端存储      | `localStorage.token` |


**常见错误：**


| HTTP 状态码 | 含义             |
| -------- | -------------- |
| `401`    | 未登录 / 凭证无效     |
| `403`    | 无权限 / Token 过期 |
| `404`    | 资源不存在          |
| `500`    | 服务器错误          |


---

## 通用数据结构

### Video（视频）

列表/详情中常见字段（部分接口会 JOIN 频道信息）：


| 字段               | 类型            | 说明                                      |
| ---------------- | ------------- | --------------------------------------- |
| `id`             | number        | 视频 ID                                   |
| `channel_id`     | number        | 所属频道 ID                                 |
| `title`          | string        | 标题                                      |
| `description`    | string        | 描述                                      |
| `thumbnail`      | string        | 封面 URL（如 `/uploads/thumbnails/xxx.jpg`） |
| `video_url`      | string        | 视频 URL（如 `/uploads/videos/xxx.mp4`）     |
| `duration`       | string        | 时长，如 `12:34`                            |
| `category_id`    | number | null | 分类 ID                                   |
| `author`         | string        | 作者名                                     |
| `views`          | number        | 播放量                                     |
| `likes`          | number        | 点赞数                                     |
| `uploaded_at`    | string        | 上传时间                                    |
| `channel`        | string        | 频道名称（JOIN 字段）                           |
| `channel_avatar` | string        | 频道头像（JOIN 字段）                           |


完整 URL 示例：`http://localhost:5000/uploads/videos/xxx.mp4`

### User（用户）


| 字段         | 类型     | 说明     |
| ---------- | ------ | ------ |
| `id`       | number | 用户 ID  |
| `username` | string | 用户名    |
| `email`    | string | 邮箱     |
| `avatar`   | string | 头像 URL |


---

## 1. 用户 `/api/users`

### 1.1 注册

- **POST** `/api/users/register`
- **认证**：否

**请求体（JSON）：**

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456"
}
```

**成功响应 `200`：**

```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

> 注册成功后会自动创建同名频道。

---

### 1.2 登录

- **POST** `/api/users/login`
- **认证**：否

**请求体（JSON）：**

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

**成功响应 `200`：**

```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "https://picsum.photos/seed/testuser/40/40"
  }
}
```

---

### 1.3 获取当前用户信息

- **GET** `/api/users/me`
- **认证**：是（Header 带 Token；通过数据库 `users.token` 校验）

**成功响应 `200`：**

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "avatar": "/uploads/avatars/xxx.jpg"
}
```

---

### 1.4 退出登录

- **POST** `/api/users/logout`
- **认证**：是

**成功响应 `200`：**

```json
{
  "success": true,
  "message": "退出登录成功"
}
```

---

### 1.5 更新用户信息

- **POST** `/api/users/update`
- **认证**：是
- **Content-Type**：`multipart/form-data`


| 字段         | 类型     | 必填  | 说明                 |
| ---------- | ------ | --- | ------------------ |
| `username` | string | 否   | 新用户名               |
| `email`    | string | 否   | 新邮箱                |
| `avatar`   | file   | 否   | 头像图片（JPG/PNG/WebP） |


**成功响应 `200`：**

```json
{
  "message": "更新成功",
  "user": {
    "id": 1,
    "username": "newname",
    "email": "new@example.com",
    "avatar": "/uploads/avatars/xxx.jpg"
  }
}
```

---

### 1.6 修改密码

- **POST** `/api/users/change-password`
- **认证**：是

**请求体（JSON）：**

```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

**成功响应 `200`：**

```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

---

## 2. 视频 `/api/videos`

### 2.1 首页视频列表（分页）

- **GET** `/api/videos`
- **认证**：否

**Query 参数：**


| 参数      | 类型     | 默认   | 说明   |
| ------- | ------ | ---- | ---- |
| `page`  | number | `1`  | 页码   |
| `limit` | number | `12` | 每页条数 |


**成功响应 `200`：**

```json
{
  "videos": [ /* Video[] */ ],
  "currentPage": 1,
  "totalVideos": 100,
  "totalPages": 9,
  "hasMore": true
}
```

---

### 2.2 Shorts 短视频流

- **GET** `/api/videos/shorts`
- **认证**：否

优先返回时长 ≤ `max_seconds` 的视频；若库中没有短视频，则回退为最新视频列表（保证页面有内容）。

**Query 参数：**


| 参数            | 类型     | 默认   | 说明                |
| ------------- | ------ | ---- | ----------------- |
| `page`        | number | `1`  | 页码                |
| `limit`       | number | `10` | 每页条数（最大 `30`）     |
| `max_seconds` | number | `60` | 短视频时长上限（秒，最大 `180`） |


**成功响应 `200`：**

```json
{
  "videos": [ /* Video[] */ ],
  "currentPage": 1,
  "totalVideos": 20,
  "totalPages": 2,
  "hasMore": true,
  "isShortsOnly": true
}
```

`isShortsOnly`：`true` 表示结果来自短时长筛选；`false` 表示已回退为全部最新视频。

---

### 2.3 高级搜索视频

- **GET** `/api/videos/search`
- **认证**：否

支持关键词、分类、标签、上传时间、排序与分页；各筛选条件可组合使用。

**Query 参数：**


| 参数            | 类型     | 默认   | 说明                              |
| ------------- | ------ | ---- | ------------------------------- |
| `q`           | string | —    | 关键词，模糊匹配 **标题 / 描述 / 作者 / 频道名** |
| `category_id` | number | —    | 按分类 ID 筛选                       |
| `tag_id`      | number | —    | 按标签 ID 筛选                       |
| `date`        | string | —    | 上传时间：`today` / `week` / `month` |
| `sort`        | string | 见下方  | 排序方式                            |
| `page`        | number | `1`  | 页码                              |
| `limit`       | number | `12` | 每页条数（最大 `50`）                   |


`**sort` 可选值：**


| 值           | 说明                                |
| ----------- | --------------------------------- |
| `relevance` | 相关度（有 `q` 时默认；标题 > 频道名 > 作者 > 描述） |
| `latest`    | 最新上传（无 `q` 时默认）                   |
| `views`     | 播放量从高到低                           |
| `likes`     | 点赞数从高到低                           |


**请求示例：**

```http
GET /api/videos/search?q=react&category_id=2&sort=views&page=1&limit=12
GET /api/videos/search?date=week&sort=latest
GET /api/videos/search?tag_id=3&q=教程
```

**成功响应 `200`：**

```json
{
  "videos": [ /* Video[] */ ],
  "currentPage": 1,
  "totalVideos": 25,
  "totalPages": 3,
  "hasMore": true,
  "query": {
    "q": "react",
    "category_id": 2,
    "tag_id": null,
    "date": null,
    "sort": "views"
  }
}
```

> **Breaking change**：旧版直接返回 `Video[]` 数组；现改为与首页列表一致的分页对象，前端需使用 `res.videos` 取结果。

---

### 2.3 获取单个视频详情

- **GET** `/api/videos/:id`
- **认证**：否

**成功响应 `200`：** 单个 `Video` 对象

---

### 2.4 获取当前用户上传的视频

- **GET** `/api/videos/my/videos`
- **认证**：是

**成功响应 `200`：** `Video[]`

---

### 2.5 获取视频评论树（嵌套结构）

- **GET** `/api/videos/video/:videoId`
- **认证**：否

**成功响应 `200`：** 评论数组，每条顶级评论含 `replies` 嵌套字段

```json
[
  {
    "id": 1,
    "user_id": 2,
    "video_id": 10,
    "content": "很好看的视频",
    "parent_id": null,
    "created_at": "2025-01-01T12:00:00.000Z",
    "username": "user2",
    "avatar": "...",
    "replies": [
      {
        "id": 2,
        "content": "同意",
        "replies": []
      }
    ]
  }
]
```

---

### 2.6 编辑视频

- **PUT** `/api/videos/:id`
- **认证**：是（仅视频所属频道作者）
- **Content-Type**：`multipart/form-data`


| 字段            | 类型     | 必填  | 说明    |
| ------------- | ------ | --- | ----- |
| `title`       | string | 否   | 标题    |
| `description` | string | 否   | 描述    |
| `category_id` | number | 否   | 分类 ID |
| `thumbnail`   | file   | 否   | 新封面   |


**成功响应 `200`：**

```json
{
  "message": "视频更新成功"
}
```

---

### 2.7 删除视频

- **DELETE** `/api/videos/:id`
- **认证**：是（仅作者）

**成功响应 `200`：**

```json
{
  "message": "视频删除成功"
}
```

---

## 3. 视频上传 `/api/upload`

### 3.1 上传视频

- **POST** `/api/upload/video`
- **认证**：是
- **Content-Type**：`multipart/form-data`
- **文件大小限制**：100 MB


| 字段            | 类型     | 必填  | 说明                     |
| ------------- | ------ | --- | ---------------------- |
| `video`       | file   | 是   | 视频文件（MP4/MOV/AVI/WebM） |
| `thumbnail`   | file   | 否   | 封面（JPG/PNG/WebP）       |
| `title`       | string | 是   | 标题                     |
| `description` | string | 否   | 描述                     |
| `duration`    | string | 否   | 时长，默认 `00:00`          |
| `category_id` | number | 否   | 分类 ID                  |
| `tags`        | string | 否   | 标签，逗号分隔，如 `"react,前端"` |


**成功响应 `200`：**

```json
{
  "message": "视频上传成功",
  "videoId": 42
}
```

---

## 4. 观看历史 `/api/history`

### 4.1 添加观看历史

- **POST** `/api/history/add/:videoId`
- **认证**：是

> 同一视频重复观看会先删旧记录再插入，保证 `watched_at` 为最新。

**成功响应 `200`：**

```json
{
  "message": "已添加到观看历史"
}
```

---

### 4.2 获取我的观看历史

- **GET** `/api/history/my`
- **认证**：是

**Query 参数：**


| 参数        | 类型     | 默认   | 说明                              |
| --------- | ------ | ---- | ------------------------------- |
| `page`    | number | `1`  | 页码                              |
| `limit`   | number | `20` | 每页条数                            |
| `keyword` | string | —    | 按视频标题模糊搜索                       |
| `date`    | string | —    | 日期筛选：`today` / `week` / `month` |


**成功响应 `200`：**

```json
{
  "list": [
    {
      "watched_at": "2025-06-01T10:00:00.000Z",
      "id": 10,
      "title": "视频标题",
      "thumbnail": "/uploads/thumbnails/xxx.jpg",
      "duration": "10:30",
      "author": "作者",
      "video_url": "/uploads/videos/xxx.mp4"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### 4.3 删除单条历史

- **DELETE** `/api/history/delete/:videoId`
- **认证**：是

**成功响应 `200`：**

```json
{
  "message": "删除成功"
}
```

---

### 4.4 清空全部历史

- **DELETE** `/api/history/clear`
- **认证**：是

**成功响应 `200`：**

```json
{
  "message": "清空成功"
}
```

---

## 5. 评论 `/api/comments`

> 评论列表请使用 [§2.5](#25-获取视频评论树嵌套结构)（嵌套树）。

### 5.1 发表评论 / 回复

- **POST** `/api/comments/add`
- **认证**：是

**请求体（JSON）：**

```json
{
  "video_id": 10,
  "content": "评论内容",
  "parent_id": null
}
```


| 字段          | 类型     | 必填  | 说明         |
| ----------- | ------ | --- | ---------- |
| `video_id`  | number | 是   | 视频 ID      |
| `content`   | string | 是   | 评论内容       |
| `parent_id` | number | 否   | 回复的目标评论 ID |


**成功响应 `200`：**

```json
{
  "message": "评论发布成功",
  "commentId": 5
}
```

---

### 5.2 点赞 / 取消点赞评论

- **POST** `/api/comments/:commentId/like`
- **认证**：是（切换：已赞则取消，未赞则点赞）

**成功响应 `200`：**

```json
{
  "action": "liked",
  "liked": true,
  "likes": 4,
  "message": "点赞成功"
}
```

取消时 `action` 为 `unliked`，`liked` 为 `false`。

> 登录用户拉取评论树时，每条评论会多 `liked` 字段（`0` / `1`）。

---

### 5.3 删除评论

- **DELETE** `/api/comments/:commentId`
- **认证**：是（评论作者或视频作者可删）

**成功响应 `200`：**

```json
{
  "message": "删除评论成功"
}
```

---

## 6. 频道 `/api/channels`

### 6.1 获取所有频道

- **GET** `/api/channels`
- **认证**：否

**成功响应 `200`：** `Channel[]`

---

### 6.2 获取单个频道

- **GET** `/api/channels/:id`
- **认证**：否

**成功响应 `200`：** 单个频道对象

---

## 7. 频道主页 `/api/channel`

### 7.1 获取频道详情

- **GET** `/api/channel/:channelId`
- **认证**：是

**成功响应 `200`：**

```json
{
  "channel_id": 1,
  "channel_name": "testuser",
  "avatar": "...",
  "banner": null,
  "description": null,
  "user_id": 1,
  "username": "testuser",
  "fans_count": 100,
  "video_count": 20,
  "is_subscribed": false
}
```

---

### 7.2 获取频道视频列表

- **GET** `/api/channel/:channelId/videos`
- **认证**：否

**Query 参数：**


| 参数         | 类型     | 默认   | 说明   |
| ---------- | ------ | ---- | ---- |
| `page`     | number | `1`  | 页码   |
| `pageSize` | number | `10` | 每页条数 |


**成功响应 `200`：**

```json
{
  "list": [ /* Video[] */ ],
  "total": 20,
  "page": 1,
  "pageSize": 10
}
```

---

### 7.3 频道统计数据

- **GET** `/api/channel/:channelId/stats`
- **认证**：否

**成功响应 `200`：**

```json
{
  "total_views": 10000,
  "total_likes": 500
}
```

---

## 8. 订阅 `/api/sub`

### 8.1 关注频道

- **POST** `/api/sub/subscribe/:channelId`
- **认证**：是

**成功响应 `200`：**

```json
{
  "message": "关注成功"
}
```

---

### 8.2 取消关注

- **POST** `/api/sub/unsubscribe/:channelId`
- **认证**：是

**成功响应 `200`：**

```json
{
  "message": "取消关注成功"
}
```

---

### 8.3 我的关注列表

- **GET** `/api/sub/my`
- **认证**：是

**成功响应 `200`：**

```json
[
  {
    "id": 2,
    "name": "某频道",
    "avatar": "..."
  }
]
```

---

### 8.4 频道粉丝列表

- **GET** `/api/sub/fans/:channelId`
- **认证**：否

**成功响应 `200`：** `User[]`（id, username, avatar）

---

### 8.5 检查是否已关注

- **GET** `/api/sub/check/:channelId`
- **认证**：是

**成功响应 `200`：**

```json
{
  "isSubscribed": true
}
```

---

## 9. 点赞 / 收藏 `/api`

> 挂载在 `/api` 根路径下。点赞请使用本节 `POST /api/video/:videoId/like`。

### 9.1 点赞 / 取消点赞

- **POST** `/api/video/:videoId/like`
- **认证**：是

**成功响应 `200`：**

```json
{
  "action": "liked",
  "message": "点赞成功"
}
```

或

```json
{
  "action": "unliked",
  "message": "取消点赞成功"
}
```

---

### 9.2 收藏 / 取消收藏

- **POST** `/api/video/:videoId/favorite`
- **认证**：是

**成功响应 `200`：**

```json
{
  "action": "favorited",
  "message": "收藏成功"
}
```

---

### 9.3 获取视频点赞/收藏状态

- **GET** `/api/video/:videoId/status`
- **认证**：是

**成功响应 `200`：**

```json
{
  "isLiked": true,
  "isFavorited": false
}
```

---

### 9.4 我的点赞视频列表

- **GET** `/api/my/likes`
- **认证**：是

**成功响应 `200`：** `Video[]`（按点赞时间倒序）

---

### 9.5 我的收藏视频列表

- **GET** `/api/my/favorites`
- **认证**：是

**成功响应 `200`：** `Video[]`

---

## 10. 收藏夹 `/api/collection`

### 10.1 创建收藏夹

- **POST** `/api/collection/create`
- **认证**：是

**请求体（JSON）：**

```json
{
  "title": "我的收藏夹"
}
```

**成功响应 `200`：**

```json
{
  "message": "创建成功",
  "collectionId": 1
}
```

---

### 10.2 我的收藏夹列表

- **GET** `/api/collection/my`
- **认证**：是

**成功响应 `200`：** `Collection[]`

---

### 10.3 添加视频到收藏夹

- **POST** `/api/collection/add-video`
- **认证**：是

**请求体（JSON）：**

```json
{
  "collection_id": 1,
  "video_id": 10,
  "is_short": true
}
```

| 字段 | 说明 |
| --- | --- |
| `is_short` | 可选。`true` 表示从 Shorts 收藏；收藏夹列表会单独标识，点击进入短视频流 |

---

### 10.4 获取收藏夹内视频

- **GET** `/api/collection/:collectionId/videos`
- **认证**：是（仅收藏夹所有者）

**成功响应 `200`：**

```json
{
  "collection": {
    "id": 1,
    "title": "默认收藏夹",
    "video_count": 12,
    "short_count": 3,
    "total_views": 1000
  },
  "videos": [
    {
      "id": 10,
      "title": "...",
      "is_short": true,
      "added_at": "..."
    }
  ]
}
```

`is_short`：来自收藏时的 Shorts 标记；旧数据若未标记，则按时长 ≤ 60s 推断。

---

### 10.5 删除收藏夹

- **DELETE** `/api/collection/:collectionId`
- **认证**：是

---

### 10.6 从收藏夹移除视频

- **POST** `/api/collection/remove-video`
- **认证**：是

**请求体（JSON）：**

```json
{
  "collection_id": 1,
  "video_id": 10
}
```

---

## 11. 静态资源


| 路径                                  | 说明   |
| ----------------------------------- | ---- |
| `GET /uploads/videos/:filename`     | 视频文件 |
| `GET /uploads/thumbnails/:filename` | 封面图  |
| `GET /uploads/avatars/:filename`    | 用户头像 |


---

## 12. 分类与标签

已在 `index.js` 挂载：`/api/categories`、`/api/tags`。

### 分类 `/api/categories`


| 方法  | 路径            | 说明      |
| --- | ------------- | ------- |
| GET | `/`           | 获取所有分类  |
| GET | `/:id/videos` | 按分类获取视频 |


### 标签 `/api/tags`


| 方法  | 路径               | 说明      |
| --- | ---------------- | ------- |
| GET | `/`              | 获取所有标签  |
| GET | `/:tagId/videos` | 按标签获取视频 |


---

## 13. 弹幕 `/api/danmaku`

用于 **video + danmu.js** 方案：弹幕按视频播放时间轴（`play_time`，单位**秒**）展示；接口同时返回 `danmuJs` 数组（`start` 为**毫秒**，可直接作为 danmu.js 的 `comments` 预加载数据）。

### 13.1 获取视频弹幕

- **GET** `/api/danmaku/:videoId`
- **认证**：否

**Query 参数（均可选）：**


| 参数      | 类型     | 说明                        |
| ------- | ------ | ------------------------- |
| `from`  | number | 起始时间（秒），含边界              |
| `to`    | number | 结束时间（秒），含边界              |
| `limit` | number | 最多返回条数，默认 `3000`，最大 `5000` |


**成功响应 `200`：**

```json
{
  "videoId": 1,
  "total": 2,
  "items": [
    {
      "id": 1,
      "videoId": 1,
      "userId": 2,
      "username": "testuser",
      "avatar": null,
      "text": "前方高能",
      "playTime": 12.5,
      "startMs": 12500,
      "color": "#ffffff",
      "mode": "scroll",
      "createdAt": "2026-06-03T10:00:00.000Z"
    }
  ],
  "danmuJs": [
    {
      "id": "1",
      "start": 12500,
      "duration": 8000,
      "txt": "前方高能",
      "mode": "scroll",
      "style": { "color": "#ffffff", "fontSize": "20px" }
    }
  ]
}
```

**`mode` 取值：** `scroll`（滚动）| `top`（顶部居中）| `bottom`（底部居中）

---

### 13.2 发送弹幕

- **POST** `/api/danmaku`
- **认证**：是

**请求体（JSON）：**

```json
{
  "video_id": 1,
  "content": "来了来了",
  "play_time": 12.5,
  "color": "#ff6b6b",
  "mode": "scroll"
}
```

> `play_time` 也可用字段名 `time`（秒）。同一用户对同一视频 **2 秒内** 仅允许发送一条（`429`）。

**成功响应 `201`：**

```json
{
  "message": "弹幕发送成功",
  "item": { /* 同 items 元素结构 */ },
  "danmuJs": { /* 单条 danmu.js 格式 */ }
}
```

---

### 13.3 删除弹幕

- **DELETE** `/api/danmaku/:id`
- **认证**：是（弹幕作者或该视频所属频道主可删）

**成功响应 `200`：**

```json
{
  "message": "弹幕已删除"
}
```

---

### 13.4 数据表 `danmaku`


| 字段          | 类型                              | 说明              |
| ----------- | ------------------------------- | --------------- |
| `id`        | INT PK                          | 弹幕 ID           |
| `video_id`  | INT FK                          | 视频 ID           |
| `user_id`   | INT FK                          | 发送用户            |
| `content`   | VARCHAR(200)                    | 弹幕正文            |
| `play_time` | DECIMAL(10,2)                   | 出现时间（秒）         |
| `color`     | VARCHAR(20)                     | 颜色，默认 `#ffffff` |
| `mode`      | ENUM(scroll, top, bottom)       | 展示模式            |
| `created_at`| TIMESTAMP                       | 发送时间            |


已有数据库可执行：`server/migrations/001_danmaku.sql`

---

## 14. 前端已封装接口

文件：`client/src/service/APIs.js`


| 函数                                                                  | 对应 API                                |
| ------------------------------------------------------------------- | ------------------------------------- |
| `getSingleVideoDesc(id)`                                            | `GET /api/videos/:id`                 |
| `LoginAction({ email, password })`                                  | `POST /api/users/login`               |
| `LogoutAction()`                                                    | `POST /api/users/logout`              |
| `getUserInfo()`                                                     | `GET /api/users/me`                   |
| `addHistory(videoId)`                                               | `POST /api/history/add/:videoId`      |
| `getHisotry(params)`                                                | `GET /api/history/my`                 |
| `deleteHistory(videoId)`                                            | `DELETE /api/history/delete/:videoId` |
| `deleteAllHistories()`                                              | `DELETE /api/history/clear`           |
| `searchVideos({ q, category_id, tag_id, date, sort, page, limit })` | `GET /api/videos/search`              |
| `getDanmaku(videoId, { from, to, limit })`                          | `GET /api/danmaku/:videoId`           |
| `sendDanmaku({ video_id, content, play_time, color, mode })`        | `POST /api/danmaku`                   |
| `toggleCommentLike(commentId)`                                      | `POST /api/comments/:commentId/like`  |


> `searchVideos` 返回完整分页对象（含 `videos`、`hasMore` 等），调用方请使用 `res.videos`。

---

## 15. 智能搜索 Agent `/api/agent`

自然语言找片：规则引擎解析意图（分区 / 时间 / 排序 / Shorts），再调用站内 `search_videos` / `search_shorts` 工具。  
配置 `OPENAI_API_KEY`（或 `LLM_API_KEY`）后，可用兼容 OpenAI 的接口精炼意图。

### 15.1 智能搜索

- **POST** `/api/agent/search`
- **认证**：否

**请求体：**

```json
{ "message": "本周最火的游戏视频" }
```

**成功响应 `200`：**

```json
{
  "reply": "找到 3 条相关结果，先展示 3 条。已按视频 · 分区「游戏」 · 本周 · 按播放最多筛选。（意图由规则引擎解析）",
  "intent": {
    "q": "",
    "category_id": 2,
    "category_name": "游戏",
    "date": "week",
    "sort": "views",
    "type": "video",
    "limit": 8,
    "totalVideos": 3
  },
  "videos": [ /* Video 摘要[] */ ],
  "mode": "rule",
  "classicSearchPath": "/Search?category_id=2&date=week&sort=views",
  "toolsUsed": ["search_videos"]
}
```

### 15.2 健康检查

- **GET** `/api/agent/health`
- **认证**：否

返回 `{ ok, mode: "rule" | "llm+rule", tools }`。

---

## 16. 接口速查表


| 模块   | 方法     | 路径                                     | 认证  |
| ---- | ------ | -------------------------------------- | --- |
| 用户   | POST   | `/api/users/register`                  | 否   |
| 用户   | POST   | `/api/users/login`                     | 否   |
| 用户   | GET    | `/api/users/me`                        | 是   |
| 用户   | POST   | `/api/users/logout`                    | 是   |
| 用户   | POST   | `/api/users/update`                    | 是   |
| 用户   | POST   | `/api/users/change-password`           | 是   |
| 视频   | GET    | `/api/videos`                          | 否   |
| 视频   | GET    | `/api/videos/shorts`                   | 否   |
| 视频   | GET    | `/api/videos/search`                   | 否   |
| Agent  | POST   | `/api/agent/search`                    | 否   |
| Agent  | GET    | `/api/agent/health`                    | 否   |
| 视频   | GET    | `/api/videos/:id`                      | 否   |
| 视频   | GET    | `/api/videos/my/videos`                | 是   |
| 视频   | GET    | `/api/videos/video/:videoId`           | 否   |
| 视频   | PUT    | `/api/videos/:id`                      | 是   |
| 视频   | DELETE | `/api/videos/:id`                      | 是   |
| 上传   | POST   | `/api/upload/video`                    | 是   |
| 历史   | POST   | `/api/history/add/:videoId`            | 是   |
| 历史   | GET    | `/api/history/my`                      | 是   |
| 历史   | DELETE | `/api/history/delete/:videoId`         | 是   |
| 历史   | DELETE | `/api/history/clear`                   | 是   |
| 评论   | POST   | `/api/comments/add`                    | 是   |
| 评论   | POST   | `/api/comments/:commentId/like`        | 是   |
| 评论   | DELETE | `/api/comments/:commentId`             | 是   |
| 频道   | GET    | `/api/channels`                        | 否   |
| 频道   | GET    | `/api/channels/:id`                    | 否   |
| 频道主页 | GET    | `/api/channel/:channelId`              | 是   |
| 频道主页 | GET    | `/api/channel/:channelId/videos`       | 否   |
| 频道主页 | GET    | `/api/channel/:channelId/stats`        | 否   |
| 订阅   | POST   | `/api/sub/subscribe/:channelId`        | 是   |
| 订阅   | POST   | `/api/sub/unsubscribe/:channelId`      | 是   |
| 订阅   | GET    | `/api/sub/my`                          | 是   |
| 订阅   | GET    | `/api/sub/fans/:channelId`             | 否   |
| 订阅   | GET    | `/api/sub/check/:channelId`            | 是   |
| 点赞收藏 | POST   | `/api/video/:videoId/like`             | 是   |
| 点赞收藏 | POST   | `/api/video/:videoId/favorite`         | 是   |
| 点赞收藏 | GET    | `/api/video/:videoId/status`           | 是   |
| 点赞收藏 | GET    | `/api/my/likes`                        | 是   |
| 点赞收藏 | GET    | `/api/my/favorites`                    | 是   |
| 收藏夹  | POST   | `/api/collection/create`               | 是   |
| 收藏夹  | GET    | `/api/collection/my`                   | 是   |
| 收藏夹  | POST   | `/api/collection/add-video`            | 是   |
| 收藏夹  | GET    | `/api/collection/:collectionId/videos` | 是   |
| 收藏夹  | DELETE | `/api/collection/:collectionId`        | 是   |
| 收藏夹  | POST   | `/api/collection/remove-video`         | 是   |
| 弹幕   | GET    | `/api/danmaku/:videoId`                | 否   |
| 弹幕   | POST   | `/api/danmaku`                         | 是   |
| 弹幕   | DELETE | `/api/danmaku/:id`                     | 是   |


---

*文档根据 `server/routes/` 源码自动生成，最后更新：2026-06-03*