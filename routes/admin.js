const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { dbUtils } = require('../database/database');
const AdminService = require('../services/AdminService');
const router = express.Router();

// Initialize Admin Service
const adminService = new AdminService();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Serve admin dashboard static files
router.use(express.static(path.join(__dirname, '..', 'admin')));

// Admin login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }

        // Check if admin user exists
        const admin = await dbUtils.get(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username,
                role: 'admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        await dbUtils.run(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [admin.id]
        );

        res.json({
            success: true,
            token,
            user: {
                id: admin.id,
                username: admin.username,
                created_at: admin.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Dashboard statistics endpoint
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Get total users
        const totalUsersResult = await dbUtils.get('SELECT COUNT(*) as count FROM users');
        const totalUsers = totalUsersResult.count;

        // Get active users (last 7 days)
        const activeUsersResult = await dbUtils.get(
            'SELECT COUNT(*) as count FROM users WHERE updated_at > datetime("now", "-7 days")'
        );
        const activeUsers = activeUsersResult.count;

        // Get VIP users
        const vipUsersResult = await dbUtils.get(
            'SELECT COUNT(*) as count FROM users WHERE vip_tier > 0 AND vip_expires > CURRENT_TIMESTAMP'
        );
        const vipUsers = vipUsersResult.count;

        // Get active crops
        const activeCropsResult = await dbUtils.get(
            'SELECT COUNT(*) as count FROM crops WHERE harvest_time > CURRENT_TIMESTAMP'
        );
        const activeCrops = activeCropsResult.count;

        // Get total SBR in circulation
        const totalSBRResult = await dbUtils.get(
            'SELECT SUM(sbr_coins) as total FROM users'
        );
        const totalSBR = totalSBRResult.total || 0;

        // Get total revenue (sum of completed transactions)
        const totalRevenueResult = await dbUtils.get(
            'SELECT SUM(amount) as total FROM transactions WHERE currency = "USDT" AND status = "completed"'
        );
        const totalRevenue = totalRevenueResult.total || 0;

        // Get user growth data (last 7 days)
        const userGrowth = await dbUtils.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users 
            WHERE created_at > datetime("now", "-7 days")
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        res.json({
            totalUsers,
            activeUsers,
            vipUsers,
            activeCrops,
            totalSBR,
            totalRevenue,
            userGrowth
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

// Get all users endpoint
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const { filter, search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM users';
        let params = [];
        let whereConditions = [];

        // Apply filters
        if (filter && filter !== 'all') {
            switch (filter) {
                case 'active':
                    whereConditions.push('updated_at > datetime("now", "-7 days")');
                    break;
                case 'vip':
                    whereConditions.push('vip_tier > 0 AND vip_expires > CURRENT_TIMESTAMP');
                    break;
                case 'banned':
                    whereConditions.push('is_banned = 1');
                    break;
            }
        }

        // Apply search
        if (search) {
            whereConditions.push('(first_name LIKE ? OR username LIKE ? OR telegram_id LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const users = await dbUtils.all(query, params);
        res.json(users);

    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get all transactions endpoint
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const { type, currency, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                t.*,
                u.first_name,
                u.username
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
        `;
        let params = [];
        let whereConditions = [];

        // Apply filters
        if (type && type !== 'all') {
            whereConditions.push('t.type = ?');
            params.push(type);
        }

        if (currency && currency !== 'all') {
            whereConditions.push('t.currency = ?');
            params.push(currency);
        }

        if (status && status !== 'all') {
            whereConditions.push('t.status = ?');
            params.push(status);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const transactions = await dbUtils.all(query, params);
        res.json(transactions);

    } catch (error) {
        console.error('Transactions fetch error:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
});

// VIP statistics endpoint
router.get('/vip-stats', authenticateToken, async (req, res) => {
    try {
        const vipStats = {};
        
        for (let tier = 1; tier <= 4; tier++) {
            const result = await dbUtils.get(
                'SELECT COUNT(*) as count FROM users WHERE vip_tier = ? AND vip_expires > CURRENT_TIMESTAMP',
                [tier]
            );
            vipStats[`tier${tier}`] = result.count;
        }

        res.json(vipStats);

    } catch (error) {
        console.error('VIP stats error:', error);
        res.status(500).json({ message: 'Error fetching VIP statistics' });
    }
});

// Ban user endpoint
router.post('/ban-user', authenticateToken, async (req, res) => {
    try {
        const { telegramId } = req.body;

        if (!telegramId) {
            return res.status(400).json({ message: 'Telegram ID required' });
        }

        await dbUtils.run(
            'UPDATE users SET is_banned = 1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
            [telegramId]
        );

        res.json({ success: true, message: 'User banned successfully' });

    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ message: 'Error banning user' });
    }
});

// Unban user endpoint
router.post('/unban-user', authenticateToken, async (req, res) => {
    try {
        const { telegramId } = req.body;

        if (!telegramId) {
            return res.status(400).json({ message: 'Telegram ID required' });
        }

        await dbUtils.run(
            'UPDATE users SET is_banned = 0, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
            [telegramId]
        );

        res.json({ success: true, message: 'User unbanned successfully' });

    } catch (error) {
        console.error('Unban user error:', error);
        res.status(500).json({ message: 'Error unbanning user' });
    }
});

// Approve transaction endpoint
router.post('/approve-transaction', authenticateToken, async (req, res) => {
    try {
        const { transactionId } = req.body;

        if (!transactionId) {
            return res.status(400).json({ message: 'Transaction ID required' });
        }

        // Get transaction details
        const transaction = await dbUtils.get(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId]
        );

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: 'Transaction already processed' });
        }

        // Update transaction status
        await dbUtils.run(
            'UPDATE transactions SET status = "approved", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [transactionId]
        );

        // Process the transaction based on type
        if (transaction.type === 'withdrawal') {
            // For withdrawals, deduct the amount from user's balance
            if (transaction.currency === 'USDT') {
                await dbUtils.run(
                    'UPDATE users SET usdt_balance = usdt_balance - ? WHERE id = ?',
                    [transaction.amount, transaction.user_id]
                );
            } else if (transaction.currency === 'TON') {
                await dbUtils.run(
                    'UPDATE users SET ton_balance = ton_balance - ? WHERE id = ?',
                    [transaction.amount, transaction.user_id]
                );
            }
        } else if (transaction.type === 'deposit') {
            // For deposits, add the amount to user's balance
            if (transaction.currency === 'USDT') {
                await dbUtils.run(
                    'UPDATE users SET usdt_balance = usdt_balance + ? WHERE id = ?',
                    [transaction.amount, transaction.user_id]
                );
            } else if (transaction.currency === 'TON') {
                await dbUtils.run(
                    'UPDATE users SET ton_balance = ton_balance + ? WHERE id = ?',
                    [transaction.amount, transaction.user_id]
                );
            }
        }

        res.json({ success: true, message: 'Transaction approved successfully' });

    } catch (error) {
        console.error('Approve transaction error:', error);
        res.status(500).json({ message: 'Error approving transaction' });
    }
});

// Reject transaction endpoint
router.post('/reject-transaction', authenticateToken, async (req, res) => {
    try {
        const { transactionId, reason } = req.body;

        if (!transactionId) {
            return res.status(400).json({ message: 'Transaction ID required' });
        }

        await dbUtils.run(
            'UPDATE transactions SET status = "rejected", notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [reason || 'Rejected by admin', transactionId]
        );

        res.json({ success: true, message: 'Transaction rejected successfully' });

    } catch (error) {
        console.error('Reject transaction error:', error);
        res.status(500).json({ message: 'Error rejecting transaction' });
    }
});

// Set VIP status endpoint
router.post('/set-vip', authenticateToken, async (req, res) => {
    try {
        const { telegramId, tier } = req.body;

        if (!telegramId || tier === undefined) {
            return res.status(400).json({ message: 'Telegram ID and tier required' });
        }

        if (tier < 0 || tier > 4) {
            return res.status(400).json({ message: 'Invalid VIP tier' });
        }

        let vipExpires = null;
        if (tier > 0) {
            // Set VIP to expire in 30 days
            vipExpires = new Date();
            vipExpires.setDate(vipExpires.getDate() + 30);
        }

        await dbUtils.run(
            'UPDATE users SET vip_tier = ?, vip_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
            [tier, vipExpires ? vipExpires.toISOString() : null, telegramId]
        );

        res.json({ success: true, message: 'VIP status updated successfully' });

    } catch (error) {
        console.error('Set VIP error:', error);
        res.status(500).json({ message: 'Error setting VIP status' });
    }
});

// Add resource to user endpoint
router.post('/add-resource', authenticateToken, async (req, res) => {
    try {
        const { telegramId, resourceType, amount } = req.body;

        if (!telegramId || !resourceType || !amount) {
            return res.status(400).json({ message: 'All fields required' });
        }

        const validResources = ['water', 'sbr', 'boosters', 'usdt', 'ton'];
        if (!validResources.includes(resourceType)) {
            return res.status(400).json({ message: 'Invalid resource type' });
        }

        let updateQuery;
        switch (resourceType) {
            case 'water':
                updateQuery = 'UPDATE users SET water_drops = water_drops + ? WHERE telegram_id = ?';
                break;
            case 'sbr':
                updateQuery = 'UPDATE users SET sbr_coins = sbr_coins + ? WHERE telegram_id = ?';
                break;
            case 'boosters':
                updateQuery = 'UPDATE users SET boosters = boosters + ? WHERE telegram_id = ?';
                break;
            case 'usdt':
                updateQuery = 'UPDATE users SET usdt_balance = usdt_balance + ? WHERE telegram_id = ?';
                break;
            case 'ton':
                updateQuery = 'UPDATE users SET ton_balance = ton_balance + ? WHERE telegram_id = ?';
                break;
        }

        await dbUtils.run(updateQuery, [amount, telegramId]);

        res.json({ success: true, message: 'Resource added successfully' });

    } catch (error) {
        console.error('Add resource error:', error);
        res.status(500).json({ message: 'Error adding resource' });
    }
});

// Broadcast message endpoint
router.post('/broadcast', authenticateToken, async (req, res) => {
    try {
        const { message, target } = req.body;

        if (!message || !target) {
            return res.status(400).json({ message: 'Message and target required' });
        }

        let query = 'SELECT telegram_id FROM users';
        let params = [];

        // Apply target filters
        switch (target) {
            case 'active':
                query += ' WHERE updated_at > datetime("now", "-7 days")';
                break;
            case 'vip':
                query += ' WHERE vip_tier > 0 AND vip_expires > CURRENT_TIMESTAMP';
                break;
            case 'free':
                query += ' WHERE vip_tier = 0 OR vip_expires <= CURRENT_TIMESTAMP';
                break;
            // 'all' - no filter needed
        }

        const users = await dbUtils.all(query, params);

        // Here you would integrate with your Telegram bot to send messages
        // For now, we'll just return the count
        res.json({ 
            success: true, 
            message: 'Broadcast queued successfully', 
            count: users.length 
        });

    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ message: 'Error sending broadcast' });
    }
});

// Update game settings endpoint
router.post('/update-settings', authenticateToken, async (req, res) => {
    try {
        const { sbrRate, tonRate, maxWater, maxBoosters, dailyWater } = req.body;

        const settings = [
            { key: 'SBR_TO_USDT_RATE', value: sbrRate },
            { key: 'USDT_TO_TON_RATE', value: tonRate },
            { key: 'MAX_WATER_DROPS', value: maxWater },
            { key: 'MAX_BOOSTERS', value: maxBoosters },
            { key: 'DAILY_WATER_REWARD', value: dailyWater }
        ];

        for (const setting of settings) {
            if (setting.value !== undefined) {
                await dbUtils.run(
                    'INSERT OR REPLACE INTO game_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                    [setting.key, setting.value]
                );
            }
        }

        res.json({ success: true, message: 'Settings updated successfully' });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Database backup endpoint
router.get('/backup', authenticateToken, async (req, res) => {
    try {
        const fs = require('fs');
        const dbPath = process.env.DB_PATH || './database/game.db';
        
        if (fs.existsSync(dbPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `farmer-game-backup-${timestamp}.db`;
            
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            
            const fileStream = fs.createReadStream(dbPath);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ message: 'Database file not found' });
        }
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ message: 'Error creating backup' });
    }
});

// Admin dashboard main page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

module.exports = router;