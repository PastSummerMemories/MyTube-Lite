import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/jwt.js';
import { isShortDuration } from '../utils/duration.js';

const router = express.Router();
let ensuredIsShortColumn = false;

async function ensureCollectionVideosIsShortColumn() {
  if (ensuredIsShortColumn) return;
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'collection_videos'
         AND COLUMN_NAME = 'is_short'`
    );
    if (!cols.length) {
      await pool.query(
        `ALTER TABLE collection_videos
         ADD COLUMN is_short TINYINT(1) NOT NULL DEFAULT 0
         COMMENT '1=从 Shorts 收藏的短视频'
         AFTER video_id`
      );
    }
    ensuredIsShortColumn = true;
  } catch (err: any) {
    console.warn('ensure collection_videos.is_short failed:', err.message);
  }
}

ensureCollectionVideosIsShortColumn();

function normalizeIsShortFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

// 1. 创建收藏夹
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const user_id = req.user.id;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: '收藏夹名称不能为空' });
    }

    const [result] = await pool.query(
      'INSERT INTO collections (user_id, title) VALUES (?, ?)',
      [user_id, String(title).trim()]
    );

    res.json({
      message: '创建成功',
      collectionId: result.insertId,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 2. 获取我的所有收藏夹（含视频数、总播放、封面）
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const [list] = await pool.query(
      `SELECT c.id, c.user_id, c.title, c.created_at,
              COUNT(cv.video_id) AS video_count,
              COALESCE(SUM(v.views), 0) AS total_views,
              (
                SELECT v2.thumbnail
                FROM collection_videos cv2
                JOIN videos v2 ON v2.id = cv2.video_id
                WHERE cv2.collection_id = c.id
                ORDER BY cv2.added_at DESC
                LIMIT 1
              ) AS cover_thumbnail,
              (
                SELECT v2.video_url
                FROM collection_videos cv2
                JOIN videos v2 ON v2.id = cv2.video_id
                WHERE cv2.collection_id = c.id
                ORDER BY cv2.added_at DESC
                LIMIT 1
              ) AS cover_video_url
       FROM collections c
       LEFT JOIN collection_videos cv ON cv.collection_id = c.id
       LEFT JOIN videos v ON v.id = cv.video_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 3. 查询某视频落在当前用户哪些收藏夹中（须放在 /:collectionId 之前）
router.get('/video/:videoId/membership', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const [rows] = await pool.query(
      `SELECT cv.collection_id
       FROM collection_videos cv
       JOIN collections c ON c.id = cv.collection_id
       WHERE c.user_id = ? AND cv.video_id = ?`,
      [req.user.id, videoId]
    );
    res.json({
      collectionIds: rows.map((r) => r.collection_id),
      isInAny: rows.length > 0,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 4. 把视频添加到收藏夹
router.post('/add-video', authenticateToken, async (req, res) => {
  try {
    await ensureCollectionVideosIsShortColumn();
    const { collection_id, video_id, is_short } = req.body;
    const user_id = req.user.id;
    const isShort = normalizeIsShortFlag(is_short) ? 1 : 0;

    if (!collection_id || !video_id) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const [coll] = await pool.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      [collection_id, user_id]
    );
    if (coll.length === 0) {
      return res.status(403).json({ message: '无权限' });
    }

    // 已存在时：从 Shorts 再收藏则升级为短视频标记，普通收藏不覆盖已有 Shorts 标记
    await pool.query(
      `INSERT INTO collection_videos (collection_id, video_id, is_short)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_short = IF(VALUES(is_short) = 1, 1, is_short)`,
      [collection_id, video_id, isShort]
    );

    res.json({ message: '已添加到收藏夹', is_short: Boolean(isShort) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 5. 从收藏夹中移除视频
router.post('/remove-video', authenticateToken, async (req, res) => {
  try {
    const { collection_id, video_id } = req.body;
    const user_id = req.user.id;

    if (!collection_id || !video_id) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const [coll] = await pool.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      [collection_id, user_id]
    );
    if (coll.length === 0) {
      return res.status(403).json({ message: '无权限' });
    }

    await pool.query(
      'DELETE FROM collection_videos WHERE collection_id = ? AND video_id = ?',
      [collection_id, video_id]
    );
    res.json({ message: '已移除' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 6. 获取某个收藏夹下的所有视频
router.get('/:collectionId/videos', authenticateToken, async (req, res) => {
  try {
    await ensureCollectionVideosIsShortColumn();
    const { collectionId } = req.params;
    const user_id = req.user.id;

    const [coll] = await pool.query(
      'SELECT id, title, created_at FROM collections WHERE id = ? AND user_id = ?',
      [collectionId, user_id]
    );
    if (coll.length === 0) {
      return res.status(403).json({ message: '无权限' });
    }

    const [videos] = await pool.query(
      `
      SELECT v.*,
             ch.name AS channel,
             ch.avatar AS channel_avatar,
             cv.added_at,
             cv.is_short AS collection_is_short,
             (SELECT COUNT(*) FROM comments cm WHERE cm.video_id = v.id) AS comment_count
      FROM collection_videos cv
      JOIN videos v ON cv.video_id = v.id
      JOIN channels ch ON v.channel_id = ch.id
      WHERE cv.collection_id = ?
      ORDER BY cv.added_at DESC
    `,
      [collectionId]
    );

    const normalized = videos.map((v) => {
      const markedShort = Boolean(v.collection_is_short);
      // 兼容旧数据：未标记时按时长推断
      const is_short = markedShort || isShortDuration(v.duration, 60);
      const { collection_is_short, ...rest } = v;
      return { ...rest, is_short };
    });

    const shortCount = normalized.filter((v) => v.is_short).length;
    const totalViews = normalized.reduce(
      (sum, v) => sum + (Number(v.views) || 0),
      0
    );

    res.json({
      collection: {
        ...coll[0],
        video_count: normalized.length,
        short_count: shortCount,
        total_views: totalViews,
      },
      videos: normalized,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 7. 删除收藏夹
router.delete('/:collectionId', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM collections WHERE id = ? AND user_id = ?',
      [req.params.collectionId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '收藏夹不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;