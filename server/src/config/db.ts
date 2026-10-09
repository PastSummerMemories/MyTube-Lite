import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

/** 学习阶段先用宽松类型，避免 mysql2 联合类型拖慢迁移 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}) as any;

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL 连接成功");
    conn.release();
  } catch (err: any) {
    console.error("MySQL 连接失败:", err.message);
  }
})();

export default pool;
