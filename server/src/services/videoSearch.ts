import pool from '../config/db.js';
import { durationToSeconds } from '../utils/duration.js';

/**
 * 高级搜索（供 /videos/search 与 Agent 工具共用）
 * @param {object} options
 */
async function searchVideos(options: any = {}) {
  const q = String(options.q || '').trim();
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 12, 1), 50);
  const offset = (page - 1) * limit;

  const categoryId = options.category_id
    ? parseInt(options.category_id, 10)
    : null;
  const tagId = options.tag_id ? parseInt(options.tag_id, 10) : null;
  const dateFilter = options.date || '';

  const validSorts = ['relevance', 'latest', 'views', 'likes'];
  let sort = validSorts.includes(options.sort)
    ? options.sort
    : q
      ? 'relevance'
      : 'latest';
  if (sort === 'relevance' && !q) sort = 'latest';

  const conditions: string[] = [];
  const whereParams: any[] = [];
  const orderParams: any[] = [];

  if (q) {
    const like = `%${q}%`;
    conditions.push(
      '(v.title LIKE ? OR v.description LIKE ? OR v.author LIKE ? OR c.name LIKE ?)'
    );
    whereParams.push(like, like, like, like);
  }

  if (categoryId && !Number.isNaN(categoryId)) {
    conditions.push('v.category_id = ?');
    whereParams.push(categoryId);
  }

  if (tagId && !Number.isNaN(tagId)) {
    conditions.push(
      'EXISTS (SELECT 1 FROM video_tags vt WHERE vt.video_id = v.id AND vt.tag_id = ?)'
    );
    whereParams.push(tagId);
  }

  if (dateFilter === 'today') {
    conditions.push('DATE(v.uploaded_at) = CURDATE()');
  } else if (dateFilter === 'week') {
    conditions.push('YEARWEEK(v.uploaded_at) = YEARWEEK(NOW())');
  } else if (dateFilter === 'month') {
    conditions.push(
      'MONTH(v.uploaded_at) = MONTH(NOW()) AND YEAR(v.uploaded_at) = YEAR(NOW())'
    );
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderSql;

  if (sort === 'relevance') {
    const like = `%${q}%`;
    orderSql = `ORDER BY (
      CASE WHEN v.title LIKE ? THEN 4 ELSE 0 END +
      CASE WHEN c.name LIKE ? THEN 3 ELSE 0 END +
      CASE WHEN v.author LIKE ? THEN 2 ELSE 0 END +
      CASE WHEN v.description LIKE ? THEN 1 ELSE 0 END
    ) DESC, v.uploaded_at DESC`;
    orderParams.push(like, like, like, like);
  } else if (sort === 'views') {
    orderSql = 'ORDER BY v.views DESC, v.uploaded_at DESC';
  } else if (sort === 'likes') {
    orderSql = 'ORDER BY v.likes DESC, v.uploaded_at DESC';
  } else {
    orderSql = 'ORDER BY v.uploaded_at DESC';
  }

  const [videos] = await pool.query(
    `
    SELECT v.*, c.name AS channel, c.avatar AS channel_avatar
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `,
    [...whereParams, ...orderParams, limit, offset]
  );

  const [totalRows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    ${whereSql}
  `,
    whereParams
  );

  const total = totalRows[0].total;

  return {
    videos,
    currentPage: page,
    totalVideos: total,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: offset + limit < total,
    query: {
      q: q || null,
      category_id: categoryId && !Number.isNaN(categoryId) ? categoryId : null,
      tag_id: tagId && !Number.isNaN(tagId) ? tagId : null,
      date: dateFilter || null,
      sort,
    },
  };
}

async function listCategories() {
  const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY id ASC');
  return rows;
}

async function searchShorts(options: any = {}) {
  const q = String(options.q || '').trim();
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 12, 1), 30);
  const maxSeconds = Math.min(
    Math.max(parseInt(options.max_seconds, 10) || 60, 1),
    180
  );

  const result = await searchVideos({
    q,
    category_id: options.category_id,
    date: options.date,
    sort: options.sort || (q ? 'relevance' : 'latest'),
    page: 1,
    limit: Math.max(limit * 4, 40),
  });

  const shorts = result.videos.filter(
    (v) => durationToSeconds(v.duration) <= maxSeconds
  );
  const videos = (shorts.length ? shorts : result.videos).slice(0, limit);

  return {
    videos,
    totalVideos: shorts.length || result.totalVideos,
    isShortsOnly: shorts.length > 0,
    query: {
      ...result.query,
      type: 'shorts',
      max_seconds: maxSeconds,
    },
  };
}

export { searchVideos, listCategories, searchShorts };