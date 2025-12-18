-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 16, 2025 at 09:29 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `media_hub`
--

-- --------------------------------------------------------

--
-- Table structure for table `analytics`
--

CREATE TABLE `analytics` (
  `analytics_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `views` int(11) DEFAULT 0,
  `clicks` int(11) DEFAULT 0,
  `likes` int(11) DEFAULT 0,
  `comments` int(11) DEFAULT 0,
  `shares` int(11) DEFAULT 0,
  `new_followers` int(11) DEFAULT 0,
  `revenue` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `analytics`
--

INSERT INTO `analytics` (`analytics_id`, `user_id`, `content_id`, `date`, `views`, `clicks`, `likes`, `comments`, `shares`, `new_followers`, `revenue`, `created_at`) VALUES
(9, 4, NULL, '2025-12-16', 64, 0, 0, 0, 0, 4, 126.00, '2025-12-16 15:20:20'),
(10, 4, NULL, '2025-12-16', 160, 0, 0, 0, 0, 6, 185.00, '2025-12-16 15:49:23'),
(11, 4, 24, '2025-12-16', 42, 0, 0, 0, 0, 1, 22.00, '2025-12-16 16:26:12'),
(12, 4, 24, '2025-12-16', 38, 0, 0, 0, 0, 4, 72.00, '2025-12-16 16:32:02'),
(13, 4, 24, '2025-12-16', 40, 0, 0, 0, 0, 3, 156.00, '2025-12-16 16:38:14'),
(14, 4, 24, '2025-12-16', 21, 0, 0, 0, 0, 1, 50.00, '2025-12-16 16:39:51'),
(15, 4, 24, '2025-12-16', 25, 0, 0, 0, 0, 0, 6.00, '2025-12-16 16:43:04'),
(16, 4, 24, '2025-12-16', 32, 0, 0, 0, 0, 2, 103.00, '2025-12-16 16:45:50'),
(17, 4, 23, '2025-12-16', 132, 0, 0, 0, 0, 7, 253.00, '2025-12-16 17:29:44'),
(18, 4, NULL, '2025-12-16', 146, 0, 0, 0, 0, 8, 408.00, '2025-12-16 17:58:55'),
(19, 4, 19, '2025-12-16', 27, 0, 0, 0, 0, 1, 20.00, '2025-12-16 18:03:35'),
(20, 4, NULL, '2025-12-16', 20, 0, 0, 0, 0, 0, 26.00, '2025-12-16 18:06:49'),
(21, 4, NULL, '2025-12-16', 18, 0, 0, 0, 0, 1, 21.00, '2025-12-16 18:07:30'),
(22, 6, 26, '2025-12-16', 160, 0, 0, 0, 0, 13, 330.00, '2025-12-16 19:06:07'),
(23, 6, 24, '2025-12-16', 17, 0, 0, 0, 0, 1, 52.00, '2025-12-16 19:07:54'),
(24, 7, 29, '2025-12-16', 153, 0, 0, 0, 0, 5, 76.00, '2025-12-16 19:42:22');

-- --------------------------------------------------------

--
-- Table structure for table `campaigns`
--

CREATE TABLE `campaigns` (
  `campaign_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `status` enum('draft','active','paused','completed') DEFAULT 'draft',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `budget` decimal(12,2) DEFAULT NULL,
  `spent` decimal(12,2) DEFAULT 0.00,
  `target_audience` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaign_contents`
--

CREATE TABLE `campaign_contents` (
  `id` int(11) NOT NULL,
  `campaign_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `comment_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `text` text NOT NULL,
  `is_approved` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contents`
--

CREATE TABLE `contents` (
  `content_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `content_type` enum('article','video','livestream') NOT NULL,
  `status` enum('draft','scheduled','published','archived') DEFAULT 'draft',
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `view_count` int(11) DEFAULT 0,
  `views` int(11) DEFAULT 0,
  `like_count` int(11) DEFAULT 0,
  `comment_count` int(11) DEFAULT 0,
  `share_count` int(11) DEFAULT 0,
  `revenue` decimal(12,2) DEFAULT 0.00,
  `scheduled_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contents`
--

INSERT INTO `contents` (`content_id`, `user_id`, `title`, `description`, `content_type`, `status`, `thumbnail_url`, `platforms`, `view_count`, `views`, `like_count`, `comment_count`, `share_count`, `revenue`, `scheduled_at`, `published_at`, `created_at`, `updated_at`) VALUES
(18, 5, 'Test2', '', 'livestream', 'scheduled', NULL, '[\"Tiktok\",\"Zalo\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-17 01:10:00', NULL, '2025-12-16 06:08:33', '2025-12-16 06:08:33'),
(19, 5, 'test10', '', 'livestream', 'published', NULL, '[]', 27, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 06:08:58', '2025-12-16 18:03:35'),
(23, 4, 'How to put a potato on your head', '', 'livestream', 'published', NULL, '[\"Facebook\",\"Zalo\"]', 132, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 14:32:13', '2025-12-16 17:29:44'),
(24, 4, 'How to take a potato off your head', '', 'livestream', 'published', NULL, '[]', 49, 25, 0, 0, 0, 52.00, NULL, NULL, '2025-12-16 16:24:21', '2025-12-16 19:07:54'),
(26, 6, 'Bố mày live - vào mà xem', '', 'livestream', 'published', NULL, '[]', 160, 0, 0, 0, 0, 330.00, NULL, NULL, '2025-12-16 19:02:41', '2025-12-16 19:06:07'),
(27, 6, 'How to put a potato on your head', '', 'video', 'scheduled', NULL, '[\"Facebook\",\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-18 06:10:00', NULL, '2025-12-16 19:10:22', '2025-12-16 19:10:22'),
(28, 6, 'How to put a potato on your head', '', 'livestream', 'published', NULL, '[\"Facebook\"]', 0, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 19:26:24', '2025-12-16 19:26:24'),
(29, 7, 'Bố mày live - vào mà xem', '', 'livestream', 'published', NULL, '[]', 153, 0, 0, 0, 0, 76.00, NULL, NULL, '2025-12-16 19:38:54', '2025-12-16 19:42:22'),
(30, 7, 'How to put a potato on your head', '', 'video', 'scheduled', NULL, '[\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-26 18:39:00', NULL, '2025-12-16 19:39:49', '2025-12-16 19:39:49'),
(31, 7, 'How to take a potato off your head', '', 'video', 'scheduled', NULL, '[\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-21 17:42:00', NULL, '2025-12-16 19:40:08', '2025-12-16 19:40:08'),
(32, 4, 'Nấu ăn cùng Tân', '', 'video', 'scheduled', NULL, '[\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-22 07:00:00', NULL, '2025-12-16 20:15:18', '2025-12-16 20:15:18'),
(33, 4, 'Anh ba Tân Vlog', '', 'video', 'published', NULL, '[\"Facebook\",\"Youtube\",\"Tiktok\"]', 0, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 20:15:41', '2025-12-16 20:15:41'),
(34, 4, 'Karaoke - Một đêm say | Tone nam trầm', '', 'article', 'draft', NULL, '[]', 0, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 20:16:28', '2025-12-16 20:16:43'),
(35, 4, 'Learning English at home with Mr Tan', '', 'livestream', 'scheduled', NULL, '[\"Facebook\",\"Tiktok\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-19 18:15:00', NULL, '2025-12-16 20:17:34', '2025-12-16 20:17:34'),
(36, 4, 'Stream meet fans', '', 'livestream', 'scheduled', NULL, '[\"Facebook\",\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-20 20:30:00', NULL, '2025-12-16 20:18:17', '2025-12-16 20:18:17'),
(37, 4, 'Thử thách 24h chạy deadline | Tân Vlogs', '', 'video', 'scheduled', NULL, '[\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-27 06:30:00', NULL, '2025-12-16 20:19:12', '2025-12-16 20:19:12'),
(38, 4, 'Stream meet fans 2', '', 'livestream', 'scheduled', NULL, '[\"Facebook\",\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-30 20:30:00', NULL, '2025-12-16 20:19:49', '2025-12-16 20:19:49'),
(39, 4, 'Cách nhảy hiphop ke đầu', '', 'article', 'published', NULL, '[\"Facebook\",\"Tiktok\"]', 0, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 20:20:30', '2025-12-16 20:20:30'),
(40, 4, 'Đà Lạt cùng em !', '', 'article', 'scheduled', NULL, '[\"Facebook\",\"Tiktok\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-23 03:30:00', NULL, '2025-12-16 20:21:30', '2025-12-16 20:21:30'),
(41, 4, 'Anh ba Tân sẽ ngừng làm content', '', 'video', 'scheduled', NULL, '[]', 0, 0, 0, 0, 0, 0.00, '2025-12-26 11:30:00', NULL, '2025-12-16 20:22:33', '2025-12-16 20:22:58'),
(42, 4, 'Anh ba Tân đã comeback 😱', '', 'video', 'scheduled', NULL, '[\"Facebook\",\"Youtube\",\"Tiktok\"]', 0, 0, 0, 0, 0, 0.00, '2025-12-26 11:40:00', NULL, '2025-12-16 20:24:00', '2025-12-16 20:24:00'),
(43, 4, 'Karaoke - 31/07 | Remix cực cháy', '', 'video', 'draft', NULL, '[\"Youtube\"]', 0, 0, 0, 0, 0, 0.00, NULL, NULL, '2025-12-16 20:25:22', '2025-12-16 20:25:22');

-- --------------------------------------------------------

--
-- Table structure for table `content_platforms`
--

CREATE TABLE `content_platforms` (
  `id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `platform_id` int(11) NOT NULL,
  `platform_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `content_tags`
--

CREATE TABLE `content_tags` (
  `id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `livestreams`
--

CREATE TABLE `livestreams` (
  `livestream_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `status` enum('offline','live','scheduled') DEFAULT 'offline',
  `viewer_count` int(11) DEFAULT 0,
  `is_streaming` tinyint(1) DEFAULT 0,
  `stream_url` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `media_files`
--

CREATE TABLE `media_files` (
  `media_id` int(11) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_type` enum('image','video','audio','document') DEFAULT 'image',
  `file_size` bigint(20) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platforms`
--

CREATE TABLE `platforms` (
  `platform_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `platforms`
--

INSERT INTO `platforms` (`platform_id`, `name`, `icon`, `created_at`) VALUES
(1, 'Facebook', 'f', '2025-12-16 04:27:12'),
(2, 'YouTube', '▶', '2025-12-16 04:27:12'),
(3, 'TikTok', '♪', '2025-12-16 04:27:12'),
(4, 'Zalo', 'Z', '2025-12-16 04:27:12');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('gO_zQ69iEa2Zi7fJnnIVHuckrEl32fML', 1765946787, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-12-17T04:46:25.187Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":5,\"user_id\":5,\"full_name\":\"Trần Bảo Toàn\",\"email\":\"tbtoan@gmail.com\",\"username\":\"quibtt111\"}}');

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `tag_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tags`
--

INSERT INTO `tags` (`tag_id`, `name`, `created_at`) VALUES
(1, 'Khuyến Mãi', '2025-12-16 04:27:12'),
(2, 'Sản Phẩm Mới', '2025-12-16 04:27:12'),
(3, 'Flash Sale', '2025-12-16 04:27:12'),
(4, 'Livestream', '2025-12-16 04:27:12'),
(5, 'Video Hướng Dẫn', '2025-12-16 04:27:12'),
(6, 'Giáng Sinh', '2025-12-16 04:27:12'),
(7, 'Hàng Tồn Kho', '2025-12-16 04:27:12');

-- --------------------------------------------------------

--
-- Table structure for table `team_members`
--

CREATE TABLE `team_members` (
  `member_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('Manager','Editor','Assistant') DEFAULT 'Assistant',
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `team_members`
--

INSERT INTO `team_members` (`member_id`, `owner_id`, `user_id`, `role`, `added_at`, `updated_at`) VALUES
(3, 7, 4, 'Assistant', '2025-12-16 19:38:27', '2025-12-16 19:38:27'),
(4, 7, 6, 'Editor', '2025-12-16 19:38:35', '2025-12-16 19:38:35'),
(5, 4, 6, 'Editor', '2025-12-16 20:27:53', '2025-12-16 20:27:53'),
(6, 4, 5, 'Manager', '2025-12-16 20:28:00', '2025-12-16 20:28:00'),
(7, 4, 7, 'Assistant', '2025-12-16 20:28:08', '2025-12-16 20:28:08');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `mini_supermarket` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `social_provider` varchar(50) DEFAULT 'none',
  `social_id` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `mini_supermarket`, `email`, `username`, `phone`, `address`, `password`, `avatar_url`, `bio`, `social_provider`, `social_id`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(4, 'Nguyễn Duy Tân', 'test', 'dtank@gmail.com', 'a3tank', '(+84) 343 617 067', '', '$2b$10$Px9fTyWsn1GrAY4d4HRT8.lyTkp44B4xyQNBlZ3szxl8SXwGLAzHm', 'http://localhost:3000/uploads/1765916961589-366452108.jpg', 'test', 'none', NULL, 1, '2025-12-17 03:14:00', '2025-12-16 04:34:33', '2025-12-16 20:29:21'),
(5, 'Trần Bảo Toàn', NULL, 'tbtoan@gmail.com', 'quibtt111', NULL, NULL, '$2b$10$ctyleqSVds1kci4RKu70ReZz1XHc35cD0JUs3cnbZFIpt3hGRoYMe', NULL, NULL, 'none', NULL, 1, '2025-12-16 12:23:34', '2025-12-16 04:46:18', '2025-12-16 05:23:34'),
(6, 'Lương Hoàng Khải', NULL, 'khai@gmail.com', 'khai123', '', '', '$2b$10$IC47SNAbDcsPBEXkf1upx.Wv9MLKS305nh/9V7v.vaEWoo.tVMZ.G', NULL, '', 'none', NULL, 1, '2025-12-17 02:00:19', '2025-12-16 19:00:02', '2025-12-16 20:13:46'),
(7, 'Nguyễn Bình Minh', NULL, 'bminh@gmail.com', 'biminh123', '', '', '$2b$10$rrcTo3u5AUlk/KHBWkyvN.JCsGbiFM6oM3B7d7ab4VKQNIGLtlqR.', NULL, '', 'none', NULL, 1, '2025-12-17 02:35:37', '2025-12-16 19:35:21', '2025-12-16 19:46:17');

-- --------------------------------------------------------

--
-- Table structure for table `user_activities`
--

CREATE TABLE `user_activities` (
  `activity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_activities`
--

INSERT INTO `user_activities` (`activity_id`, `user_id`, `action`, `details`, `created_at`) VALUES
(1, 4, 'update_profile', '{\"full_name\":\"Nguyễn Duy Tân\",\"email\":\"dtank@gmail.com\"}', '2025-12-16 04:35:34'),
(2, 4, 'update_profile', '{\"full_name\":\"Nguyễn Duy Tân\",\"email\":\"dtank@gmail.com\"}', '2025-12-16 11:06:50'),
(3, 4, 'update_profile', '{\"full_name\":\"Nguyễn Duy Tân\",\"email\":\"dtank@gmail.com\",\"phone\":\"(+84) 343 617 067\"}', '2025-12-16 11:23:21'),
(4, 4, 'update_avatar', 'http://localhost:3000/uploads/1765896416133-622311813.jpg', '2025-12-16 14:46:56'),
(5, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:12:55'),
(6, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:12:56'),
(7, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:12:57'),
(8, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:13:03'),
(9, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:13:04'),
(10, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:13:05'),
(11, 6, 'update_profile', '{\"full_name\":\"Lương Hoàng Hải\",\"email\":\"khai@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:13:06'),
(12, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:12'),
(13, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:12'),
(14, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:14'),
(15, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:15'),
(16, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:16'),
(17, 7, 'update_profile', '{\"full_name\":\"Nguyễn Bình Minh\",\"email\":\"bminh@gmail.com\",\"phone\":\"\"}', '2025-12-16 19:46:17'),
(18, 4, 'update_avatar', 'http://localhost:3000/uploads/1765916961589-366452108.jpg', '2025-12-16 20:29:21');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `analytics`
--
ALTER TABLE `analytics`
  ADD PRIMARY KEY (`analytics_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_content_id` (`content_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_analytics_date_range` (`user_id`,`date`);

--
-- Indexes for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`campaign_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_campaign_status` (`user_id`,`status`);

--
-- Indexes for table `campaign_contents`
--
ALTER TABLE `campaign_contents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_campaign_content` (`campaign_id`,`content_id`),
  ADD KEY `content_id` (`content_id`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `idx_content_id` (`content_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `contents`
--
ALTER TABLE `contents`
  ADD PRIMARY KEY (`content_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_content_type` (`content_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`);

--
-- Indexes for table `content_platforms`
--
ALTER TABLE `content_platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_content_platform` (`content_id`,`platform_id`),
  ADD KEY `idx_platform_content` (`platform_id`,`content_id`);

--
-- Indexes for table `content_tags`
--
ALTER TABLE `content_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_content_tag` (`content_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`);

--
-- Indexes for table `livestreams`
--
ALTER TABLE `livestreams`
  ADD PRIMARY KEY (`livestream_id`),
  ADD KEY `content_id` (`content_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_livestream_status` (`user_id`,`status`);

--
-- Indexes for table `media_files`
--
ALTER TABLE `media_files`
  ADD PRIMARY KEY (`media_id`),
  ADD KEY `idx_content_id` (`content_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `platforms`
--
ALTER TABLE `platforms`
  ADD PRIMARY KEY (`platform_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`tag_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `team_members`
--
ALTER TABLE `team_members`
  ADD PRIMARY KEY (`member_id`),
  ADD UNIQUE KEY `unique_team_member` (`owner_id`,`user_id`),
  ADD KEY `idx_owner_id` (`owner_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_username` (`username`);

--
-- Indexes for table `user_activities`
--
ALTER TABLE `user_activities`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `analytics`
--
ALTER TABLE `analytics`
  MODIFY `analytics_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `campaign_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `campaign_contents`
--
ALTER TABLE `campaign_contents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `comment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contents`
--
ALTER TABLE `contents`
  MODIFY `content_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `content_platforms`
--
ALTER TABLE `content_platforms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `content_tags`
--
ALTER TABLE `content_tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `livestreams`
--
ALTER TABLE `livestreams`
  MODIFY `livestream_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `media_files`
--
ALTER TABLE `media_files`
  MODIFY `media_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `platforms`
--
ALTER TABLE `platforms`
  MODIFY `platform_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tags`
--
ALTER TABLE `tags`
  MODIFY `tag_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `team_members`
--
ALTER TABLE `team_members`
  MODIFY `member_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_activities`
--
ALTER TABLE `user_activities`
  MODIFY `activity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `analytics`
--
ALTER TABLE `analytics`
  ADD CONSTRAINT `analytics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `analytics_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE SET NULL;

--
-- Constraints for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `campaign_contents`
--
ALTER TABLE `campaign_contents`
  ADD CONSTRAINT `campaign_contents_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`campaign_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `campaign_contents_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE CASCADE;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `contents`
--
ALTER TABLE `contents`
  ADD CONSTRAINT `contents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `content_platforms`
--
ALTER TABLE `content_platforms`
  ADD CONSTRAINT `content_platforms_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `content_platforms_ibfk_2` FOREIGN KEY (`platform_id`) REFERENCES `platforms` (`platform_id`) ON DELETE CASCADE;

--
-- Constraints for table `content_tags`
--
ALTER TABLE `content_tags`
  ADD CONSTRAINT `content_tags_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `content_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`tag_id`) ON DELETE CASCADE;

--
-- Constraints for table `livestreams`
--
ALTER TABLE `livestreams`
  ADD CONSTRAINT `livestreams_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `livestreams_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE SET NULL;

--
-- Constraints for table `media_files`
--
ALTER TABLE `media_files`
  ADD CONSTRAINT `media_files_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`content_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `media_files_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `team_members`
--
ALTER TABLE `team_members`
  ADD CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `team_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_activities`
--
ALTER TABLE `user_activities`
  ADD CONSTRAINT `user_activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
