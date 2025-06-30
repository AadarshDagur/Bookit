import express from 'express';
import ejs from 'ejs';
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pg from 'pg';
import session from 'express-session';
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from 'bcrypt';
import env from 'dotenv';
import passportConfig from './passportConfig.js'; // Assuming you have a separate file for passport configuration
import { BOOKINGS, HOTEL } from './queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Load environment variables
env.config();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecretkey', // Use environment variable in production
  resave: false,
  saveUninitialized: false, // Changed to false for security
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 30 * 60 * 1000 // 30 minutes session timeout
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Database connection
const db = new pg.Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bookit',
    password: process.env.DB_PASSWORD || 'adarsh@786',
    port: parseInt(process.env.DB_PORT) || 5432,
});

// Connect to database with error handling
try {
  await db.connect();
  console.log('Connected to database successfully');
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

// Global error variable (consider using flash messages instead)
let error = null;

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.session.hotel_id) {
    return next();
  }
  res.redirect('/login');
}

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes

app.get('/', (req, res) => {
  if (req.isAuthenticated() && req.session.hotel_id) {
    res.redirect('/admin');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
  const errorMessage = error;
  error = null; // Reset error after displaying
  res.render('login.ejs', { error: errorMessage });
});

app.get('/register', (req, res) => {
  const errorMessage = error;
  error = null; // Reset error after displaying
  res.render('register.ejs', { error: errorMessage });
});


// Google OAuth routes
app.get("/auth/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"] 
  })
);

app.get("/auth/google/profile", 
  passport.authenticate("google", {
    failureRedirect: "/login",
  }), 
  (req, res) => {
    req.session.hotel_id = req.user.id;
    res.redirect("/admin");
  }
);

app.get('/create', isAuthenticated, (req, res) => {
  const errorMessage = error;
  error = null;
  res.render('create.ejs', { error: errorMessage });
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
  const hotelId = req.session.hotel_id;
  
  try {
    const result = await db.query(BOOKINGS.GET_BY_HOTEL, [hotelId]);
    
    const bookings = result.rows.map(row => ({
      id: row.id,
      user: row.user_name,
      room: row.room,
      date: row.date_time.toISOString().split('T')[0],
      status: row.status,
    }));
    
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'Confirmed').length,
      pending: bookings.filter(b => b.status === 'Pending').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length
    };
    
    const toShow = req.query.room || 0;
    res.render('dashboard.ejs', { stats, bookings, toShow });
    
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/book', isAuthenticated, (req, res) => {
  res.render("booknow.ejs");
});


app.get('/admin', isAuthenticated, async (req, res) => {
  const hotelId = req.session.hotel_id;
  
  try {
    const result = await db.query(BOOKINGS.GET_CONFIRMED_BY_HOTEL, [hotelId]);
    
    const bookings = result.rows.map(row => ({
      id: row.id,
      code: `BK${String(row.id).padStart(4, '0')}`,
      customer: row.user_name,
      room: row.room,
      datetime: row.date_time,
      duration: row.duration,
      status: row.status,
      total: row.total
    }));
    
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total || 0), 0);
    
    const stats = [
      { icon: "fas fa-calendar-check", label: "Total Bookings", value: bookings.length, class: "bookings" },
      { icon: "fas fa-dollar-sign", label: "Monthly Revenue", value: `$${totalRevenue.toFixed(2)}`, class: "revenue" },
      { icon: "fas fa-door-open", label: "Room Utilization", value: "85%", class: "rooms" }
    ];
    
    const [thisWeekResult, lastWeekResult] = await Promise.all([
      db.query(BOOKINGS.THIS_WEEK_REVENUE, [hotelId]),
      db.query(BOOKINGS.LAST_WEEK_REVENUE, [hotelId])
    ]);
    
    const revenueComparison = {
      thisWeek: `$${Number(thisWeekResult.rows[0]?.revenue || 0).toFixed(2)}`,
      lastWeek: `$${Number(lastWeekResult.rows[0]?.revenue || 0).toFixed(2)}`
    };
    
    const settingsResult = await db.query(HOTEL.GET_BY_ID, [hotelId]);
    const settings = settingsResult.rows[0];
    
    res.render('admin.ejs', {
      stats,
      bookings,
      revenueComparison,
      settings
    });
    
  } catch (err) {
    console.error('Error loading admin panel:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Internal Server Error');
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).send('Internal Server Error');
      }
      
      res.clearCookie('connect.sid'); // Clear session cookie
      res.redirect('/login');
    });
  });
});



app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return next(err);
    }
    
    if (!user) {
      error = "Incorrect email or password. Please try again.";
      return res.redirect('/login');
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login session error:', err);
        return next(err);
      }
      
      req.session.hotel_id = user.id;
      return res.redirect('/admin');
    });
  })(req, res, next);
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validate input
    if (!email || !password) {
      error = "Email and password are required";
      return res.redirect('/register');
    }
    
    if (password.length < 6) {
      error = "Password must be at least 6 characters long";
      return res.redirect('/register');
    }
    
    // Check if hotel already exists
    const existingHotel = await db.query(HOTEL.GET_BY_EMAIL, [email]);
    if (existingHotel.rows.length > 0) {
      error = "Account already exists with this email";
      return res.redirect('/register');
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert new hotel
    await db.query(HOTEL.INSERT, [email, hashedPassword]);
    
    // Get the newly created user
    const newUser = await db.query(HOTEL.GET_ID_BY_EMAIL, [email]);
    const user = newUser.rows[0];
    
    // Log in the user
    req.logIn(user, (err) => {
      if (err) {
        console.error('Registration login error:', err);
        error = "Registration successful but login failed. Please try logging in.";
        return res.redirect('/login');
      }
      
      req.session.hotel_id = user.id;
      res.redirect('/create');
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    error = "Registration failed. Please try again.";
    res.redirect('/register');
  }
});



app.post('/create', isAuthenticated, async (req, res) => {
  const hotelId = req.session.hotel_id;
  const { hotelName, pricePerHour, mobilePhone, contactPerson } = req.body;
  
  try {
    // Validate input
    if (!hotelName || !pricePerHour || !mobilePhone || !contactPerson) {
      error = "All fields are required";
      return res.redirect('/create');
    }
    
    // Update hotel settings
    await db.query(
      HOTEL.CREATE_HOTEL,
      [hotelName, pricePerHour, mobilePhone, contactPerson, hotelId]
    );
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Error creating hotel:', err);
    error = "Failed to create hotel. Please try again.";
    res.redirect('/create');
  }
});



app.delete('/bookings/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query(BOOKINGS.DELETE_BY_ID, [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.sendStatus(500);
  }
});

app.post('/bookings/:id/update-status', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['Pending', 'Confirmed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    await db.query(BOOKINGS.UPDATE_STATUS_BY_ID, [status, id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error updating status:', err);
    res.sendStatus(500);
  }
});



app.post('/book', isAuthenticated, async (req, res) => {
  const hotelId = req.session.hotel_id;
  const { user_name, email, phone, booking_date, start_time, duration } = req.body;
  
  try {
    
    const start = new Date(`${booking_date}T${start_time}`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    
    
    const rooms = [
      ...Array.from({ length: 10 }, (_, i) => `Room ${101 + i}`),
      ...Array.from({ length: 10 }, (_, i) => `Room ${201 + i}`),
      ...Array.from({ length: 10 }, (_, i) => `Room ${301 + i}`)
    ];
    
    const result = await db.query(BOOKINGS.GET_OCCUPIED_ROOMS_ON_DATE, [hotelId, booking_date]);
    const roomBookings = {};
    rooms.forEach(r => roomBookings[r] = []);
    
    result.rows.forEach(row => {
      const s = new Date(row.date_time);
      const e = new Date(s.getTime() + row.duration * 60 * 60 * 1000);
      roomBookings[row.room].push([s, e]);
    });
    
    let assignedRoom = null;
    for (const room of rooms) {
      const conflicts = roomBookings[room].some(([bs, be]) => start < be && bs < end);
      if (!conflicts) {
        assignedRoom = room;
        break;
      }
    }
    
    if (!assignedRoom) {
      return res.status(409).send('No rooms available for the selected time slot.');
    }
    
    // Get hotel settings for price calculation
    const hotelSettings = await db.query(HOTEL.GET_BY_ID, [hotelId]);
    const pricePerHour = hotelSettings.rows[0]?.price_per_hour || 50;
    const total = duration * pricePerHour;
    
    await db.query(BOOKINGS.INSERT, [
      user_name,
      email,
      phone,
      assignedRoom,
      booking_date,
      start,
      duration,
      total,
      hotelId
    ]);
    
    res.redirect(`/dashboard?room=${encodeURIComponent(assignedRoom)}`);
    
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/update-settings', isAuthenticated, async (req, res) => {
  const hotelId = req.session.hotel_id;
  const {
    hotel_name,
    price_per_hour,
    support_email,
    support_phone,
    contact_person,
    password
  } = req.body;
  
  try {
    let hashedPassword = null;
    
    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        error = "Password must be at least 6 characters long";
        return res.redirect('/admin');
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }
    
    // Update settings with or without password
    if (hashedPassword) {
      await db.query(HOTEL.UPDATE_SETTINGS, [
        hotel_name,
        price_per_hour,
        support_email,
        support_phone,
        contact_person,
        hashedPassword,
        hotelId
      ]);
    } else {
      // Update without changing password
      await db.query(
        `UPDATE hotels SET 
         hotel_name = $1, 
         price_per_hour = $2, 
         support_email = $3, 
         support_phone = $4, 
         contact_person = $5 
         WHERE id = $6`,
        [hotel_name, price_per_hour, support_email, support_phone, contact_person, hotelId]
      );
    }
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Error updating admin settings:', err);
    error = "Failed to update settings. Please try again.";
    res.redirect('/admin');
  }
});



// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).send('Internal Server Error');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await db.end();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
export { db, HOTEL }; // Export db and queries for use in other modules