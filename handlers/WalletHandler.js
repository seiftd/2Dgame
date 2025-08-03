const { dbUtils } = require('../database/database');
const moment = require('moment');

// Wallet-related emojis
const WALLET_EMOJIS = {
    wallet: '💰',
    usdt: '💵',
    ton: '⚡',
    sbr: '🪙',
    deposit: '💳',
    withdraw: '💸',
    convert: '🔄',
    history: '📊',
    binance: '🟨',
    tonwallet: '💎',
    trc20: '🔗',
    success: '✅',
    pending: '⏳',
    rejected: '❌'
};

class WalletHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.exchangeRates = {
            sbrToUsdt: 200, // 200 SBR = 1 USDT
            usdtToTon: 3.5, // 1 TON = 3.5 USDT
            waterToHeavy: 100, // 100 water = 1 heavy water
            heavyToSbr: 10 // 10 heavy water = 5 SBR
        };
    }

    async handleWalletActions(bot, callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        try {
            switch (data) {
                case 'wallet':
                    await this.showWalletMain(bot, chatId, messageId, user);
                    break;
                case 'wallet_deposit':
                    await this.showDepositMenu(bot, chatId, messageId, user);
                    break;
                case 'wallet_withdraw':
                    await this.showWithdrawMenu(bot, chatId, messageId, user);
                    break;
                case 'wallet_convert':
                    await this.showConvertMenu(bot, chatId, messageId, user);
                    break;
                case 'wallet_history':
                    await this.showTransactionHistory(bot, chatId, messageId, user);
                    break;
                default:
                    if (data.startsWith('deposit_')) {
                        await this.handleDeposit(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('withdraw_')) {
                        await this.handleWithdraw(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('convert_')) {
                        await this.handleConversion(bot, chatId, messageId, user, data);
                    }
                    break;
            }
            
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Wallet handler error:', error);
            bot.answerCallbackQuery(callbackQuery.id, { 
                text: `❌ ${error.message}` 
            });
        }
    }

    async showWalletMain(bot, chatId, messageId, user) {
        const balance = user.getWalletBalance();
        
        let walletText = `
${WALLET_EMOJIS.wallet} **Your Wallet** ${WALLET_EMOJIS.wallet}

💰 **Balances:**
${WALLET_EMOJIS.usdt} USDT: $${balance.usdt.toFixed(4)}
${WALLET_EMOJIS.ton} TON: ${balance.ton.toFixed(4)}
${WALLET_EMOJIS.sbr} SBR Coins: ${balance.sbr.toLocaleString()}

🌊 **Game Resources:**
💧 Water Drops: ${balance.water}/100
🌊 Heavy Water: ${balance.heavyWater}/5
⚡ Boosters: ${balance.boosters}/10

📈 **Exchange Rates:**
• 200 SBR = 1 USDT
• 1 TON = 3.5 USDT
• 100 Water = 1 Heavy Water
• 10 Heavy Water = 5 SBR

💳 **Payment Methods:**
${WALLET_EMOJIS.binance} Binance Pay | ${WALLET_EMOJIS.tonwallet} TON Wallet | ${WALLET_EMOJIS.trc20} TRC20 (USDT)
`;

        const keyboard = [
            [
                { text: `${WALLET_EMOJIS.deposit} Deposit`, callback_data: 'wallet_deposit' },
                { text: `${WALLET_EMOJIS.withdraw} Withdraw`, callback_data: 'wallet_withdraw' }
            ],
            [
                { text: `${WALLET_EMOJIS.convert} Convert`, callback_data: 'wallet_convert' },
                { text: `${WALLET_EMOJIS.history} History`, callback_data: 'wallet_history' }
            ],
            [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
        ];

        await bot.editMessageText(walletText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showDepositMenu(bot, chatId, messageId, user) {
        let depositText = `
${WALLET_EMOJIS.deposit} **Deposit Funds** ${WALLET_EMOJIS.deposit}

Add funds to your wallet to buy VIP subscriptions, seeds, and other premium items.

**Available Methods:**

${WALLET_EMOJIS.binance} **Binance Pay**
• Instant deposits
• Supports USDT
• Low fees

${WALLET_EMOJIS.tonwallet} **TON Wallet**
• Decentralized
• Fast transactions
• TON cryptocurrency

${WALLET_EMOJIS.trc20} **TRC20 (USDT)**
• TRON network
• USDT deposits
• Stable transactions

**Minimum Deposits:**
• USDT: $1.00
• TON: 0.5 TON

Choose your preferred payment method:
`;

        const keyboard = [
            [
                { text: `${WALLET_EMOJIS.binance} Binance Pay`, callback_data: 'deposit_binance' },
                { text: `${WALLET_EMOJIS.tonwallet} TON Wallet`, callback_data: 'deposit_ton' }
            ],
            [
                { text: `${WALLET_EMOJIS.trc20} TRC20 (USDT)`, callback_data: 'deposit_trc20' }
            ],
            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
        ];

        await bot.editMessageText(depositText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showWithdrawMenu(bot, chatId, messageId, user) {
        const balance = user.getWalletBalance();
        
        let withdrawText = `
${WALLET_EMOJIS.withdraw} **Withdraw Funds** ${WALLET_EMOJIS.withdraw}

**Your Balances:**
${WALLET_EMOJIS.usdt} USDT: $${balance.usdt.toFixed(4)}
${WALLET_EMOJIS.ton} TON: ${balance.ton.toFixed(4)}

**Withdrawal Limits:**
• Binance Pay: Min $5 USDT
• TON Wallet: Min 1 TON
• TRC20: Min $4 USDT

**Processing Time:**
• Binance Pay: Instant
• TON Wallet: 1-5 minutes
• TRC20: 5-15 minutes

⚠️ **Note:** All withdrawals require admin approval for security.

Choose withdrawal method:
`;

        const keyboard = [];
        
        // Only show withdrawal options if user has sufficient balance
        if (balance.usdt >= 5) {
            keyboard.push([{ 
                text: `${WALLET_EMOJIS.binance} Binance Pay ($${balance.usdt.toFixed(2)})`, 
                callback_data: 'withdraw_binance' 
            }]);
        }
        
        if (balance.usdt >= 4) {
            keyboard.push([{ 
                text: `${WALLET_EMOJIS.trc20} TRC20 USDT ($${balance.usdt.toFixed(2)})`, 
                callback_data: 'withdraw_trc20' 
            }]);
        }
        
        if (balance.ton >= 1) {
            keyboard.push([{ 
                text: `${WALLET_EMOJIS.tonwallet} TON Wallet (${balance.ton.toFixed(4)} TON)`, 
                callback_data: 'withdraw_ton' 
            }]);
        }
        
        if (keyboard.length === 0) {
            withdrawText += '\n❌ **Insufficient balance for withdrawal.**\nEarn more SBR coins and convert them to USDT, or deposit funds.';
        }

        keyboard.push([{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]);

        await bot.editMessageText(withdrawText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showConvertMenu(bot, chatId, messageId, user) {
        const balance = user.getWalletBalance();
        
        let convertText = `
${WALLET_EMOJIS.convert} **Convert Currencies** ${WALLET_EMOJIS.convert}

**Your Balances:**
${WALLET_EMOJIS.sbr} SBR: ${balance.sbr.toLocaleString()}
${WALLET_EMOJIS.usdt} USDT: $${balance.usdt.toFixed(4)}
💧 Water: ${balance.water}/100
🌊 Heavy Water: ${balance.heavyWater}/5

**Available Conversions:**

💱 **SBR ➜ USDT**
Rate: 200 SBR = 1 USDT
Available: ${Math.floor(balance.sbr / 200)} USDT

🌊 **Water ➜ Heavy Water**
Rate: 100 Water = 1 Heavy Water
Available: ${Math.floor(balance.water / 100)} Heavy Water

🪙 **Heavy Water ➜ SBR**
Rate: 10 Heavy Water = 5 SBR
Available: ${Math.floor(balance.heavyWater / 10) * 5} SBR

Choose conversion:
`;

        const keyboard = [];
        
        if (balance.sbr >= 200) {
            const maxConversion = Math.floor(balance.sbr / 200);
            keyboard.push([{ 
                text: `${WALLET_EMOJIS.sbr}➜${WALLET_EMOJIS.usdt} SBR to USDT (Max: ${maxConversion})`, 
                callback_data: 'convert_sbr_usdt' 
            }]);
        }
        
        if (balance.water >= 100 && balance.heavyWater < 5) {
            const maxConversion = Math.min(Math.floor(balance.water / 100), 5 - balance.heavyWater);
            keyboard.push([{ 
                text: `💧➜🌊 Water to Heavy (Max: ${maxConversion})`, 
                callback_data: 'convert_water_heavy' 
            }]);
        }
        
        if (balance.heavyWater >= 10) {
            const maxConversion = Math.floor(balance.heavyWater / 10) * 5;
            keyboard.push([{ 
                text: `🌊➜${WALLET_EMOJIS.sbr} Heavy to SBR (Max: ${maxConversion})`, 
                callback_data: 'convert_heavy_sbr' 
            }]);
        }
        
        if (keyboard.length === 0) {
            convertText += '\n❌ **No conversions available.**\nEarn more resources to unlock conversions.';
        }

        keyboard.push([{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]);

        await bot.editMessageText(convertText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showTransactionHistory(bot, chatId, messageId, user) {
        const transactions = await dbUtils.all(`
            SELECT * FROM transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [user.id]);
        
        let historyText = `
${WALLET_EMOJIS.history} **Transaction History** ${WALLET_EMOJIS.history}

**Recent Transactions:**
`;

        if (transactions.length === 0) {
            historyText += '\n📭 No transactions yet.\n\nStart by depositing funds or earning SBR coins!';
        } else {
            for (const tx of transactions) {
                const date = moment(tx.created_at).format('MMM DD, HH:mm');
                const status = this.getStatusIcon(tx.status);
                const type = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
                
                historyText += `\n${status} **${type}** - ${tx.amount} ${tx.currency}`;
                historyText += `\n   ${date} | ${tx.payment_method || 'Internal'}`;
                
                if (tx.status === 'pending') {
                    historyText += ' | ⏳ Pending approval';
                } else if (tx.status === 'rejected') {
                    historyText += ' | ❌ Rejected';
                }
                historyText += '\n';
            }
        }

        const keyboard = [
            [
                { text: '💳 New Deposit', callback_data: 'wallet_deposit' },
                { text: '💸 New Withdrawal', callback_data: 'wallet_withdraw' }
            ],
            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
        ];

        await bot.editMessageText(historyText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleDeposit(bot, chatId, messageId, user, data) {
        const method = data.split('_')[1]; // binance, ton, trc20
        
        let depositDetails = '';
        let instructions = '';
        
        switch (method) {
            case 'binance':
                depositDetails = `
${WALLET_EMOJIS.binance} **Binance Pay Deposit**

**Payment Details:**
• Merchant: FarmerGame
• Currency: USDT
• Network: Binance Smart Chain

**Instructions:**
1. Open Binance app
2. Go to Pay → Send
3. Enter amount (min $1)
4. Use payment ID: \`FG_${user.telegram_id}_${Date.now()}\`
5. Complete payment
6. Send payment confirmation here

⚡ **Instant processing** after confirmation
`;
                break;
                
            case 'ton':
                depositDetails = `
${WALLET_EMOJIS.tonwallet} **TON Wallet Deposit**

**Wallet Address:**
\`UQA7B8K9jgOjl9QqhPC0LK7gGHON6zZeGLm4nG4VXTohNjrA\`

**Instructions:**
1. Open your TON wallet
2. Send TON to above address
3. Include memo: \`${user.telegram_id}\`
4. Minimum: 0.5 TON
5. Funds credited automatically

🔒 **Secure** - Blockchain verified
`;
                break;
                
            case 'trc20':
                depositDetails = `
${WALLET_EMOJIS.trc20} **TRC20 USDT Deposit**

**Wallet Address:**
\`TKrAEqnpGP5hKZE1b9cWGQZYvC7zMbP8Qm\`

**Instructions:**
1. Send USDT (TRC20) to above address
2. Include memo: \`${user.telegram_id}\`
3. Minimum: $1 USDT
4. Processing: 5-15 minutes
5. Network: TRON (TRC20)

⚠️ **Important:** Only send TRC20 USDT
`;
                break;
        }
        
        const keyboard = [
            [{ text: '✅ Payment Sent', callback_data: `confirm_deposit_${method}` }],
            [{ text: '🔙 Choose Different Method', callback_data: 'wallet_deposit' }],
            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
        ];

        await bot.editMessageText(depositDetails, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleWithdraw(bot, chatId, messageId, user, data) {
        const method = data.split('_')[1]; // binance, ton, trc20
        
        // This would typically show a form or ask for withdrawal details
        // For now, we'll show a confirmation screen
        
        let withdrawText = `
${WALLET_EMOJIS.withdraw} **Withdrawal Request**

Please send the following information in your next message:

**Required Information:**
`;

        switch (method) {
            case 'binance':
                withdrawText += `
• Binance Pay ID or Email
• Amount to withdraw (min $5)
• Two-factor authentication code

**Example:**
\`binancepay@email.com|10.50|123456\`
`;
                break;
                
            case 'ton':
                withdrawText += `
• TON wallet address
• Amount to withdraw (min 1 TON)

**Example:**
\`UQA7B8K9jgOjl9QqhPC0LK7gGHON6zZeGLm4nG4VXTohNjrA|2.5\`
`;
                break;
                
            case 'trc20':
                withdrawText += `
• TRC20 USDT wallet address
• Amount to withdraw (min $4)

**Example:**
\`TKrAEqnpGP5hKZE1b9cWGQZYvC7zMbP8Qm|15.00\`
`;
                break;
        }

        withdrawText += `
⚠️ **Security Notice:**
• All withdrawals require admin approval
• Processing time: 1-24 hours
• Double-check your wallet address
• Withdrawals are irreversible

Type "cancel" to cancel this withdrawal.
`;

        const keyboard = [
            [{ text: '❌ Cancel Withdrawal', callback_data: 'wallet_withdraw' }],
            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
        ];

        await bot.editMessageText(withdrawText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleConversion(bot, chatId, messageId, user, data) {
        const [, from, to] = data.split('_'); // convert_sbr_usdt
        
        if (from === 'sbr' && to === 'usdt') {
            if (user.sbr_coins < 200) {
                throw new Error('Need at least 200 SBR coins to convert!');
            }
            
            // Show conversion confirmation
            const maxConversion = Math.floor(user.sbr_coins / 200);
            
            let confirmText = `
${WALLET_EMOJIS.convert} **SBR ➜ USDT Conversion**

**Available Conversion:**
${WALLET_EMOJIS.sbr} **SBR Coins:** ${user.sbr_coins.toLocaleString()}
${WALLET_EMOJIS.usdt} **Max USDT:** $${maxConversion.toFixed(2)}

**Conversion Rate:** 200 SBR = 1 USDT

**Choose amount to convert:**
`;

            const keyboard = [];
            const amounts = [1, 5, 10, maxConversion].filter(amount => amount <= maxConversion && amount > 0);
            
            for (const amount of amounts) {
                const sbrCost = amount * 200;
                keyboard.push([{ 
                    text: `Convert ${sbrCost} SBR → $${amount} USDT`, 
                    callback_data: `execute_convert_sbr_usdt_${amount}` 
                }]);
            }
            
            keyboard.push([{ text: '🔙 Back to Convert', callback_data: 'wallet_convert' }]);
            
            await bot.editMessageText(confirmText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
            
        } else if (from === 'water' && to === 'heavy') {
            if (user.water_drops < 100) {
                throw new Error('Need at least 100 water drops to convert!');
            }
            
            if (user.heavy_water >= 5) {
                throw new Error('Heavy water storage is full!');
            }
            
            await user.convertWaterToHeavy(100);
            
            await bot.editMessageText(
                `${WALLET_EMOJIS.success} **Conversion Successful!**\n\n🌊 100 water drops converted to 1 heavy water drop!\n\n**New Balances:**\n💧 Water: ${user.water_drops}/100\n🌊 Heavy Water: ${user.heavy_water}/5`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🔄 Convert More', callback_data: 'wallet_convert' }],
                            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
                        ] 
                    }
                }
            );
            
        } else if (from === 'heavy' && to === 'sbr') {
            if (user.heavy_water < 10) {
                throw new Error('Need at least 10 heavy water drops to convert!');
            }
            
            await user.convertHeavyWaterToSBR(10);
            
            await bot.editMessageText(
                `${WALLET_EMOJIS.success} **Conversion Successful!**\n\n${WALLET_EMOJIS.sbr} 10 heavy water drops converted to 5 SBR coins!\n\n**New Balances:**\n🌊 Heavy Water: ${user.heavy_water}/5\n${WALLET_EMOJIS.sbr} SBR: ${user.sbr_coins.toLocaleString()}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🔄 Convert More', callback_data: 'wallet_convert' }],
                            [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
                        ] 
                    }
                }
            );
        }
    }

    async executeConversion(bot, chatId, messageId, user, data) {
        const parts = data.split('_'); // execute_convert_sbr_usdt_5
        const amount = parseInt(parts[parts.length - 1]);
        
        const sbrCost = amount * 200;
        
        if (user.sbr_coins < sbrCost) {
            throw new Error(`Insufficient SBR coins! Need ${sbrCost}, have ${user.sbr_coins}`);
        }
        
        await user.convertSBRToUSDT(sbrCost);
        
        await bot.editMessageText(
            `${WALLET_EMOJIS.success} **Conversion Successful!**\n\n${WALLET_EMOJIS.sbr} ${sbrCost} SBR converted to ${WALLET_EMOJIS.usdt} $${amount} USDT!\n\n**New Balances:**\n${WALLET_EMOJIS.sbr} SBR: ${user.sbr_coins.toLocaleString()}\n${WALLET_EMOJIS.usdt} USDT: $${user.usdt_balance.toFixed(4)}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🔄 Convert More', callback_data: 'wallet_convert' }],
                        [{ text: '🔙 Back to Wallet', callback_data: 'wallet' }]
                    ] 
                }
            }
        );
    }

    getStatusIcon(status) {
        switch (status) {
            case 'completed':
            case 'approved':
                return WALLET_EMOJIS.success;
            case 'pending':
                return WALLET_EMOJIS.pending;
            case 'rejected':
                return WALLET_EMOJIS.rejected;
            default:
                return '⏸️';
        }
    }
}

module.exports = WalletHandler;