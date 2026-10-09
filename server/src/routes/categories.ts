import express from 'express';
import pool from '../config/db.js';

const router = express.Router();



// 获取所有分类
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories');
  res.json(rows);
});

// 根据分类ID获取视频
router.get('/:id/videos', async (req, res) => {
  const { id } = req.params;
  try {
    const [videos] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.category_id = ?
      ORDER BY v.uploaded_at DESC
    `, [id]);
    res.json(videos);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;