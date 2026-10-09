import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import upload from '../config/multer.js';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';

const router = express.Router();
function handleUpload(req, res, next) {
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小不能超过 100MB' });
      }
      return res.status(400).json({ message: err.message });
    }

    return res.status(400).json({ message: err.message || '文件上传失败' });
  });
}

/** 业务失败时删掉 multer 已写入的临时文件，避免磁盘孤儿 */
async function cleanupUploadedFiles(req) {
  const filesMap = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const files = [
    ...(filesMap?.video || []),
    ...(filesMap?.thumbnail || []),
  ];
  await Promise.all(
    files.map((f) => (f?.path ? fs.remove(f.path).catch(() => {}) : null))
  );
}

// 同时上传：视频 + 封面 + 表单信息
router.post('/video', authenticateToken, handleUpload, async (req, res) => {
  try {
    const { title, description, duration, category_id } = req.body;
    const userId = req.user.id;

    if (!title) {
      await cleanupUploadedFiles(req);
      return res.status(400).json({ message: '标题不能为空' });
    }

    const filesMap = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const videoFile = filesMap?.video?.[0];
    if (!videoFile) {
      await cleanupUploadedFiles(req);
      return res.status(400).json({ message: '请上传视频文件' });
    }

    const [channels] = await pool.query(
      'SELECT id FROM channels WHERE user_id = ?',
      [userId]
    );

    if (channels.length === 0) {
      await cleanupUploadedFiles(req);
      return res.status(404).json({ message: '未找到频道' });
    }

    const channelId = channels[0].id;
    const videoUrl = `/uploads/videos/${videoFile.filename}`;
    const thumbFile = filesMap?.thumbnail?.[0];
    // 部分库 thumbnail 为 NOT NULL，无封面时写空串避免插入失败
    const thumbUrl = thumbFile
      ? `/uploads/thumbnails/${thumbFile.filename}`
      : '';

    const [result] = await pool.query(
      `INSERT INTO videos
       (channel_id, title, description, thumbnail, video_url, duration, category_id, author)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        channelId,
        title,
        description || '',
        thumbUrl,
        videoUrl,
        duration || '00:00',
        category_id || null,
        req.user.username,
      ]
    );

    const videoId = result.insertId;

    if (req.body.tags) {
      const tagNames = req.body.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      for (const name of tagNames) {
        const [tag] = await pool.query('SELECT id FROM tags WHERE name = ?', [name]);
        let tagId;
        if (tag.length === 0) {
          const [inserted] = await pool.query('INSERT INTO tags (name) VALUES (?)', [name]);
          tagId = inserted.insertId;
        } else {
          tagId = tag[0].id;
        }
        await pool.query(
          'INSERT IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)',
          [videoId, tagId]
        );
      }
    }

    res.json({ message: '视频上传成功', videoId });
  } catch (err: any) {
    await cleanupUploadedFiles(req);
    res.status(500).json({ message: err.message });
  }
});

export default router;