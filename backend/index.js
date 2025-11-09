const dotenv = require('dotenv');
dotenv.config(); // Load .env variables first

const express = require('express');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
require('./config/passport');

// Connect to the database
connectDB().then(() => {
    console.log('MongoDB connected');
});

const app = express();

// Enable CORS with dynamic origin from environment variable
app.use(cors({
    // Dynamic origin from .env.
    origin: process.env.FRONTEND_URL,
    // Allow cookies and authorization headers.
    credentials: true,
}));

// Middleware for parsing cookies
app.use(cookieParser());

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./routes/authRoutes');

app.use('/api', authRoutes);

const stockRoutes = require('./routes/stockRoutes');
app.use('/api', stockRoutes);

const portfolioRoutes = require('./routes/portfolioRoutes');
app.use('/api', portfolioRoutes);

const sectorRoutes = require('./routes/sectorRoutes');
app.use('/api', sectorRoutes);

const sectorsRoutes = require('./routes/sectorsRoutes');
app.use('/api', sectorsRoutes);

const liveIndexRoute = require("./routes/liveIndexRoute");
app.use("/api", liveIndexRoute);

const fetchUserData = require("./routes/fetchUserData");
app.use("/api/user", fetchUserData);

const logoutRoute = require("./routes/logoutRoutes");
app.use("/api/auth", logoutRoute);

const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api', settingsRoutes);

if (process.env.NODE_ENV === 'production') {
    const root = path.join(__dirname, '..', 'frontend', 'build');
    app.use(express.static(root));

    app.get('*', (req, res) => {
        res.sendFile('index.html', { root });
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
