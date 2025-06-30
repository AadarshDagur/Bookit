import { db, HOTEL } from './index.js'; // if you exported these from index.js
import passport from 'passport';
import { Strategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import bcrypt from 'bcrypt';
import env from 'dotenv';

env.config(); // Load environment variables


// Passport Local Strategy
passport.use(
  "local",
  new Strategy(
    { usernameField: 'email' }, // Use email as username field
    async function verify(email, password, cb) {
      try {
        const result = await db.query(HOTEL.GET_BY_EMAIL, [email]);
        
        if (result.rows.length === 0) {
          return cb(null, false, { message: "Incorrect email or password." });
        }
        
        const user = result.rows[0];
        
        // Compare password with hashed password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (isValidPassword) {
          return cb(null, user);
        } else {
          return cb(null, false, { message: "Incorrect email or password." });
        }
        
      } catch (err) {
        console.error('Local strategy error:', err);
        return cb(err);
      }
    }
  )
);

// Passport Google Strategy
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ,
      callbackURL: "https://bookmyhotel-mo5b.onrender.com/auth/google/profile",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(HOTEL.GET_BY_EMAIL, [profile.email]);
        
        if (result.rows.length === 0) {
          // Create new user for Google OAuth
          const defaultPassword = await bcrypt.hash('google-oauth-user', 12);
          
          await db.query(HOTEL.INSERT, [profile.email, defaultPassword]);
          
          // Update with Google profile info
          await db.query(
            `UPDATE hotels SET contact_person = $1 WHERE support_email = $2`,
            [profile.displayName, profile.email]
          );
          
          // Get the newly created user
          const newUserResult = await db.query(HOTEL.GET_BY_EMAIL, [profile.email]);
          return cb(null, newUserResult.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        console.error('Google OAuth error:', err);
        return cb(err);
      }
    }
  )
);

// Passport serialization
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query(HOTEL.GET_BY_ID, [id]);
    if (result.rows.length > 0) {
      cb(null, result.rows[0]);
    } else {
      cb(new Error('User not found'), null);
    }
  } catch (err) {
    console.error('Deserialize user error:', err);
    cb(err, null);
  }
});

// Export the configured passport instance
export default passport;
