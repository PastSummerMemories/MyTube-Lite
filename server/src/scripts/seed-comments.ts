import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

/**
 * 向 comments 表插入示例数据
 * 在项目根目录执行: npm run seed:comments
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(rootDir, ".env") });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  const [users] = await conn.query(
    "SELECT id FROM users ORDER BY id ASC LIMIT 1"
  );
  const [videos] = await conn.query(
    "SELECT id FROM videos ORDER BY id ASC LIMIT 1"
  );

  if ((users as any[]).length === 0 || (videos as any[]).length === 0) {
    console.error("请先确保数据库里至少有 1 个用户和 1 个视频");
    process.exit(1);
  }

  const sqlPath = path.join(rootDir, "seeds", "comments_seed.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  await conn.query(sql);

  const [rows] = await conn.query("SELECT COUNT(*) AS n FROM comments");
  console.log("评论种子数据插入完成，当前评论总数:", (rows as any[])[0].n);
  await conn.end();
}

main().catch((err: any) => {
  console.error("插入失败:", err.message);
  process.exit(1);
});
