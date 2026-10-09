import axios from 'axios'
import { API_URL } from '../config'
import { changePendingCount } from '../store/loadingStore'
import { store } from '../store'

/**
 * 请求层约定：
 * - 拦截器负责：挂 token、解包 { code, message, data }、pendingCount、401 跳登录 / 403 清 token
 * - 拦截器不 toast 业务错误（避免与页面重复提示）
 * - 页面负责：业务失败 toast；catch 里用 isRequestCanceled 忽略取消
 * - config.skipLoading = true：不计入全局 Spinner（静默 / 附带请求）
 */

const service = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

function bumpPending(config, delta) {
  if (!config?.skipLoading) {
    store.dispatch(changePendingCount(delta))
  }
}

// 请求拦截器：自动带上 token；默认 +1 pendingCount
service.interceptors.request.use(
  (config) => {
    bumpPending(config, 1)
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：解包统一格式，并处理错误
service.interceptors.response.use(
  (response) => {
    const payload = response.data

    // 新格式：{ code, message, data }
    if (
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Object.prototype.hasOwnProperty.call(payload, 'code') &&
      Object.prototype.hasOwnProperty.call(payload, 'data')
    ) {
      // 业务失败：交给 error 分支统一 -1 pending，避免减两次
      if (payload.code >= 400) {
        return Promise.reject({
          response: {
            status: payload.code,
            data: payload,
          },
          message: payload.message || '请求失败',
          config: response.config,
        })
      }
      bumpPending(response.config, -1)
      return payload.data
    }

    // 兼容旧格式
    bumpPending(response.config, -1)
    return payload
  },
  (error) => {
    bumpPending(error.config, -1)

    // 请求被 AbortController 取消：不 toast，只透传给页面
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      return Promise.reject(error)
    }

    // 401 未登录 → 清 token 并柔和跳转登录页（避免整页硬刷新）
    // 403 登录过期 → 只清 token，避免看公开视频时被整页踢走
    const status = error.response?.status
    if (status === 401 || status === 403) {
      localStorage.removeItem('token')
      if (status === 401 && window.location.pathname !== '/Login') {
        // 动态导入，避免与 React 路由循环依赖；失败时再硬跳
        import('../utils/softNavigate')
          .then(({ softGoLogin }) => softGoLogin())
          .catch(() => {
            window.location.href = '/Login'
          })
      }
      return Promise.reject(error)
    }

    // 业务 / 网络错误：不在此 toast，交由页面 catch 处理
    return Promise.reject(error)
  }
)

function Get(url, params, config = {}) {
  return service.get(url, { params, ...config })
}

function Post(url, data, config = {}) {
  return service.post(url, data, config)
}

function Put(url, data, config = {}) {
  return service.put(url, data, config)
}

function Delete(url, config = {}) {
  return service.delete(url, config)
}

// 专门用于上传图片/视频（form-data）
// 不要手动写 Content-Type，交给浏览器/axios 带 multipart boundary
function PostForm(url, formData, config = {}) {
  return service.post(url, formData, config)
}

function PutForm(url, formData, config = {}) {
  return service.put(url, formData, config)
}

export {
  Get,
  Put,
  Delete,
  Post,
  PostForm,
  PutForm,
}
