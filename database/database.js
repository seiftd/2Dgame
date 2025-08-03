const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(process.env.DB_PATH || './database/game.db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(process.env.DB_PATH || './database/game.db');

// Initialize database tables
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                water_drops INTEGER DEFAULT 10,
                heavy_water INTEGER DEFAULT 0,
                boosters INTEGER DEFAULT 0,
                sbr_coins INTEGER DEFAULT 0,
                usdt_balance REAL DEFAULT 0,
                ton_balance REAL DEFAULT 0,
                patches INTEGER DEFAULT 3,
                patch_parts INTEGER DEFAULT 0,
                vip_tier INTEGER DEFAULT 0,
                vip_expires DATETIME NULL,
                last_daily_claim DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_banned BOOLEAN DEFAULT FALSE,
                referral_code TEXT UNIQUE,
                referred_by INTEGER,
                total_referrals INTEGER DEFAULT 0
            )`);

            // Crops table
            db.run(`CREATE TABLE IF NOT EXISTS crops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                patch_number INTEGER,
                crop_type TEXT NOT NULL,
                planted_at DATETIME NOT NULL,
                harvest_time DATETIME NOT NULL,
                boosters_used INTEGER DEFAULT 0,
                is_harvested BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Inventory table
            db.run(`CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                item_type TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, item_type, item_name)
            )`);

            // Transactions table
            db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'purchase', 'sale'
                currency TEXT NOT NULL, -- 'USDT', 'TON', 'SBR'
                amount REAL NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
                transaction_hash TEXT,
                payment_method TEXT,
                admin_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // VIP Benefits Log table
            db.run(`CREATE TABLE IF NOT EXISTS vip_benefits_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                tier INTEGER,
                benefit_type TEXT,
                amount INTEGER,
                claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Contests table
            db.run(`CREATE TABLE IF NOT EXISTS contests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
                entry_cost INTEGER,
                ads_required INTEGER,
                prize_pool TEXT, -- JSON string
                start_time DATETIME,
                end_time DATETIME,
                status TEXT DEFAULT 'active', -- 'active', 'ended', 'cancelled'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Contest Entries table
            db.run(`CREATE TABLE IF NOT EXISTS contest_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contest_id INTEGER,
                user_id INTEGER,
                ads_watched INTEGER DEFAULT 0,
                entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contest_id) REFERENCES contests (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(contest_id, user_id)
            )`);

            // Admin Users table
            db.run(`CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME NULL
            )`);

            // Game Settings table
            db.run(`CREATE TABLE IF NOT EXISTS game_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tasks table
            db.run(`CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                task_type TEXT NOT NULL, -- 'daily', 'weekly', 'one_time'
                reward_type TEXT NOT NULL, -- 'water', 'sbr', 'boosters'
                reward_amount INTEGER NOT NULL,
                requirements TEXT, -- JSON string
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // User Tasks table
            db.run(`CREATE TABLE IF NOT EXISTS user_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                task_id INTEGER,
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                completed_at DATETIME NULL,
                last_progress_date DATE,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (task_id) REFERENCES tasks (id),
                UNIQUE(user_id, task_id)
            )`);

            // Ad Watches table
            db.run(`CREATE TABLE IF NOT EXISTS ad_watches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                ad_type TEXT DEFAULT 'water', -- 'water', 'contest'
                reward_amount INTEGER DEFAULT 1,
                watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Initialize default game settings
            db.run(`INSERT OR IGNORE INTO game_settings (setting_key, setting_value) VALUES 
                ('sbr_to_usdt_rate', '200'),
                ('usdt_to_ton_rate', '3.5'),
                ('max_water_drops', '100'),
                ('max_boosters', '10'),
                ('max_heavy_water', '5'),
                ('min_usdt_withdrawal', '5'),
                ('min_ton_withdrawal', '1'),
                ('min_trc20_withdrawal', '4')`);

            // Initialize default tasks
            db.run(`INSERT OR IGNORE INTO tasks (id, name, description, task_type, reward_type, reward_amount, requirements) VALUES 
                (1, 'Daily Login', 'Login to the game daily', 'daily', 'water', 10, '{"type": "login"}'),
                (2, 'Plant Your First Crop', 'Plant a crop in any patch', 'one_time', 'sbr', 50, '{"type": "plant_crop", "amount": 1}'),
                (3, 'Harvest 5 Crops', 'Harvest 5 crops of any type', 'one_time', 'water', 20, '{"type": "harvest", "amount": 5}'),
                (4, 'Watch 10 Ads', 'Watch 10 advertisements', 'daily', 'boosters', 1, '{"type": "watch_ads", "amount": 10}'),
                (5, 'Refer a Friend', 'Invite a friend to play', 'one_time', 'sbr', 100, '{"type": "referral", "amount": 1}'),
                (6, 'Reach VIP Tier 1', 'Purchase VIP Tier 1 subscription', 'one_time', 'water', 50, '{"type": "vip_tier", "tier": 1}'),
                (7, 'Weekly Harvest Goal', 'Harvest 20 crops this week', 'weekly', 'sbr', 200, '{"type": "harvest", "amount": 20}')`);

            console.log('Database initialized successfully');
            resolve();
        });
    });
}

// Utility functions
const dbUtils = {
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

module.exports = { db, initializeDatabase, dbUtils };