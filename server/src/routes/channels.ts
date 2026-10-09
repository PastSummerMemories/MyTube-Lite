import express from 'express';
import pool from '../config/db.js';

const router = express.Router();
// 所有频道
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM channels');
  res.json(rows);
});

// 单个频道
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM channels WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: '频道不存在' });
  res.json(rows[0]);
});

export default router;