import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { responseFormatter } from "./utils/response.js";
import videosRouter from "./routes/videos.js";
import channelsRouter from "./routes/channels.js";
import commentsRouter from "./routes/comments.js";
import usersRouter from "./routes/users.js";
import likeFavoriteRouter from "./routes/likeFavorite.js";
import historyRouter from "./routes/history.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import channelProfileRouter from "./routes/channelProfile.js";
import collectionsRouter from "./routes/collections.js";
import uploadRouter from "./routes/upload.js";
import categoriesRouter from "./routes/categories.js";
import tagsRouter from "./routes/tags.js";
import danmakuRouter from "./routes/danmaku.js";
import agentRouter from "./routes/agent.js";
import chatRouter from "./routes/chat.js";



dotenv.config();

const app = express();
const uploadsDir = path.resolve(process.cwd(), "uploads");

app.use(cors());
app.use(express.json());
app.use(responseFormatter);

app.use("/api/videos", videosRouter);
app.use("/api/channels", channelsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/users", usersRouter);
app.use("/api", likeFavoriteRouter);
app.use("/uploads", express.static(uploadsDir));
app.use("/api/history", historyRouter);
app.use("/api/sub", subscriptionsRouter);
app.use("/api/channel", channelProfileRouter);
app.use("/api/collection", collectionsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/danmaku", danmakuRouter);
app.use("/api/agent", agentRouter);
app.use("/api/testchat",chatRouter)

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`);
});
