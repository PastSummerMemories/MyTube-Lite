import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";


dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET 环境变量未设置，请在 .env 中配置");
}

const SECRET_KEY = process.env.JWT_SECRET;

type TokenUser = {
  id: number;
  username: string;
};

function generateToken(user: TokenUser) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
    expiresIn: "7d",
  });
}

const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "未登录" });
    return;
  }

  try {
    const user = jwt.verify(token, SECRET_KEY) as TokenUser;
    req.user = user;
    next();
  } catch {
    res.status(403).json({ message: "登录已过期" });
  }
};

/** 可选登录：有合法 token 则设置 req.user，否则 req.user = null */
const optionalAuthenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, SECRET_KEY) as TokenUser;
    next();
  } catch {
    req.user = null;
    next();
  }
};

export { generateToken, authenticateToken, optionalAuthenticateToken };
