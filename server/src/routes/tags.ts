import express from 'express';
import pool from '../config/db.js';

const router = express.Router();
// 获取所有标签
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tags');
  res.json(rows);
});

// 根据标签ID获取视频
router.get('/:tagId/videos', async (req, res) => {
  try {
    const [videos] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN video_tags vt ON v.id = vt.video_id
      WHERE vt.tag_id = ?
    `, [req.params.tagId]);
    res.json(videos);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;