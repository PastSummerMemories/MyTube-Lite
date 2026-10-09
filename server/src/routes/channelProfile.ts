import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { asInt } from '../utils/query.js';

const router = express.Router();
// ========== 1. 获取频道主页基本信息 ==========
// 包含：频道资料 + 粉丝数 + 视频数 + 是否关注
router.get('/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    // 1) 频道信息（关联用户表）
    const [channel] = await pool.query(`
      SELECT 
        c.id AS channel_id,
        c.name AS channel_name,
        c.avatar,
        c.banner,
        c.description,
        u.id AS user_id,
        u.username
      FROM channels c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [channelId]);

    if (channel.length === 0) {
      return res.status(404).json({ message: '频道不存在' });
    }

    // 2) 粉丝数
    const [[{ fans_count }]] = await pool.query(`
      SELECT COUNT(*) AS fans_count 
      FROM subscriptions 
      WHERE channel_id = ?
    `, [channelId]);

    // 3) 视频数
    const [[{ video_count }]] = await pool.query(`
      SELECT COUNT(*) AS video_count 
      FROM videos 
      WHERE channel_id = ?
    `, [channelId]);

    // 4) 当前用户是否已关注
    const [sub] = await pool.query(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND channel_id = ?
    `, [userId, channelId]);

    res.json({
      ...channel[0],
      fans_count,
      video_count,
      is_subscribed: sub.length > 0
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ========== 2. 获取该频道的作品列表（分页） ==========
router.get('/:channelId/videos', async (req, res) => {
  try {
    const { channelId } = req.params;
    let page = asInt(req.query.page, 1) || 1;
    let pageSize = asInt(req.query.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    const [videos] = await pool.query(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.thumbnail,
        v.video_url,
        v.duration,
        v.views,
        v.likes,
        v.author,
        v.uploaded_at,
        c.name AS channel,
        c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.channel_id = ?
      ORDER BY v.uploaded_at DESC
      LIMIT ? OFFSET ?
    `, [channelId, pageSize, offset]);

    // 总条数（用于前端分页）
    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total FROM videos WHERE channel_id = ?
    `, [channelId]);

    res.json({
      list: videos,
      total,
      page,
      pageSize
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ========== 3. 频道简单统计（总播放、总点赞） ==========
router.get('/:channelId/stats', async (req, res) => {
  try {
    const { channelId } = req.params;

    const [[{ total_views, total_likes }]] = await pool.query(`
      SELECT 
        SUM(views) AS total_views,
        SUM(likes) AS total_likes
      FROM videos
      WHERE channel_id = ?
    `, [channelId]);

    res.json({
      total_views: total_views || 0,
      total_likes: total_likes || 0
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;