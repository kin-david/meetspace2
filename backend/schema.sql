CREATE DATABASE IF NOT EXISTS meetspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meetspace_db;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NULL,
  password VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  initials VARCHAR(8) NULL,
  color VARCHAR(20) NULL,
  profile_picture VARCHAR(255) NULL,
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_token VARCHAR(128) NULL,
  email_verification_expires DATETIME NULL,
  reset_token VARCHAR(128) NULL,
  reset_token_expires DATETIME NULL,
  auth_provider ENUM('local') NOT NULL DEFAULT 'local',
  joined_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenants_email (email),
  INDEX idx_tenants_verify_token (email_verification_token),
  INDEX idx_tenants_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  capacity INT NOT NULL,
  floor INT NOT NULL,
  price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  status ENUM('available','occupied','reserved','maintenance') NOT NULL DEFAULT 'available',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add price_per_hour column to existing rooms table if it doesn't exist
ALTER TABLE rooms ADD COLUMN price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 50.00 AFTER floor;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_ref VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(191) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendees INT NOT NULL DEFAULT 1,
  purpose TEXT NULL,
  status ENUM('upcoming','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  payment_method VARCHAR(40) NULL,
  payment_contact VARCHAR(120) NULL,
  payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bookings_tenant (tenant_id),
  INDEX idx_bookings_room (room_id),
  INDEX idx_bookings_date (date),
  CONSTRAINT fk_bookings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admins (name, email, password)
VALUES ('MeetSpace Admin', 'admin@meetspace.co.ke', '$2a$10$pwfdiJvupCw4jMXaQ0ZsNOcZbRkJuLnselOMIRli3Xtknqcw9augW')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO rooms (room_code, name, capacity, floor, price_per_hour, status)
VALUES
  ('R1', 'Boardroom A', 10, 2, 150.00, 'available'),
  ('R2', 'Focus Room B', 4, 1, 75.00, 'available'),
  ('R3', 'Workshop C', 20, 3, 250.00, 'available'),
  ('R4', 'Pod D', 2, 1, 50.00, 'available'),
  ('R5', 'Suite E', 8, 2, 120.00, 'available')
ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity), floor = VALUES(floor), price_per_hour = VALUES(price_per_hour), status = VALUES(status);
