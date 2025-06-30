CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  hotel_name VARCHAR(100),
  price_per_hour NUMERIC(10, 2) DEFAULT 50,
  support_email VARCHAR(100) UNIQUE NOT NULL,
  support_phone VARCHAR(20),
  contact_person VARCHAR(100),
  password TEXT NOT NULL
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  room VARCHAR(20) NOT NULL,
  booking_date DATE NOT NULL,
  date_time TIMESTAMP NOT NULL, -- start datetime
  duration INTEGER NOT NULL,    -- in hours
  total NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
);
