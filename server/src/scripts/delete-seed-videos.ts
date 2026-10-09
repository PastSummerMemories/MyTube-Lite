import dotenv from 'dotenv';
import pool from '../config/db.js';

/**
 * 删除 seed-videos.js 插入的演示视频
 * 在 server 目录执行: node scripts/delete-seed-videos.js
 */
dotenv.config();
async function main() {
  const where = `
    thumbnail LIKE 'https://picsum.photos/seed/ytc%'
    OR description LIKE '%Seed script%'
    OR description LIKE '%演示数据：用于丰富首页%'
  `;

  const [rows] = await pool.query(
    `SELECT id, title FROM videos WHERE ${where} ORDER BY id`
  );
  console.log(`将删除 ${rows.length} 条种子视频`);

  if (!rows.length) {
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM videos');
    console.log(`当前库中共 ${n} 条视频`);
    process.exit(0);
  }

  const [result] = await pool.query(`DELETE FROM videos WHERE ${where}`);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM videos');
  console.log(`✅ 已删除 ${result.affectedRows} 条；当前剩余 ${n} 条视频`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 删除失败:', err.message);
  process.exit(1);
});
