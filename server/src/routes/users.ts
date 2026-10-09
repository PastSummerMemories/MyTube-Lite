import express from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { authenticateToken, generateToken } from '../utils/jwt.js';
import upload from '../config/multer.js';

const router = express.Router();
// 注册（密码加密）
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: '参数不完整' });
  }

  try {
    // 密码加密
    const hashedPwd = await bcrypt.hash(password, 10);

    // 插入用户
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
      [username, email, hashedPwd, `https://picsum.photos/seed/${username}/40/40`]
    );

    const userId = result.insertId;

    // 自动创建频道
    await pool.query(
      'INSERT INTO channels (user_id, name, avatar) VALUES (?, ?, ?)',
      [userId, username, `https://picsum.photos/seed/${username}/40/40`]
    );

    // 生成 token
    const token = generateToken({ id: userId, username });

    // 保存到数据库
    await pool.query('UPDATE users SET token = ? WHERE id = ?', [token, userId]);

    res.json({
      message: '注册成功',
      token,
      user: { id: userId, username, email }
    });

  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '邮箱和密码不能为空' });
  }

  try {
    // 查询用户
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ message: '用户不存在' });

    const user = users[0];

    // 密码比对
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: '密码错误' });

    // 生成新 token
    const token = generateToken(user);

    // 更新到数据库
    await pool.query('UPDATE users SET token = ? WHERE id = ?', [token, user.id]);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// 获取当前登录用户信息（需要token）
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '未登录' });

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, avatar FROM users WHERE token = ?',
      [token]
    );

    if (rows.length === 0) return res.status(401).json({ message: '登录已失效' });
    res.json(rows[0]);

  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ==============================
// 退出登录（清空数据库 token）
// ==============================
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 把数据库里的 token 清空（实现登出）
    await pool.query('UPDATE users SET token = ? WHERE id = ?', ['', userId]);

    res.json({
      success: true,
      message: '退出登录成功'
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


// ==============================
// 修改用户信息 + 上传头像
// ==============================
router.post(
  '/update',
  authenticateToken,
  upload.single('avatar'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { username, email } = req.body;

      // 要更新的字段
      const updateData: Record<string, string> = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;

      // 如果上传了头像
      if (req.file) {
        updateData.avatar = `/uploads/avatars/${req.file.filename}`;
      }

      // 拼接 SQL
      const keys = Object.keys(updateData);
      if (keys.length === 0) {
        return res.status(400).json({ message: '没有需要更新的内容' });
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = keys.map(key => updateData[key]);

      await pool.query(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...values, userId]
      );

      // 返回新的用户信息
      const [rows] = await pool.query(
        'SELECT id, username, email, avatar FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        message: '更新成功',
        user: rows[0]
      });

    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);


// ==============================
// 修改密码（需要验证旧密码）
// ==============================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    // 1. 校验参数
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '旧密码和新密码不能为空' });
    }

    // 2. 查询用户当前密码
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 3. 验证旧密码是否正确
    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: '旧密码错误' });
    }

    // 4. 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 5. 更新密码
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({
      success: true,
      message: '密码修改成功，请重新登录'
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;