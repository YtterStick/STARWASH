-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 05, 2024 at 02:58 PM
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
-- Database: `starwash_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `address`, `created_at`, `updated_at`) VALUES
(1, 'Branch 1', NULL, '2024-11-26 11:59:51', '2024-11-26 11:59:51'),
(2, 'Branch 2', NULL, '2024-11-26 11:59:51', '2024-11-26 11:59:51'),
(3, 'Branch 3', NULL, '2024-11-26 11:59:51', '2024-11-26 11:59:51'),
(4, 'test', 'test', '2024-12-03 14:41:09', '2024-12-03 14:41:09'),
(5, 'branch5', 'branch5', '2024-12-05 01:56:21', '2024-12-05 01:56:21');

-- --------------------------------------------------------

--
-- Table structure for table `sales_orders`
--

CREATE TABLE `sales_orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) UNSIGNED NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `number_of_loads` int(11) NOT NULL,
  `services` varchar(255) NOT NULL,
  `detergent_count` int(11) DEFAULT 0,
  `fabric_softener_count` int(11) DEFAULT 0,
  `additional_fees` decimal(10,2) DEFAULT 3.00,
  `total_cost` decimal(10,2) NOT NULL,
  `payment_status` enum('Paid','Unpaid') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `paid_at` datetime DEFAULT NULL,
  `claimed_at` datetime DEFAULT NULL,
  `month_created` varchar(20) DEFAULT NULL,
  `claimed_status` enum('Claimed','Unclaimed') DEFAULT 'Unclaimed',
  `branch_id` int(11) NOT NULL,
  `load_status` enum('Pending','Ongoing','Completed') DEFAULT 'Pending',
  `phone_number` varchar(15) NOT NULL,
  `is_today_transaction` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_orders`
--

INSERT INTO `sales_orders` (`id`, `user_id`, `customer_name`, `number_of_loads`, `services`, `detergent_count`, `fabric_softener_count`, `additional_fees`, `total_cost`, `payment_status`, `created_at`, `paid_at`, `claimed_at`, `month_created`, `claimed_status`, `branch_id`, `load_status`, `phone_number`, `is_today_transaction`) VALUES
(196, 44, 'Brook', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-02 06:19:12', '2024-12-02 16:01:07', '2024-12-02 17:16:22', 'December', 'Claimed', 1, 'Completed', '', 0),
(197, 44, 'Luffy', 1, 'Special Service', 2, 2, 3.00, 263.00, 'Paid', '2024-12-02 06:19:44', '2024-12-02 14:19:44', '2024-12-02 14:20:53', 'December', 'Claimed', 1, 'Completed', '', 0),
(198, 44, 'Nami', 2, 'Special Service', 2, 2, 3.00, 463.00, 'Paid', '2024-12-02 06:30:19', '2024-12-02 16:03:10', NULL, 'December', 'Unclaimed', 1, NULL, '', 0),
(199, 44, 'Sanji', 1, 'Wash', 0, 0, 3.00, 98.00, 'Paid', '2024-12-02 06:30:24', '2024-12-02 14:30:24', NULL, 'December', 'Unclaimed', 1, NULL, '', 0),
(200, 45, 'LuffyLand', 5, 'Wash & Dry', 5, 6, 3.00, 816.00, 'Paid', '2024-12-02 06:53:59', '2024-12-04 20:57:56', NULL, 'December', 'Unclaimed', 2, 'Completed', '', 1),
(201, 45, 'Lucy', 2, 'Wash & Dry', 2, 2, 3.00, 323.00, 'Paid', '2024-12-02 06:54:10', '2024-12-02 14:54:10', '2024-12-02 16:05:59', 'December', 'Claimed', 2, NULL, '', 0),
(202, 44, 'Chopper', 2, 'Wash & Dry', 2, 2, 3.00, 323.00, 'Paid', '2024-12-02 07:49:02', '2024-12-02 15:49:02', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(203, 44, 'Gianan', 2, 'Wash', 2, 2, 3.00, 253.00, 'Paid', '2024-12-02 07:49:14', '2024-12-02 16:35:26', '2024-12-02 16:35:36', 'December', 'Claimed', 1, 'Completed', '', 0),
(204, 44, 'wwi', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-02 08:03:44', '2024-12-02 16:37:37', NULL, 'December', 'Unclaimed', 1, 'Completed', '', 0),
(205, 44, 'Sheena', 2, 'Wash', 0, 0, 3.00, 193.00, 'Paid', '2024-12-02 08:35:51', '2024-12-02 16:35:51', '2024-12-02 16:36:38', 'December', 'Claimed', 1, 'Completed', '', 0),
(206, 44, 'Aleeza', 1, 'Wash & Dry', 1, 2, 3.00, 176.00, 'Paid', '2024-12-02 08:36:14', '2024-12-02 16:37:25', '2024-12-02 16:37:31', 'December', 'Claimed', 1, 'Completed', '', 0),
(207, 44, 'Zoro', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-02 09:17:23', '2024-12-02 17:17:23', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(208, 44, 'Franky', 2, 'Wash & Dry', 2, 2, 3.00, 323.00, 'Paid', '2024-12-02 09:22:07', '2024-12-02 17:22:07', '2024-12-03 12:43:19', 'December', 'Claimed', 1, 'Completed', '', 0),
(209, 44, 'pagi', 1, 'Wash', 1, 1, 3.00, 128.00, 'Paid', '2024-12-02 10:56:43', '2024-12-02 18:56:43', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(211, 44, 'sheyi makulit', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-02 11:30:40', '2024-12-02 19:35:53', NULL, 'December', 'Unclaimed', 1, 'Completed', '', 0),
(212, 44, 'andrei makulit', 2, 'Special Service', 3, 3, 3.00, 493.00, 'Paid', '2024-12-02 11:30:59', '2024-12-02 20:30:31', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(216, 44, 'andrei dilag', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-02 11:54:06', '2024-12-02 19:54:06', NULL, 'December', 'Unclaimed', 1, 'Completed', '09150475513', 0),
(217, 44, 'numer mo', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-02 12:11:59', '2024-12-02 20:11:59', NULL, 'December', 'Unclaimed', 1, 'Pending', '09150475513', 0),
(218, 44, 'andrei', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-02 12:14:50', '2024-12-02 20:14:50', NULL, 'December', 'Unclaimed', 1, 'Pending', '09150475513', 0),
(219, 44, 'test', 1, 'Wash', 1, 0, 3.00, 115.00, 'Paid', '2024-12-02 12:17:58', '2024-12-02 20:17:58', NULL, 'December', 'Unclaimed', 1, 'Pending', '+639150475513', 0),
(220, 44, 'dilag', 1, 'Wash', 1, 1, 3.00, 128.00, 'Paid', '2024-12-02 12:20:01', '2024-12-02 20:20:01', NULL, 'December', 'Unclaimed', 1, 'Ongoing', '09150475513', 0),
(221, 44, 'andrei', 2, 'Wash', 2, 2, 3.00, 253.00, 'Paid', '2024-12-02 12:21:05', '2024-12-04 18:58:00', NULL, 'December', 'Unclaimed', 1, 'Completed', '+639150475513', 0),
(222, 44, 'dilag', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-02 12:27:26', '2024-12-02 20:27:26', '2024-12-02 20:30:49', 'December', 'Claimed', 1, 'Completed', '+639150475513', 0),
(223, 44, 'Robin', 2, 'Wash', 0, 0, 3.00, 193.00, 'Paid', '2024-12-02 16:26:14', '2024-12-03 00:26:14', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(224, 44, 'Nami', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-02 16:26:23', '2024-12-03 11:12:30', '2024-12-03 11:12:35', 'December', 'Claimed', 1, 'Completed', '', 0),
(225, 51, 'test', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-03 03:10:33', '2024-12-04 20:51:50', NULL, 'December', 'Unclaimed', 3, 'Completed', '', 1),
(226, 44, 'gumagana', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-03 04:50:25', '2024-12-03 12:50:33', NULL, 'December', 'Unclaimed', 1, 'Completed', '', 0),
(227, 44, 'other da', 2, 'Wash & Dry', 1, 0, 3.00, 280.00, 'Paid', '2024-12-03 15:43:09', '2024-12-04 06:40:36', NULL, 'December', 'Unclaimed', 1, 'Ongoing', '', 0),
(228, 44, 'wow', 2, 'Special Service', 1, 1, 3.00, 433.00, 'Paid', '2024-12-03 15:43:30', '2024-12-03 23:43:30', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(229, 57, 'wo', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-03 16:05:00', '2024-12-05 04:17:19', NULL, 'December', 'Unclaimed', 4, 'Pending', '', 1),
(230, 57, 'kumita ka', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-03 16:05:14', '2024-12-04 00:05:14', NULL, 'December', 'Unclaimed', 4, 'Pending', '', 0),
(231, 44, 'pogi', 2, 'Wash & Dry', 2, 2, 3.00, 323.00, 'Paid', '2024-12-03 22:40:08', '2024-12-04 19:36:51', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(232, 45, 'Sheesh', 2, 'Wash', 2, 2, 3.00, 253.00, 'Paid', '2024-12-03 22:41:13', '2024-12-04 19:37:42', NULL, 'December', 'Unclaimed', 2, 'Pending', '', 0),
(233, 45, 'pogi', 2, 'Dry', 0, 0, 3.00, 133.00, 'Paid', '2024-12-03 22:41:21', '2024-12-04 06:41:21', NULL, 'December', 'Unclaimed', 2, 'Completed', '', 0),
(234, 45, 'test', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-03 22:42:09', '2024-12-04 20:34:02', NULL, 'December', 'Unclaimed', 2, 'Pending', '', 0),
(235, 44, 'nice gumagana', 2, 'Special Service', 2, 2, 3.00, 463.00, 'Paid', '2024-12-03 22:42:39', '2024-12-04 19:35:02', NULL, 'December', 'Unclaimed', 1, 'Completed', '', 0),
(236, 44, 'loads', 100, 'Wash & Dry', 1, 1, 3.00, 13033.00, 'Paid', '2024-12-03 22:43:06', '2024-12-04 06:43:06', NULL, 'December', 'Unclaimed', 1, 'Ongoing', '', 0),
(238, 57, 'test line', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-04 02:41:35', '2024-12-05 01:35:04', NULL, 'December', 'Unclaimed', 4, 'Pending', '', 1),
(241, 44, 'test', 1, 'Wash', 1, 1, 3.00, 128.00, 'Paid', '2024-12-04 11:36:42', '2024-12-04 19:36:42', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(242, 44, 'andrei', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-04 11:37:04', '2024-12-04 19:37:09', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(243, 44, 'aguy', 2, 'Wash', 0, 0, 3.00, 193.00, 'Paid', '2024-12-04 11:37:20', '2024-12-04 19:37:20', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(244, 44, 'test for tommorow', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Unpaid', '2024-12-04 11:37:31', NULL, NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(245, 44, 'test', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Paid', '2024-12-04 12:25:19', '2024-12-04 20:33:30', NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0),
(246, 46, 'test', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-04 12:52:18', '2024-12-04 20:52:23', NULL, 'December', 'Unclaimed', 3, 'Pending', '', 1),
(247, 45, 'yte', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Paid', '2024-12-04 13:06:27', '2024-12-04 21:06:35', NULL, 'December', 'Unclaimed', 2, 'Pending', '', 1),
(248, 46, 'kapoy', 1, 'Wash & Dry', 1, 1, 3.00, 163.00, 'Unpaid', '2024-12-04 17:23:21', NULL, NULL, 'December', 'Unclaimed', 3, 'Pending', '', 0),
(250, 58, 'luffy', 2, 'Wash & Dry', 1, 2, 3.00, 306.00, 'Unpaid', '2024-12-04 20:22:10', NULL, NULL, 'December', 'Unclaimed', 5, 'Pending', '', 0),
(251, 58, 'Chopper', 10, 'Wash & Dry', 10, 10, 3.00, 1603.00, 'Paid', '2024-12-04 20:22:40', '2024-12-05 04:22:40', '2024-12-05 04:23:04', 'December', 'Claimed', 5, 'Completed', '', 0),
(252, 45, 'pogi andrei bigat', 5, 'Special Service', 10, 10, 3.00, 1303.00, 'Unpaid', '2024-12-04 20:48:59', NULL, NULL, 'December', 'Unclaimed', 2, 'Completed', '', 0),
(253, 44, 'test', 2, 'Wash & Dry', 1, 1, 3.00, 293.00, 'Unpaid', '2024-12-04 21:32:06', NULL, NULL, 'December', 'Unclaimed', 1, 'Pending', '', 0);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Staff') NOT NULL DEFAULT 'Staff',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `branch_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `created_at`, `branch_id`) VALUES
(26, 'admin', '$2a$10$nbMbCeYK0SLOAJOC7AIlGuMlvO6Z48CapCsuksmAp98y.tMVyZCEW', 'Admin', '2024-11-26 17:35:54', 1),
(44, 'andrei', '$2a$10$YJgz6EoZCmYi.5Vy4YRAHuC2vCx5uCIG4Ywi9U9wlXcuUihKeufoS', 'Staff', '2024-11-30 07:41:42', 1),
(45, 'dilag', '$2a$10$eS5QsxdvhKlNqNCAC/5Zdud2Zh7DLnqxzoHCSUTCE4zwtkqiVj5zO', 'Staff', '2024-11-30 07:41:53', 2),
(46, 'gianan', '$2a$10$yy83at431Nl9W5dgFw1WMe6MB1yU8XdMjQQnRYaIY4AKryKISvB/a', 'Staff', '2024-11-30 07:42:12', 3),
(47, 'test', '$2a$10$cDTRvSD8p6vSFPCsEYB8luNd6O/oHseST1RtbXIMV/n7SVUeEPO66', 'Admin', '2024-11-30 07:58:38', 1),
(48, 'admin_andrei', '$2a$10$nsQIWmYt/V3G6usqQRmK2OD7PxXj4.m5nilSLrYOgaIcBn2eV1kXG', 'Admin', '2024-12-03 11:03:47', 1),
(49, 'branch1', '$2a$10$iz.Dfk9a9UXTPgTola8pEuvsCzHmQco6JHmzrtPfLLJG25k..hoOm', 'Staff', '2024-12-03 11:07:48', 1),
(50, 'branch2', '$2a$10$Wm18/qf2Z/vZBV.fJoCHzu7ktDHcijgMX9cKZIL8VtKOVYIFyas6G', 'Staff', '2024-12-03 11:07:57', 1),
(51, 'branch3', '$2a$10$w.Un1SC2EuRq6hs1XuUtTOFtAKy1yYaI/m2tmDW1F2nwCXWp564oO', 'Staff', '2024-12-03 11:10:07', 3),
(52, 'admin_tester', '$2a$10$1Jm9eHIn22kV2xqvMwRDwev3cz8dEfMJnu1OiFlfL5lZrH5yDQW5e', 'Admin', '2024-12-03 11:21:58', 1),
(53, 'admin123', '$2a$10$iXihsTv4JsGp63Gruk6P4.6ONaxJH7gXvCV.bfbrycqhizmddjOti', 'Admin', '2024-12-03 11:25:56', NULL),
(54, '0612', '$2a$10$Ab0b7suBDy4V6hqknHB04ObO8QhS8hnlJCP0D86NshAZTpPwDSwy.', 'Admin', '2024-12-03 11:52:23', NULL),
(55, 'gumagana ba', '$2a$10$DB8Of9pv3csrm.JARxaZuua80pp82YTkeuk56uj6tvHpAdKakzZ/m', 'Staff', '2024-12-03 12:25:54', 3),
(56, '123456', '$2a$10$Zj7Bt93rWwIvzKghgzYSWOPOTf.GMW6zbvAzpZ86tLUUcZR3F3kR6', 'Admin', '2024-12-03 12:26:08', NULL),
(57, 'nice', '$2a$10$PMt2HPqlCv/L1t8cb0/5zeYbmTZ47CZ6gIV79Ctfr/OiY1YL6H/uW', 'Staff', '2024-12-03 14:45:04', 4),
(58, 'branch5', '$2a$10$srlpUXpRZvP/4BlxwAW5OOt95KDXvYq6iPgq2EFZwiaDQV68etS.a', 'Staff', '2024-12-05 04:21:17', 5);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sales_orders_user_id` (`user_id`),
  ADD KEY `fk_sales_orders_branch_id` (`branch_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_users_branch_id` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sales_orders`
--
ALTER TABLE `sales_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=254;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD CONSTRAINT `fk_sales_orders_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sales_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
