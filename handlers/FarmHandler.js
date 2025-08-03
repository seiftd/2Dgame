const moment = require('moment');
const { dbUtils } = require('../database/database');

// Farm-related emojis
const FARM_EMOJIS = {
    crops: {
        potato: '🥔',
        tomato: '🍅',
        onion: '🧅',
        carrot: '🥕'
    },
    water: '💧',
    heavy_water: '🌊',
    booster: '⚡',
    patch_empty: '🟫',
    patch_growing: '🌱',
    patch_ready: '🌾',
    tractor: '🚜',
    seeds: '🌰',
    harvest: '🎯'
};

class FarmHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async handleFarmActions(bot, callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        try {
            switch (data) {
                case 'farm':
                    await this.showFarmOverview(bot, chatId, messageId, user);
                    break;
                case 'farm_plant':
                    await this.showPlantMenu(bot, chatId, messageId, user);
                    break;
                case 'farm_harvest':
                    await this.showHarvestMenu(bot, chatId, messageId, user);
                    break;
                case 'farm_water':
                    await this.showWaterMenu(bot, chatId, messageId, user);
                    break;
                case 'farm_boost':
                    await this.showBoostMenu(bot, chatId, messageId, user);
                    break;
                default:
                    if (data.startsWith('plant_')) {
                        await this.handlePlanting(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('harvest_')) {
                        await this.handleHarvesting(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('water_')) {
                        await this.handleWatering(bot, chatId, messageId, user, data);
                    } else if (data.startsWith('boost_')) {
                        await this.handleBoosting(bot, chatId, messageId, user, data);
                    }
                    break;
            }
            
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Farm handler error:', error);
            bot.answerCallbackQuery(callbackQuery.id, { 
                text: `❌ ${error.message}` 
            });
        }
    }

    async showFarmOverview(bot, chatId, messageId, user) {
        const activeCrops = await user.getActiveCrops();
        const patchesUsed = activeCrops.length;
        const availablePatches = user.patches - patchesUsed;

        // Create visual farm layout
        let farmLayout = this.createFarmLayout(user.patches, activeCrops);
        
        let farmText = `
${FARM_EMOJIS.tractor} **Your Farm** ${FARM_EMOJIS.tractor}

${farmLayout}

🏡 **Patches:** ${user.patches} total (${availablePatches} available)
🌱 **Active Crops:** ${activeCrops.length}

**Crop Status:**
`;

        if (activeCrops.length === 0) {
            farmText += '🌱 No crops planted yet - time to start farming!\n';
        } else {
            for (const crop of activeCrops) {
                const emoji = FARM_EMOJIS.crops[crop.crop_type];
                const timeLeft = this.gameManager.getTimeRemaining(crop.harvest_time);
                const isReady = timeLeft === 'Ready to harvest!';
                const status = isReady ? '🎉 READY!' : `⏰ ${timeLeft}`;
                
                farmText += `${emoji} **Patch ${crop.patch_number}:** ${crop.crop_type.charAt(0).toUpperCase() + crop.crop_type.slice(1)} - ${status}\n`;
                
                if (crop.boosters_used > 0) {
                    farmText += `   ${FARM_EMOJIS.booster} Boosters used: ${crop.boosters_used}\n`;
                }
            }
        }

        farmText += '\n🎮 **What would you like to do?**';

        const keyboard = [
            [
                { text: `${FARM_EMOJIS.seeds} Plant Seeds`, callback_data: 'farm_plant' },
                { text: `${FARM_EMOJIS.harvest} Harvest`, callback_data: 'farm_harvest' }
            ],
            [
                { text: `${FARM_EMOJIS.water} Water Crops`, callback_data: 'farm_water' },
                { text: `${FARM_EMOJIS.booster} Use Booster`, callback_data: 'farm_boost' }
            ],
            [
                { text: '📊 Farm Stats', callback_data: 'farm_stats' },
                { text: '🔧 Patch Management', callback_data: 'farm_patches' }
            ],
            [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
        ];

        await bot.editMessageText(farmText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    createFarmLayout(totalPatches, activeCrops) {
        let layout = '🌾 **Farm Layout** 🌾\n\n';
        
        // Create a grid layout (3 patches per row)
        const patchesPerRow = 3;
        const rows = Math.ceil(totalPatches / patchesPerRow);
        
        for (let row = 0; row < rows; row++) {
            let rowText = '';
            for (let col = 0; col < patchesPerRow; col++) {
                const patchNumber = row * patchesPerRow + col + 1;
                
                if (patchNumber > totalPatches) {
                    break;
                }
                
                const crop = activeCrops.find(c => c.patch_number === patchNumber);
                
                if (crop) {
                    const timeLeft = this.gameManager.getTimeRemaining(crop.harvest_time);
                    const isReady = timeLeft === 'Ready to harvest!';
                    const emoji = isReady ? FARM_EMOJIS.patch_ready : FARM_EMOJIS.patch_growing;
                    const cropEmoji = FARM_EMOJIS.crops[crop.crop_type];
                    rowText += `${emoji}${cropEmoji} `;
                } else {
                    rowText += `${FARM_EMOJIS.patch_empty}⭕ `;
                }
            }
            layout += rowText.trim() + '\n';
        }
        
        layout += '\n';
        layout += '🟫⭕ Empty Patch  🌱🥔 Growing  🌾🍅 Ready\n';
        
        return layout;
    }

    async showPlantMenu(bot, chatId, messageId, user) {
        const activeCrops = await user.getActiveCrops();
        const availablePatches = user.patches - activeCrops.length;
        
        if (availablePatches === 0) {
            await bot.editMessageText(
                '❌ No available patches! All your patches are currently occupied. Harvest crops or buy more patches to continue planting.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [[{ text: '🔙 Back to Farm', callback_data: 'farm' }]] 
                    }
                }
            );
            return;
        }

        const inventory = await user.getInventory();
        const seeds = inventory.filter(item => item.item_type === 'seeds' && item.quantity > 0);
        
        if (seeds.length === 0) {
            await bot.editMessageText(
                '❌ No seeds available! Visit the shop to buy seeds and start farming.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🏪 Go to Shop', callback_data: 'shop_buy' }],
                            [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                        ] 
                    }
                }
            );
            return;
        }

        let plantText = `
${FARM_EMOJIS.seeds} **Plant Seeds** ${FARM_EMOJIS.seeds}

📍 **Available Patches:** ${availablePatches}

**Your Seeds:**
`;

        const keyboard = [];
        
        for (const seed of seeds) {
            const cropInfo = this.gameManager.getCropInfo(seed.item_name);
            const emoji = FARM_EMOJIS.crops[seed.item_name];
            const waterCost = cropInfo.waterType === 'heavy' ? 
                `${cropInfo.waterCost} ${FARM_EMOJIS.heavy_water}` : 
                `${cropInfo.waterCost} ${FARM_EMOJIS.water}`;
            
            plantText += `${emoji} **${seed.item_name.charAt(0).toUpperCase() + seed.item_name.slice(1)}** (${seed.quantity} available)\n`;
            plantText += `   ⏰ Growth: ${cropInfo.growthTime}h | ${waterCost} to plant | 💰 ${cropInfo.sellPrice} SBR\n\n`;
            
            keyboard.push([{ 
                text: `Plant ${emoji} ${seed.item_name} (${seed.quantity})`, 
                callback_data: `plant_${seed.item_name}` 
            }]);
        }

        keyboard.push([{ text: '🔙 Back to Farm', callback_data: 'farm' }]);

        await bot.editMessageText(plantText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handlePlanting(bot, chatId, messageId, user, data) {
        const cropType = data.split('_')[1];
        const cropInfo = this.gameManager.getCropInfo(cropType);
        
        // Check if user has seeds
        const inventory = await user.getInventory();
        const seedItem = inventory.find(item => item.item_type === 'seeds' && item.item_name === cropType);
        
        if (!seedItem || seedItem.quantity === 0) {
            throw new Error(`You don't have any ${cropType} seeds!`);
        }

        // Check water requirements
        if (cropInfo.waterType === 'heavy') {
            if (user.heavy_water < cropInfo.waterCost) {
                throw new Error(`Need ${cropInfo.waterCost} heavy water drops to plant ${cropType}!`);
            }
        } else {
            if (user.water_drops < cropInfo.waterCost) {
                throw new Error(`Need ${cropInfo.waterCost} water drops to plant ${cropType}!`);
            }
        }

        // Find available patch
        const activeCrops = await user.getActiveCrops();
        const usedPatches = activeCrops.map(crop => crop.patch_number);
        let availablePatch = null;
        
        for (let i = 1; i <= user.patches; i++) {
            if (!usedPatches.includes(i)) {
                availablePatch = i;
                break;
            }
        }

        if (!availablePatch) {
            throw new Error('No available patches! Harvest crops first.');
        }

        // Plant the crop
        await user.plantCrop(availablePatch, cropType);
        
        // Use water
        if (cropInfo.waterType === 'heavy') {
            await user.useWater(cropInfo.waterCost, 'heavy');
        } else {
            await user.useWater(cropInfo.waterCost);
        }

        const harvestTime = moment().add(cropInfo.growthTime, 'hours');
        const emoji = FARM_EMOJIS.crops[cropType];
        
        await bot.editMessageText(
            `🎉 **Crop Planted Successfully!**\n\n${emoji} **${cropType.charAt(0).toUpperCase() + cropType.slice(1)}** planted in patch ${availablePatch}\n\n⏰ **Ready for harvest:** ${harvestTime.format('MMM DD, HH:mm')}\n💰 **Expected earnings:** ${cropInfo.sellPrice} SBR coins\n\nGood luck, farmer! 🌱`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌱 Plant More', callback_data: 'farm_plant' }],
                        [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                    ] 
                }
            }
        );
    }

    async showHarvestMenu(bot, chatId, messageId, user) {
        const activeCrops = await user.getActiveCrops();
        const readyCrops = activeCrops.filter(crop => 
            moment().isAfter(moment(crop.harvest_time))
        );

        if (readyCrops.length === 0) {
            const nextHarvestTime = activeCrops.length > 0 ? 
                moment.min(activeCrops.map(crop => moment(crop.harvest_time))) : null;
            
            let message = '🌱 No crops ready for harvest yet.\n\n';
            
            if (nextHarvestTime) {
                message += `⏰ Next harvest available: ${nextHarvestTime.format('MMM DD, HH:mm')}\n`;
                message += `⏱️ Time remaining: ${this.gameManager.getTimeRemaining(nextHarvestTime.format('YYYY-MM-DD HH:mm:ss'))}`;
            } else {
                message += 'Plant some crops to start your farming journey! 🌾';
            }

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌱 Plant Crops', callback_data: 'farm_plant' }],
                        [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                    ] 
                }
            });
            return;
        }

        let harvestText = `
${FARM_EMOJIS.harvest} **Ready for Harvest!** ${FARM_EMOJIS.harvest}

🎉 You have ${readyCrops.length} crops ready to harvest!

**Ready Crops:**
`;

        const keyboard = [];
        let totalEarnings = 0;

        for (const crop of readyCrops) {
            const cropInfo = this.gameManager.getCropInfo(crop.crop_type);
            const emoji = FARM_EMOJIS.crops[crop.crop_type];
            
            harvestText += `${emoji} **Patch ${crop.patch_number}:** ${crop.crop_type.charAt(0).toUpperCase() + crop.crop_type.slice(1)} - 💰 ${cropInfo.sellPrice} SBR\n`;
            totalEarnings += cropInfo.sellPrice;
            
            keyboard.push([{ 
                text: `Harvest ${emoji} ${crop.crop_type} (+${cropInfo.sellPrice} SBR)`, 
                callback_data: `harvest_${crop.id}` 
            }]);
        }

        harvestText += `\n💰 **Total potential earnings:** ${totalEarnings} SBR coins`;

        if (readyCrops.length > 1) {
            keyboard.unshift([{ 
                text: `🌾 Harvest All (+${totalEarnings} SBR)`, 
                callback_data: 'harvest_all' 
            }]);
        }

        keyboard.push([{ text: '🔙 Back to Farm', callback_data: 'farm' }]);

        await bot.editMessageText(harvestText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleHarvesting(bot, chatId, messageId, user, data) {
        if (data === 'harvest_all') {
            const activeCrops = await user.getActiveCrops();
            const readyCrops = activeCrops.filter(crop => 
                moment().isAfter(moment(crop.harvest_time))
            );
            
            let totalEarnings = 0;
            let harvestedCrops = [];
            
            for (const crop of readyCrops) {
                const earnings = await user.harvestCrop(crop.id);
                totalEarnings += earnings;
                harvestedCrops.push({
                    type: crop.crop_type,
                    patch: crop.patch_number,
                    earnings
                });
            }
            
            let message = `🎉 **Mass Harvest Complete!**\n\n`;
            message += `💰 **Total earnings:** ${totalEarnings} SBR coins\n\n`;
            message += `**Harvested crops:**\n`;
            
            for (const crop of harvestedCrops) {
                const emoji = FARM_EMOJIS.crops[crop.type];
                message += `${emoji} Patch ${crop.patch}: ${crop.type} (+${crop.earnings} SBR)\n`;
            }
            
            message += `\n🎊 Your patches are now available for new crops!`;
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌱 Plant More Crops', callback_data: 'farm_plant' }],
                        [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                    ] 
                }
            });
        } else {
            const cropId = parseInt(data.split('_')[1]);
            const crop = await dbUtils.get('SELECT * FROM crops WHERE id = ? AND user_id = ?', [cropId, user.id]);
            
            if (!crop) {
                throw new Error('Crop not found!');
            }
            
            const earnings = await user.harvestCrop(cropId);
            const emoji = FARM_EMOJIS.crops[crop.crop_type];
            
            await bot.editMessageText(
                `🎉 **Harvest Successful!**\n\n${emoji} **${crop.crop_type.charAt(0).toUpperCase() + crop.crop_type.slice(1)}** harvested from patch ${crop.patch_number}\n\n💰 **Earnings:** +${earnings} SBR coins\n\n🎊 Patch ${crop.patch_number} is now available for a new crop!`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🌾 Harvest More', callback_data: 'farm_harvest' }],
                            [{ text: '🌱 Plant New Crop', callback_data: 'farm_plant' }],
                            [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                        ] 
                    }
                }
            );
        }
    }

    async showWaterMenu(bot, chatId, messageId, user) {
        const activeCrops = await user.getActiveCrops();
        
        if (activeCrops.length === 0) {
            await bot.editMessageText(
                '💧 No crops to water! Plant some crops first.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🌱 Plant Crops', callback_data: 'farm_plant' }],
                            [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                        ] 
                    }
                }
            );
            return;
        }

        let waterText = `
💧 **Water Your Crops** 💧

💧 **Your Water:** ${user.water_drops}/100 regular, ${user.heavy_water}/5 heavy

ℹ️ **Note:** Watering crops provides small growth bonuses and keeps them healthy!

**Your Growing Crops:**
`;

        const keyboard = [];

        for (const crop of activeCrops) {
            const cropInfo = this.gameManager.getCropInfo(crop.crop_type);
            const emoji = FARM_EMOJIS.crops[crop.crop_type];
            const timeLeft = this.gameManager.getTimeRemaining(crop.harvest_time);
            const isReady = timeLeft === 'Ready to harvest!';
            
            if (!isReady) {
                waterText += `${emoji} **Patch ${crop.patch_number}:** ${crop.crop_type} - ${timeLeft}\n`;
                
                keyboard.push([{ 
                    text: `💧 Water ${emoji} ${crop.crop_type} (Patch ${crop.patch_number})`, 
                    callback_data: `water_${crop.id}` 
                }]);
            }
        }

        if (keyboard.length === 0) {
            waterText += '\n🌾 All crops are ready for harvest - no watering needed!';
        }

        keyboard.push([{ text: '🔙 Back to Farm', callback_data: 'farm' }]);

        await bot.editMessageText(waterText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showBoostMenu(bot, chatId, messageId, user) {
        const activeCrops = await user.getActiveCrops();
        const boostableCrops = activeCrops.filter(crop => 
            !moment().isAfter(moment(crop.harvest_time))
        );

        if (boostableCrops.length === 0) {
            await bot.editMessageText(
                '⚡ No crops available for boosting! Plant some crops or wait for them to grow.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🌱 Plant Crops', callback_data: 'farm_plant' }],
                            [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                        ] 
                    }
                }
            );
            return;
        }

        if (user.boosters === 0) {
            await bot.editMessageText(
                '⚡ No boosters available! Buy boosters from the shop to speed up crop growth.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🏪 Buy Boosters', callback_data: 'shop_buy' }],
                            [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                        ] 
                    }
                }
            );
            return;
        }

        let boostText = `
⚡ **Boost Your Crops** ⚡

⚡ **Your Boosters:** ${user.boosters}/10

ℹ️ **Each booster reduces growth time by 2 hours**

**Boostable Crops:**
`;

        const keyboard = [];

        for (const crop of boostableCrops) {
            const cropInfo = this.gameManager.getCropInfo(crop.crop_type);
            const emoji = FARM_EMOJIS.crops[crop.crop_type];
            const timeLeft = this.gameManager.getTimeRemaining(crop.harvest_time);
            const maxBoosters = Math.floor(cropInfo.maxBoosterReduction / 2);
            const remainingBoosts = maxBoosters - crop.boosters_used;
            
            if (remainingBoosts > 0) {
                boostText += `${emoji} **Patch ${crop.patch_number}:** ${crop.crop_type} - ${timeLeft}\n`;
                boostText += `   ⚡ Can use ${remainingBoosts} more boosters (${crop.boosters_used}/${maxBoosters} used)\n\n`;
                
                keyboard.push([{ 
                    text: `⚡ Boost ${emoji} ${crop.crop_type} (-2h)`, 
                    callback_data: `boost_${crop.id}` 
                }]);
            }
        }

        if (keyboard.length === 0) {
            boostText += '\n🔥 All crops are at maximum boost level!';
        }

        keyboard.push([{ text: '🔙 Back to Farm', callback_data: 'farm' }]);

        await bot.editMessageText(boostText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleBoosting(bot, chatId, messageId, user, data) {
        const cropId = parseInt(data.split('_')[1]);
        
        if (user.boosters === 0) {
            throw new Error('No boosters available!');
        }

        const reductionHours = await this.gameManager.applyBooster(cropId, 1);
        await user.useBoosters(1);

        const crop = await dbUtils.get('SELECT * FROM crops WHERE id = ?', [cropId]);
        const emoji = FARM_EMOJIS.crops[crop.crop_type];
        const newTimeLeft = this.gameManager.getTimeRemaining(crop.harvest_time);

        await bot.editMessageText(
            `⚡ **Booster Applied!**\n\n${emoji} **${crop.crop_type.charAt(0).toUpperCase() + crop.crop_type.slice(1)}** in patch ${crop.patch_number}\n\n⏰ **Time reduced by:** ${reductionHours} hours\n🕒 **New harvest time:** ${newTimeLeft}\n\n🎊 Your crop is growing faster now!`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '⚡ Boost More Crops', callback_data: 'farm_boost' }],
                        [{ text: '🔙 Back to Farm', callback_data: 'farm' }]
                    ] 
                }
            }
        );
    }
}

module.exports = FarmHandler;