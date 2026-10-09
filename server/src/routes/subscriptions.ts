import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { asInt } from '../utils/query.js';

const router = express.Router();
async function getSubscriberCount(channelId) {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM subscriptions WHERE channel_id = ?',
    [channelId]
  );
  return Number(count) || 0;
}

// 1. 关注频道
router.post('/subscribe/:channelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const channelId = req.params.channelId;

    const [channel] = await pool.query(
      'SELECT user_id FROM channels WHERE id = ?',
      [channelId]
    );
    if (channel.length === 0) {
      return res.status(404).json({ message: '频道不存在' });
    }
    if (channel[0].user_id === userId) {
      return res.status(400).json({ message: '不能订阅自己的频道' });
    }

    await pool.query(
      'INSERT IGNORE INTO subscriptions (user_id, channel_id) VALUES (?, ?)',
      [userId, channelId]
    );

    const subscriberCount = await getSubscriberCount(channelId);
    res.json({
      message: '订阅成功',
      isSubscribed: true,
      subscriberCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 2. 取消关注频道
router.post('/unsubscribe/:channelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const channelId = req.params.channelId;

    await pool.query(
      'DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?',
      [userId, channelId]
    );

    const subscriberCount = await getSubscriberCount(channelId);
    res.json({
      message: '已取消订阅',
      isSubscribed: false,
      subscriberCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 频道订阅者数量（公开）
router.get('/count/:channelId', async (req, res) => {
  try {
    const subscriberCount = await getSubscriberCount(req.params.channelId);
    res.json({ subscriberCount });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 3. 获取当前用户的【关注列表】
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [list] = await pool.query(
      `
      SELECT c.id, c.name, c.avatar,
             (SELECT COUNT(*) FROM subscriptions s2 WHERE s2.channel_id = c.id) AS subscriber_count
      FROM subscriptions s
      JOIN channels c ON s.channel_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `,
      [userId]
    );

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 订阅动态：已关注频道的视频流（分页，可按频道筛选）
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, asInt(req.query.page, 1) || 1);
    const limit = Math.min(50, Math.max(1, asInt(req.query.limit, 20) || 20));
    const offset = (page - 1) * limit;
    const channelId = req.query.channel_id
      ? asInt(req.query.channel_id)
      : null;

    const whereParts = [
      'v.channel_id IN (SELECT channel_id FROM subscriptions WHERE user_id = ?)',
    ];
    const params = [userId];

    if (channelId) {
      // 只能筛自己已订阅的频道
      whereParts.push(
        'v.channel_id = ? AND EXISTS (SELECT 1 FROM subscriptions WHERE user_id = ? AND channel_id = ?)'
      );
      params.push(channelId, userId, channelId);
    }

    const whereSql = whereParts.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM videos v
       WHERE ${whereSql}`,
      params
    );

    const [videos] = await pool.query(
      `SELECT v.*, c.name AS channel, c.avatar AS channel_avatar,
              (SELECT COUNT(*) FROM comments cm WHERE cm.video_id = v.id) AS comment_count
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       WHERE ${whereSql}
       ORDER BY v.uploaded_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      videos,
      page,
      limit,
      total: Number(total) || 0,
      hasMore: offset + videos.length < Number(total),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 4. 获取某个频道的【粉丝列表】
router.get('/fans/:channelId', async (req, res) => {
  try {
    const [list] = await pool.query(`
      SELECT u.id, u.username, u.avatar
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.channel_id = ?
      ORDER BY s.created_at DESC
    `, [req.params.channelId]);

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 5. 检查当前用户是否关注了某个频道
router.get('/check/:channelId', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ? AND channel_id = ?',
      [req.user.id, req.params.channelId]
    );

    res.json({ isSubscribed: result.length > 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;