import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { asInt } from '../utils/query.js';

const router = express.Router();
// 发表评论 / 回复（需登录）
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { video_id, parent_id } = req.body;
    const text = (req.body.content ?? req.body.text ?? '').trim();
    const user_id = req.user.id;

    if (!video_id || !text) {
      return res.status(400).json({ message: '视频ID和内容不能为空' });
    }

    const [result] = await pool.query(
      `INSERT INTO comments (user_id, video_id, text, parent_id)
       VALUES (?, ?, ?, ?)`,
      [user_id, video_id, text, parent_id || null]
    );

    res.json({
      message: parent_id ? '回复成功' : '评论发布成功',
      commentId: result.insertId,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 点赞 / 取消点赞评论（需登录）
router.post('/:commentId/like', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const commentId = asInt(req.params.commentId);

  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: '无效的评论 ID' });
  }

  try {
    const [comments] = await pool.query(
      'SELECT id, likes FROM comments WHERE id = ?',
      [commentId]
    );
    if (comments.length === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }

    const [exists] = await pool.query(
      'SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );

    if (exists.length > 0) {
      await pool.query(
        'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
      );
      await pool.query(
        'UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?',
        [commentId]
      );

      const [updated] = await pool.query(
        'SELECT likes FROM comments WHERE id = ?',
        [commentId]
      );

      return res.json({
        action: 'unliked',
        liked: false,
        likes: updated[0].likes,
        message: '已取消点赞',
      });
    }

    await pool.query(
      'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
      [userId, commentId]
    );
    await pool.query(
      'UPDATE comments SET likes = likes + 1 WHERE id = ?',
      [commentId]
    );

    const [updated] = await pool.query(
      'SELECT likes FROM comments WHERE id = ?',
      [commentId]
    );

    res.json({
      action: 'liked',
      liked: true,
      likes: updated[0].likes,
      message: '点赞成功',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 删除评论（评论作者或视频作者）
router.delete('/:commentId', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const [comments] = await pool.query(
      `
      SELECT c.*, v.channel_id
      FROM comments c
      JOIN videos v ON c.video_id = v.id
      WHERE c.id = ?
    `,
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }

    const comment = comments[0];

    const [channel] = await pool.query(
      'SELECT user_id FROM channels WHERE id = ?',
      [comment.channel_id]
    );
    const videoAuthorId = channel[0].user_id;

    const isCommentAuthor = comment.user_id === userId;
    const isVideoAuthor = videoAuthorId === userId;

    if (!isCommentAuthor && !isVideoAuthor) {
      return res.status(403).json({ message: '无权限删除此评论' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

    res.json({ message: '删除评论成功' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;