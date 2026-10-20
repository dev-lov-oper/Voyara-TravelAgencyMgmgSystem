-- Migration 001: Initial schema for packages and bookings
-- Travel Agency Management System (TAMS)

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  duration INTEGER NOT NULL,
  duration_text TEXT,
  price REAL NOT NULL,
  formatted_price TEXT,
  description TEXT,
  image_url TEXT,
  image_alt TEXT,
  category TEXT,
  is_active INTEGER DEFAULT 1,
  itinerary TEXT,
  inclusions TEXT,
  exclusions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT UNIQUE NOT NULL,
  package_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  traveler_count INTEGER NOT NULL,
  travel_date TEXT NOT NULL,
  additional_requests TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  total_price REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_pkg ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
