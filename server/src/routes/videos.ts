import express from 'express';
import pool from '../config/db.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../utils/jwt.js';
import upload from '../config/multer.js';
import { durationToSeconds } from '../utils/duration.js';
import { searchVideos } from '../services/videoSearch.js';
import { asInt } from '../utils/query.js';

const router = express.Router();
function commentLikedSelect(userId) {
  if (!userId) return '0 AS liked';
  return `EXISTS (
    SELECT 1 FROM comment_likes cl
    WHERE cl.comment_id = c.id AND cl.user_id = ${Number(userId)}
  ) AS liked`;
}
router.get('/', async (req, res) => {
  try {
    const page = asInt(req.query.page, 1) || 1;
    const limit = asInt(req.query.limit, 12) || 12;
    const offset = (page - 1) * limit;
    const categoryId = req.query.category_id
      ? Number(req.query.category_id)
      : null;
    const hasCategory = Number.isFinite(categoryId) && categoryId > 0;

    const where = hasCategory ? 'WHERE v.category_id = ?' : '';
    const params = hasCategory ? [categoryId, limit, offset] : [limit, offset];
    const countParams = hasCategory ? [categoryId] : [];

    const [videos] = await pool.query(
      `
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      ${where}
      ORDER BY v.uploaded_at DESC
      LIMIT ? OFFSET ?
    `,
      params
    );

    const [total] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM videos v
      ${where}
    `,
      countParams
    );

    res.json({
      videos,
      currentPage: page,
      totalVideos: total[0].total,
      totalPages: Math.ceil(total[0].total / limit),
      hasMore: offset + limit < total[0].total
    });

  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// Shorts 流：优先时长 ≤ 60s，不足时回退为最新视频（须在 /:id 之前注册）
router.get('/shorts', async (req, res) => {
  try {
    const page = Math.max(asInt(req.query.page, 1) || 1, 1);
    const limit = Math.min(Math.max(asInt(req.query.limit, 10) || 10, 1), 30);
    const maxSeconds = Math.min(
      Math.max(asInt(req.query.max_seconds, 60) || 60, 1),
      180
    );

    const [all] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      ORDER BY v.uploaded_at DESC
    `);

    const shorts = all.filter((v) => durationToSeconds(v.duration) <= maxSeconds);
    const feed = shorts.length > 0 ? shorts : all;
    const offset = (page - 1) * limit;
    const videos = feed.slice(offset, offset + limit);

    res.json({
      videos,
      currentPage: page,
      totalVideos: feed.length,
      totalPages: Math.ceil(feed.length / limit) || 1,
      hasMore: offset + limit < feed.length,
      isShortsOnly: shorts.length > 0,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// 高级搜索视频（须在 /:id 之前注册）
router.get('/search', async (req, res) => {
  try {
    const result = await searchVideos({
      q: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      tag_id: req.query.tag_id,
      date: req.query.date,
      sort: req.query.sort,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// 获取当前登录用户上传的视频列表（须在 /:id 之前注册）
router.get('/my/videos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [channels] = await pool.query(
      'SELECT id FROM channels WHERE user_id = ?',
      [userId]
    );

    if (channels.length === 0) {
      return res.status(404).json({ message: '未找到频道' });
    }

    const channelId = channels[0].id;

    const [videos] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.channel_id = ?
      ORDER BY v.uploaded_at DESC
    `, [channelId]);

    res.json(videos);

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 获取视频的评论树（须在 /:id 之前注册）
router.get('/video/:videoId', optionalAuthenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id ?? null;
    const likedSql = commentLikedSelect(userId);

    const [topComments] = await pool.query(
      `
      SELECT c.*, u.username, u.avatar, ${likedSql}
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `,
      [videoId]
    );

    const getReplies = async (parentId) => {
      const [replies] = await pool.query(
        `
        SELECT c.*, u.username, u.avatar, ${likedSql}
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ?
        ORDER BY c.created_at ASC
      `,
        [parentId]
      );

      for (const r of replies) {
        r.replies = await getReplies(r.id);
      }
      return replies;
    };

    const comments: any[] = [];
    for (const c of topComments) {
      c.replies = await getReplies(c.id);
      comments.push(c);
    }

    res.json(comments);

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 获取单个视频详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: '视频不存在' });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// 删除视频（只能删自己的）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    const [videos] = await pool.query(`
      SELECT v.*, c.user_id
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id = ?
    `, [videoId]);

    if (videos.length === 0) {
      return res.status(404).json({ message: '视频不存在' });
    }

    const video = videos[0];

    if (video.user_id !== userId) {
      return res.status(403).json({ message: '无权限删除此视频' });
    }

    await pool.query('DELETE FROM videos WHERE id = ?', [videoId]);

    res.json({ message: '视频删除成功' });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 编辑视频（仅作者可编辑）
router.put(
  '/:id',
  authenticateToken,
  upload.single('thumbnail'),
  async (req, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.id;
      const { title, description, category_id } = req.body;

      const [videos] = await pool.query(`
        SELECT v.*, c.user_id
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        WHERE v.id = ?
      `, [videoId]);

      if (videos.length === 0) {
        return res.status(404).json({ message: '视频不存在' });
      }

      const video = videos[0];

      if (video.user_id !== userId) {
        return res.status(403).json({ message: '无权限编辑此视频' });
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
      }
      if (category_id !== undefined) {
        updateFields.push('category_id = ?');
        params.push(category_id);
      }

      if (req.file) {
        updateFields.push('thumbnail = ?');
        params.push(`/uploads/thumbnails/${req.file.filename}`);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: '没有需要更新的内容' });
      }

      params.push(videoId);
      await pool.query(
        `UPDATE videos SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      res.json({ message: '视频更新成功' });

    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;