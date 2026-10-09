import dotenv from 'dotenv';
import pool from '../config/db.js';

/**
 * 向首页补充演示视频（复用库内已有 video_url，不下载外站内容）
 * 在 server 目录执行: node scripts/seed-videos.js
 * 可选数量: node scripts/seed-videos.js 50
 */
dotenv.config();
const COUNT = Math.min(
  Math.max(parseInt(process.argv[2], 10) || 50, 1),
  500
);

const TITLE_POOL = [
  '一口气看完这个系列你就懂了',
  '今天分享一个超实用小技巧',
  '周末必看的高能合集',
  '新手向入门指南，从零开始',
  '这波操作我直接跪了',
  '深度解析背后的细节',
  '三分钟带你快速上手',
  '复盘：我是怎么进步的',
  '冷门却上头的内容推荐',
  '挑战自己极限的一天',
  '那些年我们追过的名场面',
  '为什么大家都在讨论这个',
  '亲测有效的效率方法',
  '高能预警：结尾有彩蛋',
  '从失败里学到的五件事',
  '沉浸式体验，建议戴耳机',
  '盘点近期最值得关注的趋势',
  '把复杂问题讲清楚',
  '每日精选片段合集',
  '这份清单请收好',
  '开箱测评真实体验',
  '幕后花絮大公开',
  '经典回顾：再看依然热血',
  '短平快干货分享',
  '周末治愈向推荐',
];

const DESC_POOL = [
  '演示数据：用于丰富首页视频流。',
  '自动生成的测试视频，点击可播放（复用现有媒体资源）。',
  'Seed script 批量插入，封面来自 picsum。',
  '适合本地开发与演示分页加载。',
];

const AUTHOR_POOL = [
  '种子频道',
  'Demo创作者',
  '内容实验室',
  '剪辑小站',
  '学习笔记',
  '日常观察员',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function randomDuration(i) {
  if (i % 7 === 0) {
    const sec = 8 + (i % 45);
    return `00:${pad2(sec)}`;
  }
  const min = 1 + (i % 18);
  const sec = (i * 7) % 60;
  return `${pad2(min)}:${pad2(sec)}`;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function main() {
  const [channels] = await pool.query(
    'SELECT id, name FROM channels ORDER BY id ASC'
  );
  const [categories] = await pool.query(
    'SELECT id, name FROM categories ORDER BY id ASC'
  );
  const [existingMedia] = await pool.query(
    `SELECT video_url
     FROM videos
     WHERE video_url IS NOT NULL AND video_url <> ''
     ORDER BY id ASC`
  );

  if (!channels.length) {
    throw new Error('没有可用频道，请先注册用户或初始化数据');
  }
  if (!existingMedia.length) {
    throw new Error('没有可复用的 video_url，请先确保库里已有视频');
  }

  const catIds = categories.map((c) => c.id);
  const now = Date.now();
  const rows: any[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    const media = existingMedia[i % existingMedia.length];
    const channel = channels[i % channels.length];
    const categoryId = catIds.length ? catIds[i % catIds.length] : null;
    const seed = 2000 + i;
    const title = `${pick(TITLE_POOL, i)} #${i + 1}`;
    const description = `${pick(DESC_POOL, i)}（批次 ${new Date()
      .toISOString()
      .slice(0, 10)}）`;
    const author = pick(AUTHOR_POOL, i);
    const views = 50 + ((i * 97) % 50000);
    const likes = 1 + ((i * 13) % 800);
    const uploadedAt = new Date(now - i * 3.5 * 60 * 60 * 1000);

    rows.push([
      channel.id,
      title,
      description,
      `https://picsum.photos/seed/ytc${seed}/800/450`,
      media.video_url,
      randomDuration(i),
      categoryId,
      author,
      views,
      likes,
      uploadedAt,
    ]);
  }

  const [result] = await pool.query(
    `INSERT INTO videos
      (channel_id, title, description, thumbnail, video_url, duration, category_id, author, views, likes, uploaded_at)
     VALUES ?`,
    [rows]
  );

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM videos');
  console.log(
    `✅ 已插入 ${result.affectedRows} 条视频；当前库中共 ${n} 条视频`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 播种失败:', err.message);
  process.exit(1);
});
