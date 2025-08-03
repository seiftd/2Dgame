const { dbUtils } = require('../database/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class User {
    constructor(data) {
        Object.assign(this, data);
    }

    static async findByTelegramId(telegramId) {
        const user = await dbUtils.get(
            'SELECT * FROM users WHERE telegram_id = ?',
            [telegramId]
        );
        return user ? new User(user) : null;
    }

    static async create(telegramUser) {
        const referralCode = uuidv4().slice(0, 8).toUpperCase();
        
        const result = await dbUtils.run(
            `INSERT INTO users (telegram_id, username, first_name, last_name, referral_code) 
             VALUES (?, ?, ?, ?, ?)`,
            [telegramUser.id, telegramUser.username, telegramUser.first_name, telegramUser.last_name, referralCode]
        );

        // Initialize inventory with starting items
        await dbUtils.run(
            `INSERT INTO inventory (user_id, item_type, item_name, quantity) VALUES 
             (?, 'seeds', 'potato', 1),
             (?, 'water', 'regular', 10)`,
            [result.id, result.id]
        );

        return await User.findById(result.id);
    }

    static async findById(id) {
        const user = await dbUtils.get('SELECT * FROM users WHERE id = ?', [id]);
        return user ? new User(user) : null;
    }

    async update(data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        await dbUtils.run(
            `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...values, this.id]
        );
        
        Object.assign(this, data);
    }

    async getInventory() {
        return await dbUtils.all(
            'SELECT * FROM inventory WHERE user_id = ?',
            [this.id]
        );
    }

    async addToInventory(itemType, itemName, quantity) {
        await dbUtils.run(
            `INSERT INTO inventory (user_id, item_type, item_name, quantity) 
             VALUES (?, ?, ?, ?) 
             ON CONFLICT(user_id, item_type, item_name) 
             DO UPDATE SET quantity = quantity + ?`,
            [this.id, itemType, itemName, quantity, quantity]
        );
    }

    async removeFromInventory(itemType, itemName, quantity) {
        const item = await dbUtils.get(
            'SELECT quantity FROM inventory WHERE user_id = ? AND item_type = ? AND item_name = ?',
            [this.id, itemType, itemName]
        );
        
        if (!item || item.quantity < quantity) {
            throw new Error('Insufficient items in inventory');
        }

        await dbUtils.run(
            'UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_type = ? AND item_name = ?',
            [quantity, this.id, itemType, itemName]
        );
    }

    async getActiveCrops() {
        return await dbUtils.all(
            'SELECT * FROM crops WHERE user_id = ? AND is_harvested = FALSE',
            [this.id]
        );
    }

    async plantCrop(patchNumber, cropType) {
        const cropInfo = this.getCropInfo(cropType);
        const harvestTime = moment().add(cropInfo.growthTime, 'hours');

        await dbUtils.run(
            `INSERT INTO crops (user_id, patch_number, crop_type, planted_at, harvest_time) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [this.id, patchNumber, cropType, harvestTime.format('YYYY-MM-DD HH:mm:ss')]
        );

        // Remove seed from inventory
        await this.removeFromInventory('seeds', cropType, 1);
    }

    async harvestCrop(cropId) {
        const crop = await dbUtils.get(
            'SELECT * FROM crops WHERE id = ? AND user_id = ? AND is_harvested = FALSE',
            [cropId, this.id]
        );

        if (!crop) {
            throw new Error('Crop not found or already harvested');
        }

        if (moment().isBefore(moment(crop.harvest_time))) {
            throw new Error('Crop is not ready for harvest');
        }

        // Mark crop as harvested
        await dbUtils.run(
            'UPDATE crops SET is_harvested = TRUE WHERE id = ?',
            [cropId]
        );

        // Add rewards to user
        const cropInfo = this.getCropInfo(crop.crop_type);
        await this.update({ sbr_coins: this.sbr_coins + cropInfo.sellPrice });

        return cropInfo.sellPrice;
    }

    async addWater(amount, type = 'regular') {
        if (type === 'regular') {
            const newAmount = Math.min(this.water_drops + amount, 100);
            await this.update({ water_drops: newAmount });
        } else if (type === 'heavy') {
            const newAmount = Math.min(this.heavy_water + amount, 5);
            await this.update({ heavy_water: newAmount });
        }
    }

    async useWater(amount, type = 'regular') {
        if (type === 'regular') {
            if (this.water_drops < amount) {
                throw new Error('Insufficient water drops');
            }
            await this.update({ water_drops: this.water_drops - amount });
        } else if (type === 'heavy') {
            if (this.heavy_water < amount) {
                throw new Error('Insufficient heavy water');
            }
            await this.update({ heavy_water: this.heavy_water - amount });
        }
    }

    async addBoosters(amount) {
        const newAmount = Math.min(this.boosters + amount, 10);
        await this.update({ boosters: newAmount });
    }

    async useBoosters(amount) {
        if (this.boosters < amount) {
            throw new Error('Insufficient boosters');
        }
        await this.update({ boosters: this.boosters - amount });
    }

    async addSBRCoins(amount) {
        await this.update({ sbr_coins: this.sbr_coins + amount });
    }

    async spendSBRCoins(amount) {
        if (this.sbr_coins < amount) {
            throw new Error('Insufficient SBR coins');
        }
        await this.update({ sbr_coins: this.sbr_coins - amount });
    }

    async addUSDT(amount) {
        await this.update({ usdt_balance: this.usdt_balance + amount });
    }

    async spendUSDT(amount) {
        if (this.usdt_balance < amount) {
            throw new Error('Insufficient USDT balance');
        }
        await this.update({ usdt_balance: this.usdt_balance - amount });
    }

    async addTON(amount) {
        await this.update({ ton_balance: this.ton_balance + amount });
    }

    async spendTON(amount) {
        if (this.ton_balance < amount) {
            throw new Error('Insufficient TON balance');
        }
        await this.update({ ton_balance: this.ton_balance - amount });
    }

    async convertSBRToUSDT(sbrAmount) {
        const usdtAmount = sbrAmount / 200; // 200 SBR = 1 USDT
        
        if (this.sbr_coins < sbrAmount) {
            throw new Error('Insufficient SBR coins');
        }

        await this.spendSBRCoins(sbrAmount);
        await this.addUSDT(usdtAmount);
        
        return usdtAmount;
    }

    async convertWaterToHeavy(waterAmount) {
        const heavyAmount = Math.floor(waterAmount / 100);
        
        if (this.water_drops < waterAmount || heavyAmount === 0) {
            throw new Error('Insufficient water or amount too small');
        }

        await this.useWater(heavyAmount * 100);
        await this.addWater(heavyAmount, 'heavy');
        
        return heavyAmount;
    }

    async convertHeavyWaterToSBR(heavyAmount) {
        const sbrAmount = Math.floor(heavyAmount / 10) * 5; // 10 heavy water = 5 SBR
        
        if (this.heavy_water < heavyAmount || heavyAmount < 10) {
            throw new Error('Insufficient heavy water or amount too small');
        }

        await this.useWater(Math.floor(heavyAmount / 10) * 10, 'heavy');
        await this.addSBRCoins(sbrAmount);
        
        return sbrAmount;
    }

    async purchaseVIP(tier, paymentMethod = 'wallet') {
        const vipTiers = {
            1: { price: 7, patches: 1, benefits: 'Daily: 2 potato seedlings' },
            2: { price: 15, patches: 1, benefits: 'Daily: 5 patch parts, 2 potatoes, 10 water; Tomato every 2 days' },
            3: { price: 30, patches: 2, benefits: 'Daily: 2 potatoes, 20 water; Onion every 2 days' },
            4: { price: 99, patches: 3, benefits: 'Daily: 2 potatoes + 2 onions; Carrot every 3 days' }
        };

        const tierInfo = vipTiers[tier];
        if (!tierInfo) {
            throw new Error('Invalid VIP tier');
        }

        if (paymentMethod === 'wallet') {
            if (this.usdt_balance < tierInfo.price) {
                throw new Error('Insufficient USDT balance');
            }
            await this.spendUSDT(tierInfo.price);
        }

        const expiryDate = moment().add(1, 'month');
        await this.update({
            vip_tier: tier,
            vip_expires: expiryDate.format('YYYY-MM-DD HH:mm:ss'),
            patches: this.patches + tierInfo.patches
        });

        return tierInfo;
    }

    async claimDailyReward() {
        const today = moment().format('YYYY-MM-DD');
        
        if (this.last_daily_claim === today) {
            throw new Error('Daily reward already claimed today');
        }

        await this.addWater(10);
        await this.update({ last_daily_claim: today });

        // VIP benefits
        if (this.vip_tier > 0 && moment().isBefore(moment(this.vip_expires))) {
            await this.addToInventory('seeds', 'potato', 2);
            
            if (this.vip_tier >= 2) {
                await this.update({ patch_parts: this.patch_parts + 5 });
                await this.addWater(10);
            }
            
            if (this.vip_tier >= 3) {
                await this.addWater(10); // Total 20 water for tier 3+
            }
        }

        return true;
    }

    getCropInfo(cropType) {
        const crops = {
            potato: { growthTime: 24, waterCost: 10, waterType: 'regular', sellPrice: 100, maxBoosterReduction: 12 },
            tomato: { growthTime: 48, waterCost: 20, waterType: 'regular', sellPrice: 150, maxBoosterReduction: 24 },
            onion: { growthTime: 96, waterCost: 50, waterType: 'regular', sellPrice: 250, maxBoosterReduction: 48 },
            carrot: { growthTime: 144, waterCost: 1, waterType: 'heavy', sellPrice: 1300, maxBoosterReduction: 72 }
        };
        return crops[cropType];
    }

    async watchAd() {
        const lastAd = await dbUtils.get(
            'SELECT watched_at FROM ad_watches WHERE user_id = ? ORDER BY watched_at DESC LIMIT 1',
            [this.id]
        );

        if (lastAd && moment().diff(moment(lastAd.watched_at), 'minutes') < 1) {
            throw new Error('Please wait 1 minute before watching another ad');
        }

        await this.addWater(1);
        await dbUtils.run(
            'INSERT INTO ad_watches (user_id, reward_amount) VALUES (?, ?)',
            [this.id, 1]
        );

        return 1;
    }

    getWalletBalance() {
        return {
            usdt: this.usdt_balance,
            ton: this.ton_balance,
            sbr: this.sbr_coins,
            water: this.water_drops,
            heavyWater: this.heavy_water,
            boosters: this.boosters
        };
    }
}

module.exports = User;