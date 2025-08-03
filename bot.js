require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { initializeDatabase } = require('./database/database');
const User = require('./models/User');
const GameManager = require('./services/GameManager');
const AdminService = require('./services/AdminService');
const FarmHandler = require('./handlers/FarmHandler');
const ShopHandler = require('./handlers/ShopHandler');
const WalletHandler = require('./handlers/WalletHandler');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Game emojis and icons
const EMOJIS = {
    crops: {
        potato: '🥔',
        tomato: '🍅',
        onion: '🧅',
        carrot: '🥕'
    },
    water: '💧',
    heavy_water: '🌊',
    booster: '⚡',
    coin: '🪙',
    farm: '🚜',
    bag: '🎒',
    wallet: '💰',
    vip: '👑',
    shop: '🏪',
    tasks: '📋',
    settings: '⚙️',
    stats: '📊',
    contest: '🏆',
    admin: '👨‍💼',
    sound_on: '🔊',
    sound_off: '🔇',
    music: '🎵'
};

let gameManager;
let adminService;
let farmHandler;
let shopHandler;
let walletHandler;

// Initialize services
async function initializeServices() {
    await initializeDatabase();
    gameManager = new GameManager();
    adminService = new AdminService();
    farmHandler = new FarmHandler(gameManager);
    shopHandler = new ShopHandler(gameManager);
    walletHandler = new WalletHandler(gameManager);
    console.log('🎮 Farmer Game Bot Started Successfully!');
}

// Main menu keyboard
function getMainMenu(user = null) {
    const keyboard = [
        [
            { text: `${EMOJIS.farm} Farm`, callback_data: 'farm' },
            { text: `${EMOJIS.bag} Bag`, callback_data: 'bag' }
        ],
        [
            { text: `${EMOJIS.shop} Shop`, callback_data: 'shop' },
            { text: `${EMOJIS.wallet} Wallet`, callback_data: 'wallet' }
        ],
        [
            { text: `${EMOJIS.tasks} Tasks`, callback_data: 'tasks' },
            { text: `${EMOJIS.vip} VIP`, callback_data: 'vip' }
        ],
        [
            { text: `${EMOJIS.contest} Contests`, callback_data: 'contests' },
            { text: `${EMOJIS.stats} Profile`, callback_data: 'profile' }
        ]
    ];

    if (user && user.telegram_id.toString() === process.env.ADMIN_TELEGRAM_ID) {
        keyboard.push([{ text: `${EMOJIS.admin} Admin Panel`, callback_data: 'admin_panel' }]);
    }

    return { inline_keyboard: keyboard };
}

// Start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    try {
        let user = await User.findByTelegramId(telegramUser.id);
        
        if (!user) {
            user = await User.create(telegramUser);
            await sendWelcomeMessage(chatId, user);
        } else {
            await sendMainMenu(chatId, user);
        }
        
        // Claim daily reward if available
        try {
            await user.claimDailyReward();
            bot.sendMessage(chatId, `${EMOJIS.water} Daily reward claimed! +10 water drops`);
        } catch (error) {
            // Already claimed today
        }
        
    } catch (error) {
        console.error('Start command error:', error);
        bot.sendMessage(chatId, '❌ Error starting the game. Please try again.');
    }
});

async function sendWelcomeMessage(chatId, user) {
    const welcomeText = `
🌾 **Welcome to Farmer Game!** 🌾

Hello ${user.first_name}! Welcome to your new farm adventure!

🎮 **Getting Started:**
• You have 3 patches to start farming
• Plant your first potato seed (it's in your bag!)
• Water your crops to help them grow
• Harvest when ready to earn SBR coins

${EMOJIS.water} **Water System:**
• Get 10 drops daily (claim now!)
• Watch ads for more water
• Convert 100 drops = 1 heavy water

${EMOJIS.vip} **VIP Benefits:**
• Unlock more patches
• Get daily seeds and bonuses
• Special rewards and faster growth

Let's start farming! 🚜
    `;

    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: getMainMenu(user)
    });
}

async function sendMainMenu(chatId, user) {
    const balance = user.getWalletBalance();
    const vipStatus = user.vip_tier > 0 ? `${EMOJIS.vip} VIP Tier ${user.vip_tier}` : 'Free Player';
    
    const menuText = `
🌾 **Farmer Game Dashboard** 🌾

👤 **Player:** ${user.first_name}
🏆 **Status:** ${vipStatus}
🏡 **Patches:** ${user.patches}

💰 **Wallet:**
${EMOJIS.coin} SBR: ${balance.sbr}
💵 USDT: ${balance.usdt.toFixed(2)}
${EMOJIS.water} Water: ${balance.water}/${process.env.MAX_WATER_DROPS || 100}
${EMOJIS.heavy_water} Heavy Water: ${balance.heavyWater}/5
${EMOJIS.booster} Boosters: ${balance.boosters}/10

What would you like to do?
    `;

    await bot.sendMessage(chatId, menuText, {
        parse_mode: 'Markdown',
        reply_markup: getMainMenu(user)
    });
}

// Callback query handler
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;

    try {
        const user = await User.findByTelegramId(userId);
        if (!user) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Please start the bot first: /start' });
            return;
        }

        // Route to appropriate handler
        if (data.startsWith('farm') || data.startsWith('plant_') || data.startsWith('harvest_') || data.startsWith('water_') || data.startsWith('boost_')) {
            await farmHandler.handleFarmActions(bot, callbackQuery, user);
        } else if (data.startsWith('shop') || data.startsWith('buy_') || data.startsWith('sell_') || data.startsWith('convert_')) {
            await shopHandler.handleShopActions(bot, callbackQuery, user);
        } else if (data.startsWith('wallet') || data.startsWith('deposit_') || data.startsWith('withdraw_') || data.startsWith('execute_convert_')) {
            await walletHandler.handleWalletActions(bot, callbackQuery, user);
        } else {
            switch (data) {
                case 'bag':
                    await handleBag(chatId, user, callbackQuery.id, msg.message_id);
                    break;

                case 'tasks':
                    await handleTasks(chatId, user, callbackQuery.id);
                    break;
                case 'vip':
                    await handleVIP(chatId, user, callbackQuery.id);
                    break;
                case 'contests':
                    await handleContests(chatId, user, callbackQuery.id);
                    break;
                case 'profile':
                    await handleProfile(chatId, user, callbackQuery.id);
                    break;
                case 'main_menu':
                    await sendMainMenu(chatId, user);
                    bot.answerCallbackQuery(callbackQuery.id);
                    break;
                default:
                    // Handle specific actions
                    await handleSpecificAction(chatId, user, data, callbackQuery.id);
                    break;
            }
        }
    } catch (error) {
        console.error('Callback query error:', error);
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ An error occurred. Please try again.' });
    }
});



// Bag/Inventory handler
async function handleBag(chatId, user, callbackId, messageId) {
    const inventory = await user.getInventory();
    
    let bagText = `
🎒 **Your Bag** 🎒

**Seeds:**
`;

    const seeds = inventory.filter(item => item.item_type === 'seeds');
    if (seeds.length === 0) {
        bagText += '🌱 No seeds available\n';
    } else {
        for (const seed of seeds) {
            const emoji = EMOJIS.crops[seed.item_name];
            bagText += `${emoji} ${seed.item_name}: ${seed.quantity}\n`;
        }
    }

    bagText += `
**Resources:**
${EMOJIS.water} Water Drops: ${user.water_drops}/100
${EMOJIS.heavy_water} Heavy Water: ${user.heavy_water}/5
${EMOJIS.booster} Boosters: ${user.boosters}/10
${EMOJIS.coin} SBR Coins: ${user.sbr_coins}

**Other Items:**
🧩 Patch Parts: ${user.patch_parts}/10
`;

    const keyboard = [
        [
            { text: '🔄 Convert Water', callback_data: 'bag_convert_water' },
            { text: '💱 Convert SBR', callback_data: 'bag_convert_sbr' }
        ],
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
    ];

    await bot.editMessageText(bagText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });

    bot.answerCallbackQuery(callbackId);
}





// VIP handler
async function handleVIP(chatId, user, callbackId) {
    const isVIP = user.vip_tier > 0;
    const vipStatus = isVIP ? `${EMOJIS.vip} VIP Tier ${user.vip_tier}` : 'Free Player';
    
    let vipText = `
👑 **VIP System** 👑

**Current Status:** ${vipStatus}
`;

    if (isVIP) {
        vipText += `**Expires:** ${new Date(user.vip_expires).toLocaleDateString()}\n`;
    }

    vipText += `
**VIP Tiers:**

**Tier 1** - $7/month 💰
• +1 patch
• 2 potato seedlings daily

**Tier 2** - $15/month 💰💰
• +1 patch
• 5 patch parts daily
• 2 potatoes + 10 water daily
• Tomato every 2 days

**Tier 3** - $30/month 💰💰💰
• +2 patches
• 2 potatoes + 20 water daily
• Onion every 2 days

**Tier 4** - $99/month 💰💰💰💰
• +3 patches
• 2 potatoes + 2 onions daily
• Carrot every 3 days
`;

    const keyboard = [];
    
    for (let tier = 1; tier <= 4; tier++) {
        const prices = [7, 15, 30, 99];
        keyboard.push([{ 
            text: `Buy Tier ${tier} - $${prices[tier-1]}`, 
            callback_data: `vip_buy_${tier}` 
        }]);
    }
    
    keyboard.push([{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]);

    await bot.editMessageText(vipText, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });

    bot.answerCallbackQuery(callbackId);
}

// Tasks handler
async function handleTasks(chatId, user, callbackId) {
    // This would fetch user's task progress
    let tasksText = `
📋 **Tasks & Missions** 📋

**Daily Tasks:**
✅ Daily Login - Completed
🌱 Plant 3 crops - 1/3
📺 Watch 10 ads - 5/10

**Weekly Tasks:**
🌾 Harvest 20 crops - 8/20
💰 Earn 1000 SBR - 450/1000

**One-time Tasks:**
🎉 Reach VIP Tier 1 - Not started
👥 Refer 5 friends - 2/5

Complete tasks to earn rewards!
`;

    const keyboard = [
        [
            { text: '📺 Watch Ad (+1 water)', callback_data: 'task_watch_ad' },
            { text: '🔗 Join Channel (+5 water)', callback_data: 'task_join_channel' }
        ],
        [
            { text: '👥 Invite Friends', callback_data: 'task_referral' },
            { text: '📊 Task Progress', callback_data: 'task_progress' }
        ],
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
    ];

    await bot.editMessageText(tasksText, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });

    bot.answerCallbackQuery(callbackId);
}

// Profile handler
async function handleProfile(chatId, user, callbackId) {
    const joinDate = new Date(user.created_at).toLocaleDateString();
    const vipStatus = user.vip_tier > 0 ? `VIP Tier ${user.vip_tier}` : 'Free Player';
    
    let profileText = `
📊 **Your Profile** 📊

👤 **Player Info:**
• Name: ${user.first_name}
• Status: ${vipStatus}
• Joined: ${joinDate}
• Referral Code: \`${user.referral_code}\`

🏆 **Stats:**
• Patches Owned: ${user.patches}
• Total Referrals: ${user.total_referrals}
• SBR Coins Earned: ${user.sbr_coins}

🎮 **Game Progress:**
• Crops Planted: Loading...
• Crops Harvested: Loading...
• Total Play Time: Loading...

🔗 **Referral Link:**
t.me/your_bot?start=${user.referral_code}
`;

    const keyboard = [
        [
            { text: '🔗 Share Referral', callback_data: 'profile_share_referral' },
            { text: '🎵 Sound Settings', callback_data: 'profile_sound' }
        ],
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
    ];

    await bot.editMessageText(profileText, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });

    bot.answerCallbackQuery(callbackId);
}

// Contests handler
async function handleContests(chatId, user, callbackId) {
    let contestText = `
🏆 **Contests** 🏆

**Active Contests:**

🌅 **Daily Contest**
• Entry: 20 SBR + 5 ads
• Prize: Random SBR/Water
• Ends: Today 23:30 UTC

📅 **Weekly Contest**
• Entry: 100 SBR + 30 ads
• Prize: Random SBR/Water
• Ends: Monday 23:30 UTC

🗓️ **Monthly Contest**
• Entry: 200 SBR + 100 ads
• Prize: VIP Tier 1 (3 winners)
• Ends: Month-end 23:30 UTC

Join contests to win amazing prizes!
`;

    const keyboard = [
        [
            { text: '🌅 Join Daily', callback_data: 'contest_daily' },
            { text: '📅 Join Weekly', callback_data: 'contest_weekly' }
        ],
        [
            { text: '🗓️ Join Monthly', callback_data: 'contest_monthly' },
            { text: '🏆 Leaderboard', callback_data: 'contest_leaderboard' }
        ],
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
    ];

    await bot.editMessageText(contestText, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });

    bot.answerCallbackQuery(callbackId);
}

// Handle specific actions
async function handleSpecificAction(chatId, user, data, callbackId) {
    if (data.startsWith('vip_buy_')) {
        const tier = parseInt(data.split('_')[2]);
        try {
            await user.purchaseVIP(tier);
            bot.answerCallbackQuery(callbackId, { text: `🎉 VIP Tier ${tier} purchased successfully!` });
            await handleVIP(chatId, user, callbackId);
        } catch (error) {
            bot.answerCallbackQuery(callbackId, { text: `❌ ${error.message}` });
        }
    } else if (data === 'task_watch_ad') {
        try {
            const reward = await user.watchAd();
            bot.answerCallbackQuery(callbackId, { text: `🎉 Ad watched! +${reward} water` });
        } catch (error) {
            bot.answerCallbackQuery(callbackId, { text: `❌ ${error.message}` });
        }
    } else {
        bot.answerCallbackQuery(callbackId, { text: 'Feature coming soon!' });
    }
}

// Admin command (only for admin users)
bot.onText(/\/admin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const command = match[1];

    // Check if user is admin
    if (userId.toString() !== process.env.ADMIN_TELEGRAM_ID) {
        bot.sendMessage(chatId, '❌ Access denied.');
        return;
    }

    try {
        const result = await adminService.executeCommand(command);
        bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Start the application
initializeServices().then(() => {
    // Start Express server for webhooks and admin panel
    app.listen(process.env.PORT || 3000, () => {
        console.log(`🌐 Server running on port ${process.env.PORT || 3000}`);
    });
});