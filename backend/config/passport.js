const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.BACKEND_URL + "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract necessary details
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const profilePicture = profile.photos[0].value;

        // Check if the user exists or create a new one
        let user = await User.findOne({ email });
        if (!user) {
          user = new User({
            email,
            name,
            profilePicture,
          });
          await user.save();
        } else {
          // Update the user's name and profile picture if they have changed
          user.name = name;
          user.profilePicture = profilePicture;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
