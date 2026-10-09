import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, optionalAuthenticateToken } from '../utils/jwt.js';

const router = express.Router();
// ==============================
// 点赞 / 取消点赞
// ==============================
router.post('/video/:videoId/like', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const videoId = req.params.videoId;

  try {
    // 检查是否已经点赞
    const [exists] = await pool.query(
      'SELECT * FROM likes WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    if (exists.length > 0) {
      // 已点赞 → 取消点赞
      await pool.query(
        'DELETE FROM likes WHERE user_id = ? AND video_id = ?',
        [userId, videoId]
      );

      // 视频 likes -1
      await pool.query(
        'UPDATE videos SET likes = GREATEST(likes - 1, 0) WHERE id = ?',
        [videoId]
      );

      const [updated] = await pool.query(
        'SELECT likes FROM videos WHERE id = ?',
        [videoId]
      );

      return res.json({
        action: 'unliked',
        liked: false,
        likes: updated[0]?.likes ?? 0,
        message: '取消点赞成功'
      });
    }

    // 未点赞 → 添加点赞
    await pool.query(
      'INSERT INTO likes (user_id, video_id) VALUES (?, ?)',
      [userId, videoId]
    );

    // 视频 likes +1
    await pool.query(
      'UPDATE videos SET likes = likes + 1 WHERE id = ?',
      [videoId]
    );

    const [updated] = await pool.query(
      'SELECT likes FROM videos WHERE id = ?',
      [videoId]
    );

    res.json({
      action: 'liked',
      liked: true,
      likes: updated[0]?.likes ?? 0,
      message: '点赞成功'
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 收藏 / 取消收藏
// ==============================
router.post('/video/:videoId/favorite', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const videoId = req.params.videoId;

  try {
    // 检查是否已收藏
    const [exists] = await pool.query(
      'SELECT * FROM favorites WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    if (exists.length > 0) {
      // 取消收藏
      await pool.query(
        'DELETE FROM favorites WHERE user_id = ? AND video_id = ?',
        [userId, videoId]
      );

      return res.json({
        action: 'unfavorited',
        message: '取消收藏成功'
      });
    }

    // 添加收藏
    await pool.query(
      'INSERT INTO favorites (user_id, video_id) VALUES (?, ?)',
      [userId, videoId]
    );

    res.json({
      action: 'favorited',
      message: '收藏成功'
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 获取当前用户 点赞/收藏 状态（未登录 / token 失效时返回默认状态）
// ==============================
router.get('/video/:videoId/status', optionalAuthenticateToken, async (req, res) => {
  const userId = req.user?.id;
  const videoId = req.params.videoId;

  if (!userId) {
    return res.json({ isLiked: false, isFavorited: false });
  }

  try {
    const [like] = await pool.query(
      'SELECT * FROM likes WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    const [fav] = await pool.query(
      'SELECT * FROM favorites WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    res.json({
      isLiked: like.length > 0,
      isFavorited: fav.length > 0
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 获取当前用户的所有点赞视频
// ==============================
router.get('/my/likes', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [videos] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM likes l
      JOIN videos v ON l.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `, [userId]);

    res.json(videos);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 获取当前用户的所有收藏视频
// ==============================
router.get('/my/favorites', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [videos] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM favorites f
      JOIN videos v ON f.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json(videos);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;