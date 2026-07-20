CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  password TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  initials TEXT,
  color TEXT,
  profile_picture TEXT,
  is_email_verified INTEGER NOT NULL DEFAULT 0,
  email_verification_token TEXT,
  email_verification_expires DATETIME,
  reset_token TEXT,
  reset_token_expires DATETIME,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  joined_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_verify_token ON tenants(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_tenants_reset_token ON tenants(reset_token);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  price_per_hour REAL NOT NULL DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','reserved','maintenance')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_ref TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendees INTEGER NOT NULL DEFAULT 1,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','completed','cancelled')),
  payment_method TEXT,
  payment_contact TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','refunded')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

INSERT OR IGNORE INTO admins (name, email, password)
VALUES ('MeetSpace Admin', 'admin@meetspace.co.ke', '$2a$10$pwfdiJvupCw4jMXaQ0ZsNOcZbRkJuLnselOMIRli3Xtknqcw9augW');

INSERT OR REPLACE INTO rooms (room_code, name, capacity, floor, price_per_hour, status)
VALUES
  ('R1', 'Boardroom A', 10, 2, 150.00, 'available'),
  ('R2', 'Focus Room B', 4, 1, 75.00, 'available'),
  ('R3', 'Workshop C', 20, 3, 250.00, 'available'),
  ('R4', 'Pod D', 2, 1, 50.00, 'available'),
  ('R5', 'Suite E', 8, 2, 120.00, 'available');
