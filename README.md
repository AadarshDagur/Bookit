# 🏨 BookIt – Smart Hotel Room Booking System

**BookIt** is a full-stack web application that redefines resource scheduling through intelligent automation and robust engineering.

Built with **Node.js**, **Express.js**, **PostgreSQL**, and **EJS**, the system integrates both **local and Google OAuth2 authentication** via **Passport.js**, ensuring secure, session-based access control for hotel administrators.

At its core lies a **conflict-free interval partitioning algorithm**, which intelligently assigns rooms to bookings without overlaps, guaranteeing efficient time-slot utilization. The booking logic mirrors real-world scheduling challenges and applies greedy algorithms to solve them with precision.

The platform is designed for **scalability**, **responsive performance**, and **intuitive UX** — making it adaptable for small hotels, co-working spaces, or enterprise-level resource management. Hosted on **Render** with persistent PostgreSQL support, it offers seamless deployment and production-readiness.

Check out at https://bookit-f8ox.onrender.com/

---

## 🚀 Features

- ✅ **Conflict-Free Booking**: Guarantees no overlapping time slots using interval partitioning.
- 🌐 **Authentication**: Supports secure local login and Google OAuth2 (via Passport.js).
- 🏨 **Room Assignment**: Smart room allocation based on availability and time slot.
- 📊 **Admin Dashboard**: Displays booking stats, revenue, and room usage.
- ⏳ **Duration-Based Pricing**: Automatically calculates total cost based on time booked.
- 🔒 **Session Management**: Persistent session tracking via `express-session`.
- 🧠 **Fully Modular**: Clean code separation with index, configs, queries, and views.
- 🌍 **Hosted on Render**: Ready for cloud deployment with environment config.

---

## 📄 Technologies Used

| Purpose           | Tools / Frameworks                      |
|------------------|-----------------------------------------|
| Server Framework | Node.js, Express.js                     |
| Database         | PostgreSQL                              |
| Views / Templating | EJS                                  |
| Auth             | Passport.js (Local + Google Strategy)   |
| Security         | Bcrypt, express-session, dotenv         |
| Hosting          | Render                                  |
| Styling          | Custom CSS                              |

---

## 🧠 Algorithm Overview

**Greedy Interval Partitioning** ensures rooms are assigned without time overlaps:

- Bookings are checked per room against existing bookings on the selected day.
- New time slots are compared using:

```js
start < existing_end && existing_start < end
```

---

## 💻 Setup
1. Clone the Repository
```bash
git clone https://github.com/yourusername/bookit.git
```

```bash
cd bookit
```
2. Install Dependencies
```bash
npm install
```
3. Set Up PostgreSQL Database
Create a PostgreSQL database (e.g., bookit) and run:

```sql
CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  hotel_name TEXT,
  price_per_hour INT,
  support_email TEXT,
  support_phone TEXT,
  contact_person TEXT,
  password TEXT
);
```

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_name TEXT,
  email TEXT,
  phone TEXT,
  room TEXT,
  date_only DATE,
  date_time TIMESTAMP,
  duration INT,
  total NUMERIC,
  status TEXT DEFAULT 'Confirmed',
  hotel_id INT REFERENCES hotels(id)
);
```
4. Configure Environment Variables
Create a .env file:

```env
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bookit
```

5.  Set up Google Client Id on console.cloud.google.com
6.  In passport.js change
```url
https://bookit-f8ox.onrender.com/auth/google/profile
```
to
```url
https://localhost:3000/auth/google/profile
```
7.  Start the Application
```bash
node index.js
```
Visit: http://localhost:3000

## 👨‍💻 Author

**Adarsh Chaudhary**  
Built with ❤️, logic, and design thinking.  
[LinkedIn](https://www.linkedin.com/in/adarsh-chaudhary-491918275/)  
[GitHub](https://github.com/AadarshDagur)

