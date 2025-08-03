const { dbUtils } = require('../database/database');
const bcrypt = require('bcrypt');
const moment = require('moment');

class AdminService {
    constructor() {
        this.initializeDefaultAdmin();
    }

    async initializeDefaultAdmin() {
        try {
            const adminExists = await dbUtils.get(
                'SELECT id FROM admin_users WHERE username = ?',
                [process.env.ADMIN_USERNAME || 'admin']
            );

            if (!adminExists) {
                const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
                await dbUtils.run(
                    'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                    [process.env.ADMIN_USERNAME || 'admin', hashedPassword]
                );
                console.log('✅ Default admin user created');
            }
        } catch (error) {
            console.error('Error initializing admin:', error);
        }
    }

    async authenticateAdmin(username, password) {
        const admin = await dbUtils.get(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (!admin) {
            return null;
        }

        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (isValid) {
            await dbUtils.run(
                'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [admin.id]
            );
            return admin;
        }

        return null;
    }

    async executeCommand(command) {
        const [action, ...params] = command.split(' ');

        switch (action.toLowerCase()) {
            case 'stats':
                return await this.getGameStats();
            case 'users':
                return await this.getUsersList(params[0]);
            case 'ban':
                return await this.banUser(params[0]);
            case 'unban':
                return await this.unbanUser(params[0]);
            case 'addwater':
                return await this.addWaterToUser(params[0], parseInt(params[1]));
            case 'addsbr':
                return await this.addSBRToUser(params[0], parseInt(params[1]));
            case 'setvip':
                return await this.setUserVIP(params[0], parseInt(params[1]));
            case 'transactions':
                return await this.getPendingTransactions();
            case 'approve':
                return await this.approveTransaction(parseInt(params[0]));
            case 'reject':
                return await this.rejectTransaction(parseInt(params[0]), params.slice(1).join(' '));
            case 'broadcast':
                return await this.broadcastMessage(params.join(' '));
            default:
                return this.getHelpText();
        }
    }

    async getGameStats() {
        const stats = await Promise.all([
            dbUtils.get('SELECT COUNT(*) as total FROM users'),
            dbUtils.get('SELECT COUNT(*) as active FROM users WHERE last_daily_claim >= date("now", "-7 days")'),
            dbUtils.get('SELECT COUNT(*) as vip FROM users WHERE vip_tier > 0'),
            dbUtils.get('SELECT COUNT(*) as crops FROM crops WHERE is_harvested = FALSE'),
            dbUtils.get('SELECT SUM(sbr_coins) as total_sbr FROM users'),
            dbUtils.get('SELECT SUM(amount) as total_usdt FROM transactions WHERE currency = "USDT" AND status = "completed"'),
            dbUtils.get('SELECT COUNT(*) as pending_withdrawals FROM transactions WHERE type = "withdrawal" AND status = "pending"')
        ]);

        return `
📊 **Game Statistics**

👥 **Users:**
• Total Users: ${stats[0].total}
• Active (7 days): ${stats[1].active}
• VIP Users: ${stats[2].vip}

🌾 **Game:**
• Active Crops: ${stats[3].crops}
• Total SBR in circulation: ${stats[4].total_sbr || 0}

💰 **Economy:**
• Total USDT processed: $${(stats[5].total_usdt || 0).toFixed(2)}
• Pending withdrawals: ${stats[6].pending_withdrawals}

🕒 **Generated:** ${moment().format('YYYY-MM-DD HH:mm:ss')} UTC
        `;
    }

    async getUsersList(filter = 'all') {
        let query = 'SELECT telegram_id, username, first_name, vip_tier, sbr_coins, is_banned, created_at FROM users';
        let params = [];

        switch (filter) {
            case 'vip':
                query += ' WHERE vip_tier > 0';
                break;
            case 'banned':
                query += ' WHERE is_banned = TRUE';
                break;
            case 'active':
                query += ' WHERE last_daily_claim >= date("now", "-7 days")';
                break;
        }

        query += ' ORDER BY created_at DESC LIMIT 20';
        
        const users = await dbUtils.all(query, params);
        
        let result = `👥 **Users List** (${filter}):\n\n`;
        
        for (const user of users) {
            const status = user.is_banned ? '🚫' : user.vip_tier > 0 ? '👑' : '👤';
            result += `${status} ${user.first_name} (@${user.username || 'N/A'})\n`;
            result += `   ID: ${user.telegram_id} | VIP: ${user.vip_tier} | SBR: ${user.sbr_coins}\n`;
            result += `   Joined: ${moment(user.created_at).format('MMM DD, YYYY')}\n\n`;
        }

        return result;
    }

    async banUser(telegramId) {
        const user = await dbUtils.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        await dbUtils.run('UPDATE users SET is_banned = TRUE WHERE telegram_id = ?', [telegramId]);
        
        return `🚫 User ${user.first_name} (${telegramId}) has been banned.`;
    }

    async unbanUser(telegramId) {
        const user = await dbUtils.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        await dbUtils.run('UPDATE users SET is_banned = FALSE WHERE telegram_id = ?', [telegramId]);
        
        return `✅ User ${user.first_name} (${telegramId}) has been unbanned.`;
    }

    async addWaterToUser(telegramId, amount) {
        const user = await dbUtils.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        const newAmount = Math.min(user.water_drops + amount, 100);
        await dbUtils.run('UPDATE users SET water_drops = ? WHERE telegram_id = ?', [newAmount, telegramId]);
        
        return `💧 Added ${amount} water drops to ${user.first_name}. New balance: ${newAmount}/100`;
    }

    async addSBRToUser(telegramId, amount) {
        const user = await dbUtils.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        await dbUtils.run('UPDATE users SET sbr_coins = sbr_coins + ? WHERE telegram_id = ?', [amount, telegramId]);
        
        return `🪙 Added ${amount} SBR coins to ${user.first_name}. New balance: ${user.sbr_coins + amount}`;
    }

    async setUserVIP(telegramId, tier) {
        if (tier < 0 || tier > 4) {
            return `❌ Invalid VIP tier. Use 0-4.`;
        }

        const user = await dbUtils.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        const vipExpires = tier > 0 ? moment().add(1, 'month').format('YYYY-MM-DD HH:mm:ss') : null;
        
        await dbUtils.run(
            'UPDATE users SET vip_tier = ?, vip_expires = ? WHERE telegram_id = ?',
            [tier, vipExpires, telegramId]
        );
        
        const tierText = tier > 0 ? `VIP Tier ${tier}` : 'Free';
        return `👑 Set ${user.first_name} to ${tierText}${tier > 0 ? ` (expires ${moment(vipExpires).format('MMM DD, YYYY')})` : ''}`;
    }

    async getPendingTransactions() {
        const transactions = await dbUtils.all(`
            SELECT t.*, u.telegram_id, u.first_name, u.username 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.status = 'pending' 
            ORDER BY t.created_at DESC 
            LIMIT 20
        `);

        if (transactions.length === 0) {
            return `✅ No pending transactions.`;
        }

        let result = `💳 **Pending Transactions:**\n\n`;
        
        for (const tx of transactions) {
            const typeIcon = tx.type === 'withdrawal' ? '💸' : '💳';
            result += `${typeIcon} **Transaction #${tx.id}**\n`;
            result += `   User: ${tx.first_name} (@${tx.username || 'N/A'}) - ${tx.telegram_id}\n`;
            result += `   Type: ${tx.type.toUpperCase()}\n`;
            result += `   Amount: ${tx.amount} ${tx.currency}\n`;
            result += `   Method: ${tx.payment_method || 'N/A'}\n`;
            result += `   Date: ${moment(tx.created_at).format('MMM DD, YYYY HH:mm')}\n`;
            result += `   Hash: ${tx.transaction_hash || 'N/A'}\n\n`;
        }

        result += `Use \`/admin approve <id>\` or \`/admin reject <id> <reason>\` to process.`;
        
        return result;
    }

    async approveTransaction(transactionId) {
        const transaction = await dbUtils.get(
            'SELECT t.*, u.first_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = ?',
            [transactionId]
        );

        if (!transaction) {
            return `❌ Transaction #${transactionId} not found.`;
        }

        if (transaction.status !== 'pending') {
            return `❌ Transaction #${transactionId} is not pending (status: ${transaction.status}).`;
        }

        await dbUtils.run(
            'UPDATE transactions SET status = "approved", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [transactionId]
        );

        return `✅ Transaction #${transactionId} approved for ${transaction.first_name} (${transaction.amount} ${transaction.currency}).`;
    }

    async rejectTransaction(transactionId, reason = 'No reason provided') {
        const transaction = await dbUtils.get(
            'SELECT t.*, u.first_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = ?',
            [transactionId]
        );

        if (!transaction) {
            return `❌ Transaction #${transactionId} not found.`;
        }

        if (transaction.status !== 'pending') {
            return `❌ Transaction #${transactionId} is not pending (status: ${transaction.status}).`;
        }

        await dbUtils.run(
            'UPDATE transactions SET status = "rejected", admin_notes = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [reason, transactionId]
        );

        // Refund user if it was a withdrawal
        if (transaction.type === 'withdrawal') {
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

        return `❌ Transaction #${transactionId} rejected for ${transaction.first_name}. Reason: ${reason}`;
    }

    async broadcastMessage(message) {
        if (!message || message.trim().length === 0) {
            return `❌ Please provide a message to broadcast.`;
        }

        const users = await dbUtils.all('SELECT telegram_id FROM users WHERE is_banned = FALSE');
        
        return `📢 Broadcast queued for ${users.length} users. Message: "${message}"`;
        // Note: Actual broadcasting would be implemented in the bot file
    }

    async getUserDetails(telegramId) {
        const user = await dbUtils.get(`
            SELECT u.*, 
                   COUNT(c.id) as total_crops,
                   COUNT(CASE WHEN c.is_harvested = TRUE THEN 1 END) as harvested_crops,
                   COUNT(t.id) as total_transactions
            FROM users u 
            LEFT JOIN crops c ON u.id = c.user_id 
            LEFT JOIN transactions t ON u.id = t.user_id 
            WHERE u.telegram_id = ?
            GROUP BY u.id
        `, [telegramId]);

        if (!user) {
            return `❌ User with ID ${telegramId} not found.`;
        }

        const vipStatus = user.vip_tier > 0 ? `VIP Tier ${user.vip_tier}` : 'Free';
        const vipExpiry = user.vip_expires ? moment(user.vip_expires).format('MMM DD, YYYY') : 'N/A';

        return `
👤 **User Details: ${user.first_name}**

**Basic Info:**
• Telegram ID: ${user.telegram_id}
• Username: @${user.username || 'N/A'}
• Status: ${user.is_banned ? '🚫 Banned' : '✅ Active'}
• Joined: ${moment(user.created_at).format('MMM DD, YYYY')}

**VIP Info:**
• Tier: ${vipStatus}
• Expires: ${vipExpiry}

**Resources:**
• SBR Coins: ${user.sbr_coins}
• USDT Balance: $${user.usdt_balance.toFixed(4)}
• TON Balance: ${user.ton_balance.toFixed(4)}
• Water Drops: ${user.water_drops}/100
• Heavy Water: ${user.heavy_water}/5
• Boosters: ${user.boosters}/10
• Patches: ${user.patches}
• Patch Parts: ${user.patch_parts}/10

**Game Stats:**
• Total Crops Planted: ${user.total_crops}
• Crops Harvested: ${user.harvested_crops}
• Total Transactions: ${user.total_transactions}
• Referrals: ${user.total_referrals}
• Referral Code: ${user.referral_code}

**Last Activity:**
• Daily Claim: ${user.last_daily_claim || 'Never'}
• Updated: ${moment(user.updated_at).format('MMM DD, YYYY HH:mm')}
        `;
    }

    getHelpText() {
        return `
🛠️ **Admin Commands:**

**User Management:**
• \`/admin users [all|vip|banned|active]\` - List users
• \`/admin ban <telegram_id>\` - Ban user
• \`/admin unban <telegram_id>\` - Unban user
• \`/admin details <telegram_id>\` - User details

**Economy:**
• \`/admin addwater <telegram_id> <amount>\` - Add water
• \`/admin addsbr <telegram_id> <amount>\` - Add SBR coins
• \`/admin setvip <telegram_id> <tier>\` - Set VIP tier (0-4)

**Transactions:**
• \`/admin transactions\` - List pending transactions
• \`/admin approve <transaction_id>\` - Approve transaction
• \`/admin reject <transaction_id> <reason>\` - Reject transaction

**System:**
• \`/admin stats\` - Game statistics
• \`/admin broadcast <message>\` - Broadcast message
• \`/admin help\` - Show this help

**Examples:**
\`/admin ban 123456789\`
\`/admin addsbr 123456789 1000\`
\`/admin setvip 123456789 2\`
        `;
    }

    async getAnalytics(period = 'week') {
        const periodClause = period === 'week' ? '-7 days' : period === 'month' ? '-30 days' : '-1 day';
        
        const analytics = await Promise.all([
            dbUtils.get(`SELECT COUNT(*) as new_users FROM users WHERE created_at >= date('now', '${periodClause}')`),
            dbUtils.get(`SELECT COUNT(*) as active_users FROM users WHERE last_daily_claim >= date('now', '${periodClause}')`),
            dbUtils.get(`SELECT SUM(amount) as revenue FROM transactions WHERE currency = 'USDT' AND type = 'deposit' AND status = 'completed' AND created_at >= date('now', '${periodClause}')`),
            dbUtils.get(`SELECT COUNT(*) as crops_planted FROM crops WHERE planted_at >= date('now', '${periodClause}')`),
            dbUtils.get(`SELECT COUNT(*) as crops_harvested FROM crops WHERE is_harvested = TRUE AND harvest_time >= date('now', '${periodClause}')`),
            dbUtils.get(`SELECT COUNT(*) as vip_purchases FROM users WHERE vip_tier > 0 AND updated_at >= date('now', '${periodClause}')`)
        ]);

        return `
📈 **Analytics (${period})**

👥 **Users:**
• New Users: ${analytics[0].new_users}
• Active Users: ${analytics[1].active_users}
• VIP Purchases: ${analytics[5].vip_purchases}

💰 **Revenue:**
• USDT Deposits: $${(analytics[2].revenue || 0).toFixed(2)}

🌾 **Game Activity:**
• Crops Planted: ${analytics[3].crops_planted}
• Crops Harvested: ${analytics[4].crops_harvested}

📅 **Period:** ${moment().subtract(period === 'week' ? 7 : period === 'month' ? 30 : 1, 'days').format('MMM DD')} - ${moment().format('MMM DD, YYYY')}
        `;
    }
}

module.exports = AdminService;