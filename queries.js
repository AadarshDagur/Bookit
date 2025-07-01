// These are the SQL queries used in the BookIt application for managing hotels and bookings.
export const HOTEL = {
  GET_BY_EMAIL_AND_PASSWORD: `
    SELECT * FROM hotels WHERE support_email = $1 AND password = $2
  `,
  GET_BY_EMAIL: `
    SELECT * FROM hotels WHERE support_email = $1
  `,
  INSERT: `
    INSERT INTO hotels (support_email, password)
    VALUES ($1, $2)
  `,
  GET_ID_BY_EMAIL: `
    SELECT id FROM hotels WHERE support_email = $1
  `,
  CREATE_HOTEL:`
    UPDATE hotels SET
        hotel_name = $1,
        price_per_hour = $2,
        support_phone = $3,
        contact_person = $4
    WHERE id = $5
  `,
  UPDATE_SETTINGS: `
    UPDATE hotels SET
        hotel_name = $1,
        price_per_hour = $2,
        support_email = $3,
        support_phone = $4,
        contact_person = $5,
        password = $6
    WHERE id = $7
    `,

  GET_BY_ID: `
    SELECT * FROM hotels WHERE id = $1
  `
};

export const BOOKINGS = {
  GET_BY_HOTEL: `
    SELECT * FROM bookings WHERE hotel_id = $1 ORDER BY id
  `,
  GET_CONFIRMED_BY_HOTEL: `
    SELECT * FROM bookings WHERE hotel_id = $1 AND status = 'Confirmed'
  `,
  INSERT: `
    INSERT INTO bookings (
      user_name, email, phone, room, date_only,
      date_time, duration, total, status, hotel_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed', $9)
  `,
  DELETE_BY_ID: `
    DELETE FROM bookings WHERE id = $1
  `,
  UPDATE_STATUS_BY_ID: `
    UPDATE bookings SET status = $1 WHERE id = $2
  `,
  GET_OCCUPIED_ROOMS_ON_DATE: `
    SELECT room, date_time, duration
    FROM bookings
    WHERE hotel_id = $1 AND date_time::date = $2 AND status = 'Confirmed'
  `,
  THIS_WEEK_REVENUE: `
    SELECT COALESCE(SUM(total), 0) AS revenue
    FROM bookings
    WHERE status = 'Confirmed' AND hotel_id = $1 AND date_time >= NOW() - INTERVAL '7 days'
  `,
  LAST_WEEK_REVENUE: `
    SELECT COALESCE(SUM(total), 0) AS revenue
    FROM bookings
    WHERE status = 'Confirmed' AND hotel_id = $1
      AND date_time >= NOW() - INTERVAL '14 days'
      AND date_time < NOW() - INTERVAL '7 days'
  `
};
