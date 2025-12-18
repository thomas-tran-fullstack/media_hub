require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const configViewEngine = require('./config/viewEngine.js');
const webRoutes = require('./routes/web.js');
const authRoutes = require('./routes/auth.js');
const profileRoutes = require('./routes/profile.js');
const contentRoutes = require('./routes/content.js');
const settingsRoutes = require('./routes/settings.js');
const connection = require('./config/database.js');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const migrate = require('./migrations/add_platforms_column.js');
const migrateMini = require('./migrations/add_mini_supermarket_column.js');
const createTeamMembersTable = require('./migrations/create_team_members_table.js');
const migrateAddressPhone = require('./migrations/add_address_phone_columns.js');
const migrateNewFollowers = require('./migrations/add_new_followers_to_analytics.js');
const migrateViewsColumn = require('./migrations/add_views_column_to_contents.js');
const migrateRevenueColumn = require('./migrations/add_revenue_column_to_contents.js');

const app = express();
const port = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
// CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow localhost and the configured host
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',
      undefined
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // For now, allow all to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure persistent session store in MySQL so sessions survive restarts
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'media_hub',
  // cleanup every 15 minutes, expire after 1 day
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000
};

let sessionStore;
try {
  sessionStore = new MySQLStore(sessionStoreOptions);
  console.log('✓ MySQL Session Store initialized');
} catch (e) {
  console.warn('✗ MySQL Session Store failed, using memory store:', e.message);
  // Fallback to memory store
  const memStore = new session.MemoryStore();
  sessionStore = memStore;
}

app.use(session({
  name: 'session_cookie',
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

// ===== MIDDLEWARE: Check auth for protected pages =====
// Các trang cần đăng nhập
const protectedPages = ['/index.html', '/profile.html', '/schedule.html', '/analytics.html', '/settings.html', '/livestream.html'];

app.get(protectedPages, (req, res, next) => {
  if (req.session && req.session.user) {
    // User đã đăng nhập, cho phép truy cập
    next();
  } else {
    // Chưa đăng nhập, redirect tới login
    res.redirect('/login.html');
  }
});

// Serve frontend static files from the workspace `Source code` folder so
// the frontend and backend share the same origin during local development.
// This ensures cookies (session) are sent with XHR/fetch requests.
app.use(express.static(path.join(__dirname, '..', 'Source code')));

// ===== VIEW ENGINE =====
configViewEngine(app);

// ===== ROUTES =====
app.use('/', webRoutes);
app.use('/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', contentRoutes);
app.use('/api', settingsRoutes);

// ===== MIGRATIONS =====
// Run DB migrations (safe, idempotent checks inside each)
migrate();
migrateMini();
migrateAddressPhone();
createTeamMembersTable();
migrateNewFollowers();
migrateViewsColumn();
migrateRevenueColumn();

// ===== TEST =====
app.get('/abc', (req, res) => {
  res.send('check');
});

// ===== TEST DB QUERY ĐÚNG CÁCH =====


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
