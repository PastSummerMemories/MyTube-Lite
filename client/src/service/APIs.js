import { API_URL } from "@/config";
import { Delete, Get, Post, PostForm } from ".";


// Agent流式对话
export async function runToolAgentChatStream(
    messages,
    conversationId,
    { onEvent, signal } = {}
  ) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/testchat/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, conversationId }),
        signal,
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `请求失败 ${res.status}`);
      }
  
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
  
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            onEvent?.(JSON.parse(raw));
          } catch {
            // 只处理半包 JSON，不要在这里判断 AbortError
          }
        }
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      throw error;
    }
  }


// Shorts 短视频流（优先时长 ≤ 60s）
export async function getShortsFeed(params, config) {
    const res = await Get('/videos/shorts', {
        page: params?.page,
        limit: params?.limit,
        max_seconds: params?.max_seconds,
    }, config)
    return res
}

// 获取单条视频详情
export async function getSingleVideoDesc(id) {
    const res = await Get(`/videos/${id}`)
    return res
}

// 登录接口
export async function LoginAction(params) {
    const res = await Post('/users/login',{
        email:params.email,
        password:params.password
    })
    return res
}

// 退出登录
export async function LogoutAction() {
    const res = await Post('/users/logout')
    return res
}

// 获取当前用户信息
export async function getUserInfo() {
    const res = await Get('/users/me')
    return res
}

// 添加历史记录
export async function addHistory(videoId) {
    const res = await Post(`/history/add/${videoId}`)
    return res
}

// 获取历史记录
export async function getHisotry(params) {
    const res = await Get('/history/my',params)
    return res
}

// 删除单条历史记录
export async function deleteHistory(videoId) {
    const res = await Delete(`/history/delete/${videoId}`)
    return res
}

// 删除所有历史记录
export async function deleteAllHistories() {
    const res = await Delete('/history/clear')
    return res
}


// 搜索视频
export async function searchVideos(params) {
    const res = await Get('/videos/search', {
        q: params?.q,
        category_id: params?.category_id,
        tag_id: params?.tag_id,
        date: params?.date,
        sort: params?.sort,
        page: params?.page,
        limit: params?.limit,
    })
    return res
}

// 智能搜索 Agent（自然语言 → 意图 → 站内搜索工具）
export async function runSearchAgent(message, config) {
    const res = await Post('/agent/search', { message }, config)
    return res
}

/** Tool Calling 练习页：/api/testchat/agent（可能多轮调模型，超时放宽） */
export async function runToolAgentChat(messages, conversationId, config = {}) {
    const res = await Post(
        '/testchat/agent',
        { messages, conversationId },
        { timeout: 120000, skipLoading: true, ...config }
    )
    return res
}

/** 新建 Agent 会话 */
export async function createToolAgentConversation(title, config = {}) {
    const res = await Post(
        '/testchat/conversations',
        title ? { title } : {},
        { skipLoading: true, ...config }
    )
    return res
}

/** 会话列表（最近更新） */
export async function listToolAgentConversations(params = {}, config = {}) {
    const res = await Get(
        '/testchat/conversations',
        params,
        { skipLoading: true, ...config }
    )
    return res
}

/** 拉取会话历史消息 */
export async function getToolAgentMessages(conversationId, config = {}) {
    const res = await Get(
        `/testchat/conversations/${conversationId}/messages`,
        undefined,
        { skipLoading: true, ...config }
    )
    return res
}

// 删除某一个会话
export async function deleteToolAgentConversation(conversationId, config = {}) {
    const res = await Delete(`/testchat/conversations/${conversationId}`,
        {skipLoading:true,...config}
    )

    return res
}

// Agent 健康状态：是否配置了 LLM
export async function getAgentHealth(config) {
    const res = await Get('/agent/health', undefined, config)
    return res
}


// 获取所有分类
export async function getCategories() {
    const res = await Get('/categories')
    return res
}

// 获取视频弹幕（含 danmu.js 格式 danmuJs）
export async function getDanmaku(videoId, params, config) {
    const res = await Get(`/danmaku/${videoId}`, params, config)
    return res
}

// 发送弹幕（需登录）play_time 单位为秒
export async function sendDanmaku({ video_id, content, play_time, color, mode }) {
    const res = await Post('/danmaku', {
        video_id,
        content,
        play_time,
        color,
        mode,
    })
    return res
}

// 获取视频评论(评论树)
export async function getCommentsTree(videoId, config) {
    const res = await Get(`/videos/video/${videoId}`, undefined, config)
    return res
}

// 点赞 / 取消点赞评论（需登录，切换）
export async function toggleCommentLike(commentId) {
    const res = await Post(`/comments/${commentId}/like`)
    return res
}

// 发表评论
export async function addComment(params) {
    const res = await Post('/comments/add',params)
    return res
}

// 点赞某条视频
export async function likeVideo(videoId,config = {}) {
    const res = await Post(`/video/${videoId}/like`,{},{ skipLoading:true, ...config})
    return res
}

// 获取当前视频的点赞/收藏状态（需登录）
export async function getVideoLikeStatus(videoId, config) {
    const res = await Get(`/video/${videoId}/status`, undefined, config)
    return res
}

// 获取当前用户的点赞列表
export async function getUserLikedVideos(params, config) {
    const res = await Get('/my/likes', params, config)
    return res
}

// —— 收藏夹 ——
export async function getMyCollections(config) {
    const res = await Get('/collection/my', undefined, config)
    return res
}

export async function createCollection(title) {
    const res = await Post('/collection/create', { title })
    return res
}

export async function deleteCollection(collectionId) {
    const res = await Delete(`/collection/${collectionId}`)
    return res
}

export async function getCollectionVideos(collectionId, config) {
    const res = await Get(`/collection/${collectionId}/videos`, undefined, config)
    return res
}

export async function addVideoToCollection(collectionId, videoId, options = {}) {
    const res = await Post('/collection/add-video', {
        collection_id: collectionId,
        video_id: videoId,
        is_short: Boolean(options.isShort),
    })
    return res
}

export async function removeVideoFromCollection(collectionId, videoId) {
    const res = await Post('/collection/remove-video', {
        collection_id: collectionId,
        video_id: videoId,
    })
    return res
}

export async function getVideoCollectionMembership(videoId, config) {
    const res = await Get(`/collection/video/${videoId}/membership`, undefined, config)
    return res
}

// —— 订阅 ——
export async function subscribeChannel(channelId) {
    const res = await Post(`/sub/subscribe/${channelId}`)
    return res
}

export async function unsubscribeChannel(channelId) {
    const res = await Post(`/sub/unsubscribe/${channelId}`)
    return res
}

export async function checkSubscription(channelId, config) {
    const res = await Get(`/sub/check/${channelId}`, undefined, config)
    return res
}

export async function getChannelSubscriberCount(channelId, config) {
    const res = await Get(`/sub/count/${channelId}`, undefined, config)
    return res
}

export async function getMySubscriptions(config) {
    const res = await Get('/sub/my', undefined, config)
    return res
}

export async function getSubscriptionFeed(params, config) {
    const res = await Get('/sub/feed', params, config)
    return res
}

// 注册
export async function register(params) {
    const res = await Post('/users/register', params)
    return res
}

// 上传视频（multipart：video + thumbnail + 表单字段）
export async function uploadVideo(formData, onUploadProgress) {
    const res = await PostForm('/upload/video', formData, {
        timeout: 0,
        onUploadProgress,
        skipLoading: true,
    })
    return res
}

// 更新用户资料（multipart：username / email / avatar）
export async function updateUserProfile(formData) {
    const res = await PostForm('/users/update', formData)
    return res
}

// 修改密码
export async function changePassword(params) {
    const res = await Post('/users/change-password', {
        oldPassword: params.oldPassword,
        newPassword: params.newPassword,
    })
    return res
}

// 获取视频分类
export async function getVideoCategories() {
    const res = await Get('/categories')
    return res
}