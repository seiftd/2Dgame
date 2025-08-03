const { dbUtils } = require('../database/database');

// Shop-related emojis
const SHOP_EMOJIS = {
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
    usdt: '💵',
    patch_part: '🧩',
    shop: '🏪',
    buy: '🛒',
    sell: '💰',
    cart: '🛍️'
};

class ShopHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async handleShopActions(bot, callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        try {
            switch (data) {
                case 'shop':
                    await this.showShopMain(bot, chatId, messageId, user);
                    break;
                case 'shop_buy':
                    await this.showBuyMenu(bot, chatId, messageId, user);
                    break;
                case 'shop_sell':
                    await this.showSellMenu(bot, chatId, messageId, user);
                    break;
                case 'shop_buy_seeds':
                    await this.showBuySeeds(bot, chatId, messageId, user);
                    break;
                case 'shop_buy_boosters':
                    await this.showBuyBoosters(bot, chatId, messageId, user);
                    break;
                case 'shop_buy_water':
                    await this.showBuyWater(bot, chatId, messageId, user);
                    break;
                case 'shop_buy_patches':
                    await this.showBuyPatchParts(bot, chatId, messageId, user);
                    break;
                case 'shop_sell_crops':
                    await this.showSellCrops(bot, chatId, messageId, user);
                    break;
                default:
                    if (data.startsWith('buy_')) {
                        await this.handlePurchase(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('sell_')) {
                        await this.handleSale(bot, chatId, messageId, user, data);
                    }
                    break;
            }
            
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Shop handler error:', error);
            bot.answerCallbackQuery(callbackQuery.id, { 
                text: `❌ ${error.message}` 
            });
        }
    }

    async showShopMain(bot, chatId, messageId, user) {
        const balance = user.getWalletBalance();
        
        let shopText = `
${SHOP_EMOJIS.shop} **Farmer's Market** ${SHOP_EMOJIS.shop}

Welcome to the shop! Buy seeds, boosters, and supplies, or sell your harvest for SBR coins.

💰 **Your Balances:**
${SHOP_EMOJIS.coin} SBR Coins: ${balance.sbr}
${SHOP_EMOJIS.usdt} USDT: $${balance.usdt.toFixed(4)}
${SHOP_EMOJIS.water} Water: ${balance.water}/100
${SHOP_EMOJIS.booster} Boosters: ${balance.boosters}/10

🛍️ **What would you like to do?**
`;

        const keyboard = [
            [
                { text: `${SHOP_EMOJIS.buy} Buy Items`, callback_data: 'shop_buy' },
                { text: `${SHOP_EMOJIS.sell} Sell Harvest`, callback_data: 'shop_sell' }
            ],
            [
                { text: '📊 Price List', callback_data: 'shop_prices' },
                { text: '🎁 Daily Deals', callback_data: 'shop_deals' }
            ],
            [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
        ];

        await bot.editMessageText(shopText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBuyMenu(bot, chatId, messageId, user) {
        let buyText = `
${SHOP_EMOJIS.buy} **Buy Items** ${SHOP_EMOJIS.buy}

Choose what you'd like to purchase:

🌰 **Seeds** - Plant crops to earn SBR coins
⚡ **Boosters** - Speed up crop growth by 2 hours each
💧 **Water** - Essential for planting crops
🧩 **Patch Parts** - Expand your farm (10 parts = 1 new patch)

${SHOP_EMOJIS.coin} **Current SBR:** ${user.sbr_coins}
${SHOP_EMOJIS.usdt} **Current USDT:** $${user.usdt_balance.toFixed(4)}
`;

        const keyboard = [
            [
                { text: '🌰 Seeds', callback_data: 'shop_buy_seeds' },
                { text: '⚡ Boosters', callback_data: 'shop_buy_boosters' }
            ],
            [
                { text: '💧 Water', callback_data: 'shop_buy_water' },
                { text: '🧩 Patch Parts', callback_data: 'shop_buy_patches' }
            ],
            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
        ];

        await bot.editMessageText(buyText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBuySeeds(bot, chatId, messageId, user) {
        const shopPrices = this.gameManager.getShopPrices();
        
        let seedText = `
🌰 **Buy Seeds** 🌰

Plant seeds to grow crops and earn SBR coins!

**Available Seeds:**
`;

        const keyboard = [];

        for (const [cropType, cropInfo] of Object.entries(shopPrices.seeds)) {
            const emoji = SHOP_EMOJIS.crops[cropType];
            const price = cropInfo.seedPrice;
            const priceText = price.type === 'sbr' ? 
                `${price.amount} ${SHOP_EMOJIS.coin}` : 
                `$${price.amount} ${SHOP_EMOJIS.usdt}`;
            
            seedText += `${emoji} **${cropType.charAt(0).toUpperCase() + cropType.slice(1)}**\n`;
            seedText += `   💰 Price: ${priceText}\n`;
            seedText += `   ⏰ Growth: ${cropInfo.growthTime}h\n`;
            seedText += `   💵 Sells for: ${cropInfo.sellPrice} ${SHOP_EMOJIS.coin}\n\n`;
            
            const canAfford = price.type === 'sbr' ? 
                user.sbr_coins >= price.amount : 
                user.usdt_balance >= price.amount;
            
            const buttonText = canAfford ? 
                `Buy ${emoji} ${cropType} (${priceText})` : 
                `❌ ${emoji} ${cropType} (${priceText})`;
            
            keyboard.push([{ 
                text: buttonText, 
                callback_data: `buy_seed_${cropType}` 
            }]);
        }

        keyboard.push([{ text: '🔙 Back to Buy Menu', callback_data: 'shop_buy' }]);

        await bot.editMessageText(seedText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBuyBoosters(bot, chatId, messageId, user) {
        const shopPrices = this.gameManager.getShopPrices();
        const boosterPrice = shopPrices.boosters;
        
        let boosterText = `
⚡ **Buy Boosters** ⚡

Speed up your crop growth! Each booster reduces growth time by 2 hours.

**Booster Packages:**

⚡ **1 Booster** - ${boosterPrice.sbr} ${SHOP_EMOJIS.coin} or $${boosterPrice.usdt} ${SHOP_EMOJIS.usdt}
⚡ **5 Boosters** - ${boosterPrice.sbr * 5} ${SHOP_EMOJIS.coin} or $${(boosterPrice.usdt * 5).toFixed(2)} ${SHOP_EMOJIS.usdt}
⚡ **10 Boosters** - ${boosterPrice.sbr * 10} ${SHOP_EMOJIS.coin} or $${(boosterPrice.usdt * 10).toFixed(2)} ${SHOP_EMOJIS.usdt}

**Your Boosters:** ${user.boosters}/10 (Max capacity)
`;

        const keyboard = [];
        
        // Only show options if user has space for boosters
        if (user.boosters < 10) {
            const maxBoosters = 10 - user.boosters;
            const packages = [
                { amount: 1, label: '1 Booster' },
                { amount: Math.min(5, maxBoosters), label: `${Math.min(5, maxBoosters)} Boosters` },
                { amount: maxBoosters, label: `${maxBoosters} Boosters (Fill)` }
            ].filter(pkg => pkg.amount > 0);

            for (const pkg of packages) {
                const sbrPrice = boosterPrice.sbr * pkg.amount;
                const usdtPrice = (boosterPrice.usdt * pkg.amount).toFixed(2);
                
                if (user.sbr_coins >= sbrPrice) {
                    keyboard.push([{ 
                        text: `⚡ ${pkg.label} (${sbrPrice} ${SHOP_EMOJIS.coin})`, 
                        callback_data: `buy_booster_sbr_${pkg.amount}` 
                    }]);
                }
                
                if (user.usdt_balance >= parseFloat(usdtPrice)) {
                    keyboard.push([{ 
                        text: `⚡ ${pkg.label} ($${usdtPrice} ${SHOP_EMOJIS.usdt})`, 
                        callback_data: `buy_booster_usdt_${pkg.amount}` 
                    }]);
                }
            }
        } else {
            boosterText += '\n⚠️ **Booster storage is full!** Use some boosters first.';
        }

        keyboard.push([{ text: '🔙 Back to Buy Menu', callback_data: 'shop_buy' }]);

        await bot.editMessageText(boosterText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBuyWater(bot, chatId, messageId, user) {
        const shopPrices = this.gameManager.getShopPrices();
        const waterPrice = shopPrices.water;
        
        let waterText = `
💧 **Buy Water** 💧

Water is essential for planting crops. Stock up for your farming needs!

**Water Packages:**

💧 **10 Drops** - ${waterPrice.sbr * 10} ${SHOP_EMOJIS.coin} or $${(waterPrice.usdt * 10).toFixed(2)} ${SHOP_EMOJIS.usdt}
💧 **25 Drops** - ${waterPrice.sbr * 25} ${SHOP_EMOJIS.coin} or $${(waterPrice.usdt * 25).toFixed(2)} ${SHOP_EMOJIS.usdt}
💧 **50 Drops** - ${waterPrice.sbr * 50} ${SHOP_EMOJIS.coin} or $${(waterPrice.usdt * 50).toFixed(2)} ${SHOP_EMOJIS.usdt}

**Your Water:** ${user.water_drops}/100

ℹ️ **Tip:** You can get free water by watching ads or claiming daily rewards!
`;

        const keyboard = [];
        
        if (user.water_drops < 100) {
            const maxWater = 100 - user.water_drops;
            const packages = [
                { amount: Math.min(10, maxWater), label: `${Math.min(10, maxWater)} Drops` },
                { amount: Math.min(25, maxWater), label: `${Math.min(25, maxWater)} Drops` },
                { amount: maxWater, label: `${maxWater} Drops (Fill)` }
            ].filter(pkg => pkg.amount > 0);

            for (const pkg of packages) {
                const sbrPrice = waterPrice.sbr * pkg.amount;
                const usdtPrice = (waterPrice.usdt * pkg.amount).toFixed(2);
                
                if (user.sbr_coins >= sbrPrice) {
                    keyboard.push([{ 
                        text: `💧 ${pkg.label} (${sbrPrice} ${SHOP_EMOJIS.coin})`, 
                        callback_data: `buy_water_sbr_${pkg.amount}` 
                    }]);
                }
                
                if (user.usdt_balance >= parseFloat(usdtPrice)) {
                    keyboard.push([{ 
                        text: `💧 ${pkg.label} ($${usdtPrice} ${SHOP_EMOJIS.usdt})`, 
                        callback_data: `buy_water_usdt_${pkg.amount}` 
                    }]);
                }
            }
        } else {
            waterText += '\n⚠️ **Water storage is full!** Use some water first.';
        }

        keyboard.push([{ text: '🔙 Back to Buy Menu', callback_data: 'shop_buy' }]);

        await bot.editMessageText(waterText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBuyPatchParts(bot, chatId, messageId, user) {
        const patchPrice = this.gameManager.getPatchPartPrice();
        const currentParts = user.patch_parts;
        const partsNeeded = 10 - (currentParts % 10);
        const maxPatches = 8;
        
        let patchText = `
🧩 **Buy Patch Parts** 🧩

Expand your farm by buying patch parts! Collect 10 parts to unlock a new patch.

**Current Status:**
🏡 **Patches Owned:** ${user.patches}/${maxPatches}
🧩 **Patch Parts:** ${currentParts}/10 (${partsNeeded} more needed for next patch)

**Patch Part Prices:**
🧩 **1 Part** - ${patchPrice.sbr} ${SHOP_EMOJIS.coin} or $${patchPrice.usdt} ${SHOP_EMOJIS.usdt}
🧩 **5 Parts** - ${patchPrice.sbr * 5} ${SHOP_EMOJIS.coin} or $${(patchPrice.usdt * 5).toFixed(2)} ${SHOP_EMOJIS.usdt}
🧩 **10 Parts (Full Patch)** - ${patchPrice.sbr * 10} ${SHOP_EMOJIS.coin} or $${(patchPrice.usdt * 10).toFixed(2)} ${SHOP_EMOJIS.usdt}
`;

        const keyboard = [];
        
        if (user.patches < maxPatches) {
            const packages = [
                { amount: 1, label: '1 Part' },
                { amount: 5, label: '5 Parts' },
                { amount: 10, label: '10 Parts (Full Patch)' }
            ];

            for (const pkg of packages) {
                const sbrPrice = patchPrice.sbr * pkg.amount;
                const usdtPrice = (patchPrice.usdt * pkg.amount).toFixed(2);
                
                if (user.sbr_coins >= sbrPrice) {
                    keyboard.push([{ 
                        text: `🧩 ${pkg.label} (${sbrPrice} ${SHOP_EMOJIS.coin})`, 
                        callback_data: `buy_patch_sbr_${pkg.amount}` 
                    }]);
                }
                
                if (user.usdt_balance >= parseFloat(usdtPrice)) {
                    keyboard.push([{ 
                        text: `🧩 ${pkg.label} ($${usdtPrice} ${SHOP_EMOJIS.usdt})`, 
                        callback_data: `buy_patch_usdt_${pkg.amount}` 
                    }]);
                }
            }
        } else {
            patchText += '\n🎉 **Maximum patches reached!** You own all available patches.';
        }

        keyboard.push([{ text: '🔙 Back to Buy Menu', callback_data: 'shop_buy' }]);

        await bot.editMessageText(patchText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showSellMenu(bot, chatId, messageId, user) {
        const inventory = await user.getInventory();
        const harvestedCrops = inventory.filter(item => 
            item.item_type === 'harvested' && item.quantity > 0
        );
        
        let sellText = `
${SHOP_EMOJIS.sell} **Sell Your Harvest** ${SHOP_EMOJIS.sell}

Convert your harvested crops into SBR coins!

**Sell Prices:**
🥔 Potato: 100 ${SHOP_EMOJIS.coin} SBR
🍅 Tomato: 150 ${SHOP_EMOJIS.coin} SBR
🧅 Onion: 250 ${SHOP_EMOJIS.coin} SBR
🥕 Carrot: 1,300 ${SHOP_EMOJIS.coin} SBR

**Your Harvest:**
`;

        const keyboard = [];
        let hasItems = false;

        // In this implementation, crops are auto-sold on harvest
        // But we can still show the sell interface for other items
        
        if (harvestedCrops.length === 0) {
            sellText += '📦 No harvested crops to sell.\n\nℹ️ **Note:** Crops are automatically sold when harvested for instant SBR rewards!';
        } else {
            hasItems = true;
            let totalValue = 0;
            
            for (const item of harvestedCrops) {
                const cropInfo = this.gameManager.getCropInfo(item.item_name);
                const emoji = SHOP_EMOJIS.crops[item.item_name];
                const value = cropInfo.sellPrice * item.quantity;
                totalValue += value;
                
                sellText += `${emoji} **${item.item_name.charAt(0).toUpperCase() + item.item_name.slice(1)}:** ${item.quantity} (${value} ${SHOP_EMOJIS.coin})\n`;
                
                keyboard.push([{ 
                    text: `Sell ${emoji} ${item.item_name} x${item.quantity} (+${value} SBR)`, 
                    callback_data: `sell_crop_${item.item_name}_${item.quantity}` 
                }]);
            }
            
            sellText += `\n💰 **Total Value:** ${totalValue} ${SHOP_EMOJIS.coin} SBR`;
            
            if (harvestedCrops.length > 1) {
                keyboard.unshift([{ 
                    text: `💰 Sell All (+${totalValue} SBR)`, 
                    callback_data: 'sell_all_crops' 
                }]);
            }
        }

        // Add special items sell options
        keyboard.push([
            { text: '🔄 Convert Water → Heavy', callback_data: 'convert_water_heavy' },
            { text: '💎 Convert Heavy → SBR', callback_data: 'convert_heavy_sbr' }
        ]);

        keyboard.push([{ text: '🔙 Back to Shop', callback_data: 'shop' }]);

        await bot.editMessageText(sellText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handlePurchase(bot, chatId, messageId, user, data) {
        const parts = data.split('_');
        const itemType = parts[1]; // seed, booster, water, patch
        const currency = parts.length > 3 ? parts[2] : null; // sbr or usdt
        const amount = parts.length > 3 ? parseInt(parts[3]) : 1;
        
        if (itemType === 'seed') {
            const cropType = parts[2];
            const cropInfo = this.gameManager.getCropInfo(cropType);
            const price = cropInfo.seedPrice;
            
            if (price.type === 'sbr') {
                if (user.sbr_coins < price.amount) {
                    throw new Error(`Insufficient SBR coins! Need ${price.amount}, have ${user.sbr_coins}`);
                }
                await user.spendSBRCoins(price.amount);
            } else {
                if (user.usdt_balance < price.amount) {
                    throw new Error(`Insufficient USDT! Need $${price.amount}, have $${user.usdt_balance.toFixed(4)}`);
                }
                await user.spendUSDT(price.amount);
            }
            
            await user.addToInventory('seeds', cropType, 1);
            
            const emoji = SHOP_EMOJIS.crops[cropType];
            const priceText = price.type === 'sbr' ? 
                `${price.amount} ${SHOP_EMOJIS.coin}` : 
                `$${price.amount} ${SHOP_EMOJIS.usdt}`;
            
            await bot.editMessageText(
                `🎉 **Purchase Successful!**\n\n${emoji} **${cropType.charAt(0).toUpperCase() + cropType.slice(1)} Seed** purchased for ${priceText}\n\n🌱 Ready to plant in your farm!`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🌱 Plant Now', callback_data: 'farm_plant' }],
                            [{ text: '🛒 Buy More', callback_data: 'shop_buy_seeds' }],
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        } else if (itemType === 'booster') {
            const shopPrices = this.gameManager.getShopPrices();
            const unitPrice = shopPrices.boosters[currency];
            const totalPrice = unitPrice * amount;
            
            if (user.boosters + amount > 10) {
                throw new Error('Booster storage would exceed maximum capacity!');
            }
            
            if (currency === 'sbr') {
                if (user.sbr_coins < totalPrice) {
                    throw new Error(`Insufficient SBR coins! Need ${totalPrice}, have ${user.sbr_coins}`);
                }
                await user.spendSBRCoins(totalPrice);
            } else {
                if (user.usdt_balance < totalPrice) {
                    throw new Error(`Insufficient USDT! Need $${totalPrice}, have $${user.usdt_balance.toFixed(4)}`);
                }
                await user.spendUSDT(totalPrice);
            }
            
            await user.addBoosters(amount);
            
            const priceText = currency === 'sbr' ? 
                `${totalPrice} ${SHOP_EMOJIS.coin}` : 
                `$${totalPrice.toFixed(2)} ${SHOP_EMOJIS.usdt}`;
            
            await bot.editMessageText(
                `🎉 **Purchase Successful!**\n\n⚡ **${amount} Boosters** purchased for ${priceText}\n\n🚀 Speed up your crop growth by 2 hours each!`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '⚡ Use Boosters', callback_data: 'farm_boost' }],
                            [{ text: '🛒 Buy More', callback_data: 'shop_buy_boosters' }],
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        } else if (itemType === 'water') {
            const shopPrices = this.gameManager.getShopPrices();
            const unitPrice = shopPrices.water[currency];
            const totalPrice = unitPrice * amount;
            
            if (user.water_drops + amount > 100) {
                throw new Error('Water storage would exceed maximum capacity!');
            }
            
            if (currency === 'sbr') {
                if (user.sbr_coins < totalPrice) {
                    throw new Error(`Insufficient SBR coins! Need ${totalPrice}, have ${user.sbr_coins}`);
                }
                await user.spendSBRCoins(totalPrice);
            } else {
                if (user.usdt_balance < totalPrice) {
                    throw new Error(`Insufficient USDT! Need $${totalPrice}, have $${user.usdt_balance.toFixed(4)}`);
                }
                await user.spendUSDT(totalPrice);
            }
            
            await user.addWater(amount);
            
            const priceText = currency === 'sbr' ? 
                `${totalPrice} ${SHOP_EMOJIS.coin}` : 
                `$${totalPrice.toFixed(2)} ${SHOP_EMOJIS.usdt}`;
            
            await bot.editMessageText(
                `🎉 **Purchase Successful!**\n\n💧 **${amount} Water Drops** purchased for ${priceText}\n\n🌱 Ready to water your crops!`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🌱 Plant Crops', callback_data: 'farm_plant' }],
                            [{ text: '🛒 Buy More', callback_data: 'shop_buy_water' }],
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        } else if (itemType === 'patch') {
            const patchPrice = this.gameManager.getPatchPartPrice();
            const unitPrice = patchPrice[currency];
            const totalPrice = unitPrice * amount;
            
            if (currency === 'sbr') {
                if (user.sbr_coins < totalPrice) {
                    throw new Error(`Insufficient SBR coins! Need ${totalPrice}, have ${user.sbr_coins}`);
                }
                await user.spendSBRCoins(totalPrice);
            } else {
                if (user.usdt_balance < totalPrice) {
                    throw new Error(`Insufficient USDT! Need $${totalPrice}, have $${user.usdt_balance.toFixed(4)}`);
                }
                await user.spendUSDT(totalPrice);
            }
            
            const newParts = user.patch_parts + amount;
            const newPatches = Math.floor(newParts / 10);
            const actualPatchesGained = newPatches - Math.floor(user.patch_parts / 10);
            
            await user.update({
                patch_parts: newParts % 10,
                patches: user.patches + actualPatchesGained
            });
            
            const priceText = currency === 'sbr' ? 
                `${totalPrice} ${SHOP_EMOJIS.coin}` : 
                `$${totalPrice.toFixed(2)} ${SHOP_EMOJIS.usdt}`;
            
            let message = `🎉 **Purchase Successful!**\n\n🧩 **${amount} Patch Parts** purchased for ${priceText}\n\n`;
            
            if (actualPatchesGained > 0) {
                message += `🎊 **${actualPatchesGained} New Patch${actualPatchesGained > 1 ? 'es' : ''} Unlocked!**\n`;
                message += `🏡 **Total Patches:** ${user.patches + actualPatchesGained}\n`;
                message += `🧩 **Remaining Parts:** ${newParts % 10}/10`;
            } else {
                message += `🧩 **Progress:** ${newParts % 10}/10 parts for next patch`;
            }
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🚜 Visit Farm', callback_data: 'farm' }],
                        [{ text: '🛒 Buy More', callback_data: 'shop_buy_patches' }],
                        [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                    ] 
                }
            });
        }
    }

    async handleSale(bot, chatId, messageId, user, data) {
        // Handle selling/conversion actions
        if (data === 'sell_all_crops') {
            // Implementation for selling all harvested crops
            await bot.editMessageText(
                '🎉 **All crops sold successfully!**\n\nSBR coins have been added to your wallet.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        } else if (data === 'convert_water_heavy') {
            if (user.water_drops < 100) {
                throw new Error('Need 100 water drops to convert to 1 heavy water!');
            }
            
            if (user.heavy_water >= 5) {
                throw new Error('Heavy water storage is full!');
            }
            
            await user.convertWaterToHeavy(100);
            
            await bot.editMessageText(
                '🎉 **Conversion Successful!**\n\n🌊 100 water drops converted to 1 heavy water drop!',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🔄 Convert More', callback_data: 'shop_sell' }],
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        } else if (data === 'convert_heavy_sbr') {
            if (user.heavy_water < 10) {
                throw new Error('Need 10 heavy water drops to convert to 5 SBR coins!');
            }
            
            await user.convertHeavyWaterToSBR(10);
            
            await bot.editMessageText(
                '🎉 **Conversion Successful!**\n\n🪙 10 heavy water drops converted to 5 SBR coins!',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🔄 Convert More', callback_data: 'shop_sell' }],
                            [{ text: '🔙 Back to Shop', callback_data: 'shop' }]
                        ] 
                    }
                }
            );
        }
    }
}

module.exports = ShopHandler;