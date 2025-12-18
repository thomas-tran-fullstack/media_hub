-- ==========================================
-- DATABASE: media-hub
-- DESCRIPTION: Hub Media - Hệ thống quản lý nội dung và phân tích
-- ==========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS `media_hub`;
USE `media_hub`;

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Users Table (Người dùng)
CREATE TABLE IF NOT EXISTS `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `username` VARCHAR(100) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(255),
    `bio` TEXT,
    `social_provider` VARCHAR(50) DEFAULT 'none',
    `social_id` VARCHAR(255),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Contents Table (Nội dung: Bài viết, Video, Livestream)
CREATE TABLE IF NOT EXISTS `contents` (
    `content_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT,
    `content_type` ENUM('article', 'video', 'livestream') NOT NULL,
    `status` ENUM('draft', 'scheduled', 'published', 'archived') DEFAULT 'draft',
    `thumbnail_url` VARCHAR(255),
    `platforms` JSON,
    `view_count` INT DEFAULT 0,
    `like_count` INT DEFAULT 0,
    `comment_count` INT DEFAULT 0,
    `share_count` INT DEFAULT 0,
    `scheduled_at` DATETIME,
    `published_at` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_content_type` (`content_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Platforms Table (Nền tảng: Facebook, YouTube, TikTok, Zalo)
CREATE TABLE IF NOT EXISTS `platforms` (
    `platform_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) UNIQUE NOT NULL,
    `icon` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Content Platforms (Nội dung được đăng lên nền tảng nào)
CREATE TABLE IF NOT EXISTS `content_platforms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NOT NULL,
    `platform_id` INT NOT NULL,
    `platform_url` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE CASCADE,
    FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`platform_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_content_platform` (`content_id`, `platform_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Livestreams Table (Phát trực tiếp)
CREATE TABLE IF NOT EXISTS `livestreams` (
    `livestream_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `content_id` INT,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT,
    `status` ENUM('offline', 'live', 'scheduled') DEFAULT 'offline',
    `viewer_count` INT DEFAULT 0,
    `is_streaming` BOOLEAN DEFAULT FALSE,
    `stream_url` VARCHAR(500),
    `thumbnail_url` VARCHAR(255),
    `start_at` DATETIME,
    `end_at` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Campaigns Table (Chiến dịch marketing)
CREATE TABLE IF NOT EXISTS `campaigns` (
    `campaign_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT,
    `status` ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
    `start_date` DATE,
    `end_date` DATE,
    `budget` DECIMAL(12, 2),
    `spent` DECIMAL(12, 2) DEFAULT 0,
    `target_audience` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Campaign Contents (Nội dung thuộc chiến dịch)
CREATE TABLE IF NOT EXISTS `campaign_contents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `campaign_id` INT NOT NULL,
    `content_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`campaign_id`) ON DELETE CASCADE,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_campaign_content` (`campaign_id`, `content_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Analytics Table (Số liệu phân tích)
CREATE TABLE IF NOT EXISTS `analytics` (
    `analytics_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `content_id` INT,
    `date` DATE NOT NULL,
    `views` INT DEFAULT 0,
    `clicks` INT DEFAULT 0,
    `likes` INT DEFAULT 0,
    `comments` INT DEFAULT 0,
    `shares` INT DEFAULT 0,
    `revenue` DECIMAL(12, 2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_content_id` (`content_id`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Comments Table (Bình luận)
CREATE TABLE IF NOT EXISTS `comments` (
    `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `text` TEXT NOT NULL,
    `is_approved` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_content_id` (`content_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Media Files Table (Tệp đa phương tiện)
CREATE TABLE IF NOT EXISTS `media_files` (
    `media_id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT,
    `user_id` INT NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_type` ENUM('image', 'video', 'audio', 'document') DEFAULT 'image',
    `file_size` BIGINT,
    `duration` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE SET NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_content_id` (`content_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tags Table (Thẻ/Nhãn)
CREATE TABLE IF NOT EXISTS `tags` (
    `tag_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) UNIQUE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Content Tags (Nội dung có thẻ nào)
CREATE TABLE IF NOT EXISTS `content_tags` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NOT NULL,
    `tag_id` INT NOT NULL,
    FOREIGN KEY (`content_id`) REFERENCES `contents`(`content_id`) ON DELETE CASCADE,
    FOREIGN KEY (`tag_id`) REFERENCES `tags`(`tag_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_content_tag` (`content_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- INSERT DEFAULT DATA
-- ==========================================

-- Insert default platforms
INSERT INTO `platforms` (`name`, `icon`) VALUES
('Facebook', 'f'),
('YouTube', '▶'),
('TikTok', '♪'),
('Zalo', 'Z') ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert sample user
INSERT INTO `users` (`full_name`, `email`, `username`, `password`, `avatar_url`, `bio`) VALUES
('Admin User', 'admin@hubmedia.com', 'admin', '$2b$10$Gpm5H5B8tEmKZgpwPj.0O.8lKSHZQQnzGZLDjRo.VvPnMT/yDmDXq', 'https://via.placeholder.com/150', 'Hub Media Administrator');

-- Insert sample tags
INSERT INTO `tags` (`name`) VALUES
('Khuyến Mãi'),
('Sản Phẩm Mới'),
('Flash Sale'),
('Livestream'),
('Video Hướng Dẫn'),
('Giáng Sinh'),
('Hàng Tồn Kho') ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert sample contents
INSERT INTO `contents` (`user_id`, `title`, `description`, `content_type`, `status`, `view_count`, `like_count`, `comment_count`, `published_at`, `created_at`) VALUES
(1, 'Khuyến Mãi Cuối Tuần - Giảm 50% Trái Cây Nhập Khẩu', 'Đặc biệt giảm giá 50% cho tất cả các loại trái cây nhập khẩu vào cuối tuần này. Không bỏ lỡ cơ hội tuyệt vời!', 'article', 'published', 15200, 320, 45, NOW(), NOW()),
(1, 'Livestream: Giới Thiệu Sản Phẩm Organic Mới', 'Tham gia livestream để khám phá dòng sản phẩm organic hoàn toàn mới, được nhập khẩu từ những nông trại hữu cơ hàng đầu.', 'livestream', 'published', 8900, 510, 120, NOW(), NOW()),
(1, 'Flash Sale Thịt Heo Sạch - Chỉ 3 Giờ', 'Flash sale exclusive cho khách hàng thân thiết. Thịt heo sạch với giá tốt nhất năm, chỉ từ 10:00 - 13:00 hôm nay.', 'article', 'scheduled', 0, 0, 0, NOW(), NOW()),
(1, 'Video: Hướng Dẫn Chọn Hải Sản Tươi Ngon', 'Hướng dẫn chi tiết cách chọn hải sản tươi, cách bảo quản và các công thức nấu ăn đơn giản mà ngon.', 'video', 'published', 6700, 280, 85, NOW(), NOW()),
(1, 'Livestream Bán Hàng: Rau Củ Quả Giá Sốc', 'Buổi livestream bán hàng trực tiếp với các sản phẩm rau, củ, quả được lựa chọn kỹ càng từ các nhà cung cấp đáng tin cậy.', 'livestream', 'draft', 0, 0, 0, NOW(), NOW()),
(1, 'Combo Gia Đình - Tiết Kiệm Đến 30%', 'Gói combo hoàn hảo cho gia đình 4-5 người với các sản phẩm thiết yếu, tiết kiệm đến 30% so với mua lẻ.', 'article', 'published', 12100, 420, 65, NOW(), NOW()),
(1, 'Livestream: Nấu Ăn Với Đầu Bếp Chuyên Nghiệp', 'Tham gia cùng đầu bếp nổi tiếng để học cách nấu những món ăn tuyệt ngon từ những sản phẩm của chúng tôi.', 'livestream', 'scheduled', 0, 0, 0, NOW(), NOW()),
(1, 'Sản Phẩm Mới: Thực Phẩm Hữu Cơ Cao Cấp', 'Ra mắt dòng sản phẩm thực phẩm hữu cơ cao cấp, được chứng nhận quốc tế về chất lượng và an toàn thực phẩm.', 'article', 'published', 9300, 290, 70, NOW(), NOW());

-- Insert sample campaigns
INSERT INTO `campaigns` (`user_id`, `name`, `description`, `status`, `start_date`, `end_date`, `budget`, `target_audience`) VALUES
(1, 'TikTok - 11.11 Sales', 'Chiến dịch bán hàng đặc biệt cho ngày 11.11 trên TikTok với các khuyến mãi hấp dẫn.', 'active', '2024-11-01', '2024-11-15', 5000.00, 'Lứa tuổi 18-35, yêu thích mua sắm online'),
(1, 'Facebook - Combo Mới', 'Quảng cáo các combo sản phẩm mới trên Facebook, nhắm đến khách hàng gia đình.', 'active', '2024-12-01', '2024-12-31', 3000.00, 'Lứa tuổi 25-50, gia đình có con nhỏ');

-- Insert sample scheduled contents
INSERT INTO `contents` (`user_id`, `title`, `description`, `content_type`, `status`, `scheduled_at`, `created_at`) VALUES
(1, 'Khuyến Mãi Hải Sản Tươi Sống', 'Khuyến mãi lớn cho các sản phẩm hải sản tươi sống, được vận chuyển trực tiếp từ vùng biển.', 'article', 'scheduled', '2024-12-23 09:00:00', NOW()),
(1, 'Video: Hướng Dẫn Nấu Món Giáng Sinh', 'Hướng dẫn chi tiết cách nấu các món ăn đặc biệt cho ngày Giáng Sinh với các sản phẩm chất lượng cao.', 'video', 'scheduled', '2024-12-25 15:00:00', NOW()),
(1, 'Livestream: Flash Sale Cuối Năm', 'Buổi livestream bán hàng cuối năm với mức giảm giá kỷ lục, tất cả đều là sản phẩm chất lượng.', 'livestream', 'scheduled', '2024-12-27 20:00:00', NOW());

-- ==========================================
-- ANALYTICS DATA SAMPLES
-- ==========================================

INSERT INTO `analytics` (`user_id`, `content_id`, `date`, `views`, `clicks`, `likes`, `comments`, `shares`, `revenue`) VALUES
(1, 1, CURDATE(), 1250, 320, 85, 15, 25, 0),
(1, 2, CURDATE(), 890, 210, 120, 35, 18, 0),
(1, 3, CURDATE(), 450, 120, 45, 8, 12, 0),
(1, 4, CURDATE(), 650, 180, 70, 20, 15, 0),
(1, 5, CURDATE(), 320, 85, 25, 5, 8, 0),
(1, 6, CURDATE(), 920, 280, 95, 28, 22, 0),
(1, 7, CURDATE(), 1100, 310, 110, 40, 30, 0),
(1, 8, CURDATE(), 780, 220, 80, 25, 18, 0);

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_user_created ON contents(user_id, created_at);
CREATE INDEX idx_platform_content ON content_platforms(platform_id, content_id);
CREATE INDEX idx_campaign_status ON campaigns(user_id, status);
CREATE INDEX idx_analytics_date_range ON analytics(user_id, date);
CREATE INDEX idx_livestream_status ON livestreams(user_id, status);

-- Add phone column to users if not exists
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `phone` VARCHAR(20) DEFAULT NULL AFTER `username`;

-- Ensure avatar_url exists (it already exists in media-hub.sql but this ensures it)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `avatar_url` VARCHAR(255) DEFAULT NULL AFTER `password`;

-- Create user_activities table to track recent user actions
CREATE TABLE IF NOT EXISTS `user_activities` (
  `activity_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add last_login column to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `last_login` DATETIME DEFAULT NULL AFTER `is_active`;

-- Create team_members table to manage team collaboration
CREATE TABLE IF NOT EXISTS `team_members` (
  `member_id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('Manager', 'Editor', 'Assistant') DEFAULT 'Assistant',
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_team_member` (`owner_id`, `user_id`),
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
