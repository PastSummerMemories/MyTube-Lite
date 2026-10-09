import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { asInt } from '../utils/query.js';

const router = express.Router();
const MODES = ['scroll', 'top', 'bottom'];
const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MIN_INTERVAL_SEC = 2;
const MAX_CONTENT_LEN = 200;
const DEFAULT_LIMIT = 3000;

function parsePlayTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function normalizeMode(mode) {
  const m = (mode || 'scroll').toLowerCase();
  return MODES.includes(m) ? m : 'scroll';
}

function normalizeColor(color) {
  const c = (color || '#ffffff').trim();
  return HEX_COLOR.test(c) ? c : '#ffffff';
}

function toDanmuJsItem(row) {
  const startMs = Math.round(Number(row.play_time) * 1000);
  return {
    id: String(row.id),
    start: startMs,
    duration: 8000,
    txt: row.content,
    mode: row.mode,
    style: {
      color: row.color,
      fontSize: '20px',
    },
  };
}

function toPublicItem(row) {
  const playTime = Number(row.play_time);
  return {
    id: row.id,
    videoId: row.video_id,
    userId: row.user_id,
    username: row.username,
    avatar: row.avatar,
    text: row.content,
    playTime,
    startMs: Math.round(playTime * 1000),
    color: row.color,
    mode: row.mode,
    createdAt: row.created_at,
  };
}

// POST /api/danmaku — 发送弹幕（需登录，须在 /:videoId 之前注册无冲突，此处显式放前）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const videoId = parseInt(req.body.video_id, 10);
    const content = (req.body.content || '').trim();
    const playTime = parsePlayTime(req.body.play_time ?? req.body.time);
    const color = normalizeColor(req.body.color);
    const mode = normalizeMode(req.body.mode);

    if (Number.isNaN(videoId)) {
      return res.status(400).json({ message: '无效的视频 ID' });
    }
    if (!content) {
      return res.status(400).json({ message: '弹幕内容不能为空' });
    }
    if (content.length > MAX_CONTENT_LEN) {
      return res
        .status(400)
        .json({ message: `弹幕内容不能超过 ${MAX_CONTENT_LEN} 字` });
    }
    if (playTime === null) {
      return res.status(400).json({ message: '无效的播放时间 play_time' });
    }
    if (playTime > 86400) {
      return res.status(400).json({ message: '播放时间超出允许范围' });
    }

    const [videos] = await pool.query('SELECT id FROM videos WHERE id = ?', [
      videoId,
    ]);
    if (videos.length === 0) {
      return res.status(404).json({ message: '视频不存在' });
    }

    const [recent] = await pool.query(
      `
      SELECT id FROM danmaku
      WHERE user_id = ? AND video_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
      LIMIT 1
    `,
      [userId, videoId, MIN_INTERVAL_SEC]
    );
    if (recent.length > 0) {
      return res
        .status(429)
        .json({ message: `发送太频繁，请 ${MIN_INTERVAL_SEC} 秒后再试` });
    }

    const [result] = await pool.query(
      `
      INSERT INTO danmaku (video_id, user_id, content, play_time, color, mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [videoId, userId, content, playTime, color, mode]
    );

    const [rows] = await pool.query(
      `
      SELECT d.*, u.username, u.avatar
      FROM danmaku d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `,
      [result.insertId]
    );

    const item = toPublicItem(rows[0]);
    res.status(201).json({
      message: '弹幕发送成功',
      item,
      danmuJs: toDanmuJsItem(rows[0]),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/danmaku/:videoId — 获取视频弹幕（供 danmu.js 预加载）
router.get('/:videoId', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    if (Number.isNaN(videoId)) {
      return res.status(400).json({ message: '无效的视频 ID' });
    }

    const [videos] = await pool.query('SELECT id FROM videos WHERE id = ?', [
      videoId,
    ]);
    if (videos.length === 0) {
      return res.status(404).json({ message: '视频不存在' });
    }

    const from = parsePlayTime(req.query.from);
    const to = parsePlayTime(req.query.to);
    const limit = Math.min(
      Math.max(asInt(req.query.limit, DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
      5000
    );

    let whereSql = 'WHERE d.video_id = ?';
    const params = [videoId];

    if (from !== null) {
      whereSql += ' AND d.play_time >= ?';
      params.push(from);
    }
    if (to !== null) {
      whereSql += ' AND d.play_time <= ?';
      params.push(to);
    }

    const [rows] = await pool.query(
      `
      SELECT d.*, u.username, u.avatar
      FROM danmaku d
      JOIN users u ON d.user_id = u.id
      ${whereSql}
      ORDER BY d.play_time ASC, d.id ASC
      LIMIT ?
    `,
      [...params, limit]
    );

    const items = rows.map(toPublicItem);
    const danmuJs = rows.map(toDanmuJsItem);

    res.json({
      videoId,
      total: items.length,
      items,
      danmuJs,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/danmaku/:id — 删除弹幕（作者或视频频道主）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const danmakuId = asInt(req.params.id);
    const userId = req.user.id;

    if (Number.isNaN(danmakuId)) {
      return res.status(400).json({ message: '无效的弹幕 ID' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM danmaku WHERE id = ?',
      [danmakuId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '弹幕不存在' });
    }

    const danmaku = rows[0];
    if (danmaku.user_id !== userId) {
      const [channel] = await pool.query(
        `
        SELECT c.user_id
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        WHERE v.id = ?
      `,
        [danmaku.video_id]
      );
      const isVideoOwner =
        channel.length > 0 && channel[0].user_id === userId;
      if (!isVideoOwner) {
        return res.status(403).json({ message: '无权限删除此弹幕' });
      }
    }

    await pool.query('DELETE FROM danmaku WHERE id = ?', [danmakuId]);
    res.json({ message: '弹幕已删除' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;