import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { asInt, asString } from '../utils/query.js';

const router = express.Router();
// ==============================
// 添加观看历史（播放视频时调用）
// ==============================
router.post('/add/:videoId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const videoId = req.params.videoId;

  try {
    // 先删旧记录（保证最新观看时间更新）
    await pool.query(
      'DELETE FROM watch_history WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    // 插入新记录
    await pool.query(
      'INSERT INTO watch_history (user_id, video_id) VALUES (?, ?)',
      [userId, videoId]
    );

    res.json({ message: '已添加到观看历史' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = asInt(req.query.page, 1) || 1;
    const limit = asInt(req.query.limit, 20) || 20;
    const offset = (page - 1) * limit;
    const keyword = asString(req.query.keyword);
    const dateFilter = asString(req.query.date);

    // 1. 构建基础 SQL
    let whereSql = 'WHERE wh.user_id = ?';
    let params: any[] = [userId];

    // 2. 日期筛选
    if (dateFilter === 'today') {
      whereSql += ' AND DATE(wh.watched_at) = CURDATE()';
    } else if (dateFilter === 'week') {
      whereSql += ' AND YEARWEEK(wh.watched_at) = YEARWEEK(NOW())';
    } else if (dateFilter === 'month') {
      whereSql += ' AND MONTH(wh.watched_at) = MONTH(NOW()) AND YEAR(wh.watched_at) = YEAR(NOW())';
    }

    // 3. 关键词搜索：标题 / 作者 / 频道名
    if (keyword) {
      whereSql += ' AND (v.title LIKE ? OR v.author LIKE ? OR c.name LIKE ?)';
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }

    // 4. 查询列表
    const [list] = await pool.query(
      `
      SELECT 
        wh.watched_at,
        v.id,
        v.title,
        v.thumbnail,
        v.duration,
        v.author,
        v.video_url,
        c.name AS channel,
        c.avatar AS channel_avatar
      FROM watch_history wh
      JOIN videos v ON wh.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      ${whereSql}
      ORDER BY wh.watched_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    );

    // 5. 查询总条数
    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM watch_history wh
      JOIN videos v ON wh.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      ${whereSql}
    `,
      params
    );

    res.json({
      list,
      total,
      page,
      limit
    });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: '查询失败' });
  }
});

// ==============================
// 删除单条历史
// ==============================
router.delete('/delete/:videoId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const videoId = req.params.videoId;

  try {
    await pool.query(
      'DELETE FROM watch_history WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );
    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 清空全部历史
// ==============================
router.delete('/clear', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      'DELETE FROM watch_history WHERE user_id = ?',
      [userId]
    );
    res.json({ message: '清空成功' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;