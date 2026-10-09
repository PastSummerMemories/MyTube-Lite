-- 评论示例数据（需已有 users、videos）
-- 用法: mysql -u root -p youtube_clone < server/seeds/comments_seed.sql

USE youtube_clone;

SET @u1 = (SELECT id FROM users ORDER BY id ASC LIMIT 1);
SET @u2 = (SELECT id FROM users ORDER BY id ASC LIMIT 1 OFFSET 1);
SET @u2 = IFNULL(@u2, @u1);

SET @v1 = (SELECT id FROM videos ORDER BY id ASC LIMIT 1);
SET @v2 = (SELECT id FROM videos ORDER BY id ASC LIMIT 1 OFFSET 1);
SET @v2 = IFNULL(@v2, @v1);
SET @v3 = (SELECT id FROM videos ORDER BY id ASC LIMIT 1 OFFSET 2);
SET @v3 = IFNULL(@v3, @v1);

-- ========== 视频 1 ==========
INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u1, @v1, '第一条！前排打卡', NULL);
SET @c1 = LAST_INSERT_ID();

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u2, @v1, '画质不错，收藏了', NULL);

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u1, @v1, '有内味了，期待续集', NULL);

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u2, @v1, '同感，UP主加油', @c1);

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u1, @v1, '谢谢支持～', @c1);

-- ========== 视频 2 ==========
INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u2, @v2, '这段讲解很清晰', NULL);

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u1, @v2, '请问 03:20 用的是什么框架？', NULL);
SET @c4 = LAST_INSERT_ID();

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u2, @v2, '就是视频里说的 React + Node', @c4);

-- ========== 视频 3 ==========
INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u1, @v3, '弹幕笑死我了', NULL);

INSERT INTO comments (user_id, video_id, text, parent_id)
VALUES (@u2, @v3, '已三连', NULL);

SELECT COUNT(*) AS total_comments FROM comments;
