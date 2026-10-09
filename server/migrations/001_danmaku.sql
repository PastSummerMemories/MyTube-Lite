-- 弹幕表（已有库单独执行本文件即可）
-- mysql -u root -p youtube_clone < server/migrations/001_danmaku.sql

USE youtube_clone;

CREATE TABLE IF NOT EXISTS danmaku (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  user_id INT NOT NULL,
  content VARCHAR(200) NOT NULL,
  play_time DECIMAL(10, 2) NOT NULL COMMENT '弹幕出现时间（秒，与视频 currentTime 对齐）',
  color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  mode ENUM('scroll', 'top', 'bottom') NOT NULL DEFAULT 'scroll',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_video_play_time (video_id, play_time),
  INDEX idx_video_created (video_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
