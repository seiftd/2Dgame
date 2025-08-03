const moment = require('moment');
const { dbUtils } = require('../database/database');
const cron = require('cron');

class GameManager {
    constructor() {
        this.initializeCronJobs();
        this.initializeGameSettings();
    }

    async initializeGameSettings() {
        this.cropInfo = {
            potato: { 
                growthTime: 24, 
                waterCost: 10, 
                waterType: 'regular', 
                sellPrice: 100, 
                maxBoosterReduction: 12,
                seedPrice: { type: 'sbr', amount: 50 }
            },
            tomato: { 
                growthTime: 48, 
                waterCost: 20, 
                waterType: 'regular', 
                sellPrice: 150, 
                maxBoosterReduction: 24,
                seedPrice: { type: 'sbr', amount: 100 }
            },
            onion: { 
                growthTime: 96, 
                waterCost: 50, 
                waterType: 'regular', 
                sellPrice: 250, 
                maxBoosterReduction: 48,
                seedPrice: { type: 'usdt', amount: 1 }
            },
            carrot: { 
                growthTime: 144, 
                waterCost: 1, 
                waterType: 'heavy', 
                sellPrice: 1300, 
                maxBoosterReduction: 72,
                seedPrice: { type: 'usdt', amount: 5 }
            }
        };

        this.vipTiers = {
            1: { 
                price: 7, 
                patches: 1, 
                dailyBenefits: {
                    potato_seeds: 2
                }
            },
            2: { 
                price: 15, 
                patches: 1, 
                dailyBenefits: {
                    patch_parts: 5,
                    potato_seeds: 2,
                    water_drops: 10
                },
                scheduledBenefits: {
                    tomato_seeds: { interval: 2, amount: 1 } // every 2 days
                }
            },
            3: { 
                price: 30, 
                patches: 2, 
                dailyBenefits: {
                    potato_seeds: 2,
                    water_drops: 20
                },
                scheduledBenefits: {
                    onion_seeds: { interval: 2, amount: 1 }
                }
            },
            4: { 
                price: 99, 
                patches: 3, 
                dailyBenefits: {
                    potato_seeds: 2,
                    onion_seeds: 2
                },
                scheduledBenefits: {
                    carrot_seeds: { interval: 3, amount: 1 }
                }
            }
        };

        this.patchPartPrice = {
            sbr: 100,
            usdt: 0.5
        };

        this.boosterPrice = {
            sbr: 25,
            usdt: 0.1
        };

        this.waterPrice = {
            sbr: 5, // per drop
            usdt: 0.02 // per drop
        };
    }

    initializeCronJobs() {
        // Check for ready crops every 5 minutes
        const cropCheckJob = new cron.CronJob('*/5 * * * *', async () => {
            await this.checkReadyCrops();
        });
        cropCheckJob.start();

        // Daily VIP benefits at midnight UTC
        const vipBenefitsJob = new cron.CronJob('0 0 * * *', async () => {
            await this.distributeVIPBenefits();
        });
        vipBenefitsJob.start();

        // Contest management at 23:30 UTC daily
        const contestJob = new cron.CronJob('30 23 * * *', async () => {
            await this.manageContests();
        });
        contestJob.start();

        console.log('🕒 Cron jobs initialized');
    }

    async checkReadyCrops() {
        const readyCrops = await dbUtils.all(
            'SELECT * FROM crops WHERE is_harvested = FALSE AND harvest_time <= CURRENT_TIMESTAMP'
        );

        console.log(`🌾 Found ${readyCrops.length} crops ready for harvest`);
        
        // You could notify users here if needed
        // for (const crop of readyCrops) {
        //     // Send notification to user about ready crop
        // }
    }

    async distributeVIPBenefits() {
        const vipUsers = await dbUtils.all(
            'SELECT * FROM users WHERE vip_tier > 0 AND vip_expires > CURRENT_TIMESTAMP'
        );

        console.log(`👑 Distributing VIP benefits to ${vipUsers.length} users`);

        for (const user of vipUsers) {
            const tierBenefits = this.vipTiers[user.vip_tier];
            
            if (tierBenefits.dailyBenefits) {
                for (const [benefit, amount] of Object.entries(tierBenefits.dailyBenefits)) {
                    await this.grantVIPBenefit(user.id, user.vip_tier, benefit, amount);
                }
            }

            // Handle scheduled benefits (every X days)
            if (tierBenefits.scheduledBenefits) {
                await this.handleScheduledBenefits(user, tierBenefits.scheduledBenefits);
            }
        }
    }

    async grantVIPBenefit(userId, tier, benefitType, amount) {
        try {
            switch (benefitType) {
                case 'potato_seeds':
                case 'tomato_seeds':
                case 'onion_seeds':
                case 'carrot_seeds':
                    const seedType = benefitType.replace('_seeds', '');
                    await dbUtils.run(
                        `INSERT INTO inventory (user_id, item_type, item_name, quantity) 
                         VALUES (?, 'seeds', ?, ?) 
                         ON CONFLICT(user_id, item_type, item_name) 
                         DO UPDATE SET quantity = quantity + ?`,
                        [userId, seedType, amount, amount]
                    );
                    break;

                case 'water_drops':
                    await dbUtils.run(
                        'UPDATE users SET water_drops = MIN(water_drops + ?, 100) WHERE id = ?',
                        [amount, userId]
                    );
                    break;

                case 'patch_parts':
                    await dbUtils.run(
                        'UPDATE users SET patch_parts = patch_parts + ? WHERE id = ?',
                        [amount, userId]
                    );
                    break;
            }

            // Log the benefit
            await dbUtils.run(
                `INSERT INTO vip_benefits_log (user_id, tier, benefit_type, amount) 
                 VALUES (?, ?, ?, ?)`,
                [userId, tier, benefitType, amount]
            );

        } catch (error) {
            console.error('Error granting VIP benefit:', error);
        }
    }

    async handleScheduledBenefits(user, scheduledBenefits) {
        const accountAge = moment().diff(moment(user.created_at), 'days');
        
        for (const [benefit, config] of Object.entries(scheduledBenefits)) {
            if (accountAge % config.interval === 0) {
                await this.grantVIPBenefit(user.id, user.vip_tier, benefit, config.amount);
            }
        }
    }

    async manageContests() {
        const today = moment();
        
        // End daily contests
        await this.endDailyContest();
        
        // End weekly contests on Mondays
        if (today.isoWeekday() === 1) {
            await this.endWeeklyContest();
        }
        
        // End monthly contests on last day of month
        if (today.clone().add(1, 'day').date() === 1) {
            await this.endMonthlyContest();
        }
        
        // Start new contests
        await this.startNewContests();
    }

    async endDailyContest() {
        const activeContest = await dbUtils.get(
            `SELECT * FROM contests WHERE type = 'daily' AND status = 'active' 
             AND DATE(created_at) = DATE('now')`
        );

        if (activeContest) {
            await this.selectContestWinners(activeContest.id, 'daily');
            await dbUtils.run(
                'UPDATE contests SET status = "ended" WHERE id = ?',
                [activeContest.id]
            );
        }
    }

    async endWeeklyContest() {
        const activeContest = await dbUtils.get(
            `SELECT * FROM contests WHERE type = 'weekly' AND status = 'active'`
        );

        if (activeContest) {
            await this.selectContestWinners(activeContest.id, 'weekly');
            await dbUtils.run(
                'UPDATE contests SET status = "ended" WHERE id = ?',
                [activeContest.id]
            );
        }
    }

    async endMonthlyContest() {
        const activeContest = await dbUtils.get(
            `SELECT * FROM contests WHERE type = 'monthly' AND status = 'active'`
        );

        if (activeContest) {
            await this.selectContestWinners(activeContest.id, 'monthly');
            await dbUtils.run(
                'UPDATE contests SET status = "ended" WHERE id = ?',
                [activeContest.id]
            );
        }
    }

    async selectContestWinners(contestId, contestType) {
        const entries = await dbUtils.all(
            `SELECT ce.*, u.telegram_id, u.first_name 
             FROM contest_entries ce 
             JOIN users u ON ce.user_id = u.id 
             WHERE ce.contest_id = ? AND ce.ads_watched >= 
             (SELECT ads_required FROM contests WHERE id = ?)`,
            [contestId, contestId]
        );

        if (entries.length === 0) {
            console.log(`No valid entries for ${contestType} contest`);
            return;
        }

        const numWinners = contestType === 'monthly' ? 3 : 1;
        const winners = this.selectRandomWinners(entries, numWinners);

        for (const winner of winners) {
            await this.distributeContestPrize(winner, contestType);
        }

        console.log(`🏆 ${contestType} contest ended. Winners: ${winners.map(w => w.first_name).join(', ')}`);
    }

    selectRandomWinners(entries, numWinners) {
        const shuffled = entries.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(numWinners, entries.length));
    }

    async distributeContestPrize(winner, contestType) {
        let prize;
        
        switch (contestType) {
            case 'daily':
                prize = this.generateRandomPrize('daily');
                break;
            case 'weekly':
                prize = this.generateRandomPrize('weekly');
                break;
            case 'monthly':
                // VIP Tier 1 for monthly winners
                const expiryDate = moment().add(1, 'month');
                await dbUtils.run(
                    'UPDATE users SET vip_tier = 1, vip_expires = ? WHERE id = ?',
                    [expiryDate.format('YYYY-MM-DD HH:mm:ss'), winner.user_id]
                );
                return;
        }

        // Apply the prize
        if (prize.type === 'sbr') {
            await dbUtils.run(
                'UPDATE users SET sbr_coins = sbr_coins + ? WHERE id = ?',
                [prize.amount, winner.user_id]
            );
        } else if (prize.type === 'water') {
            await dbUtils.run(
                'UPDATE users SET water_drops = MIN(water_drops + ?, 100) WHERE id = ?',
                [prize.amount, winner.user_id]
            );
        }
    }

    generateRandomPrize(contestType) {
        const prizes = {
            daily: [
                { type: 'sbr', amount: 50 },
                { type: 'sbr', amount: 100 },
                { type: 'water', amount: 20 },
                { type: 'water', amount: 30 }
            ],
            weekly: [
                { type: 'sbr', amount: 200 },
                { type: 'sbr', amount: 300 },
                { type: 'sbr', amount: 500 },
                { type: 'water', amount: 50 },
                { type: 'water', amount: 75 }
            ]
        };

        const prizePool = prizes[contestType];
        return prizePool[Math.floor(Math.random() * prizePool.length)];
    }

    async startNewContests() {
        // Start daily contest
        await dbUtils.run(
            `INSERT INTO contests (type, entry_cost, ads_required, prize_pool, start_time, end_time) 
             VALUES ('daily', 20, 5, '{"type": "random", "value": "SBR/Water"}', 
             CURRENT_TIMESTAMP, datetime('now', '+1 day', '-30 minutes'))`
        );

        // Start weekly contest on Mondays
        if (moment().isoWeekday() === 1) {
            await dbUtils.run(
                `INSERT INTO contests (type, entry_cost, ads_required, prize_pool, start_time, end_time) 
                 VALUES ('weekly', 100, 30, '{"type": "random", "value": "SBR/Water"}', 
                 CURRENT_TIMESTAMP, datetime('now', '+7 days', '-30 minutes'))`
            );
        }

        // Start monthly contest on first day of month
        if (moment().date() === 1) {
            await dbUtils.run(
                `INSERT INTO contests (type, entry_cost, ads_required, prize_pool, start_time, end_time) 
                 VALUES ('monthly', 200, 100, '{"type": "vip", "value": "VIP Tier 1"}', 
                 CURRENT_TIMESTAMP, datetime('now', 'start of month', '+1 month', '-1 day', '+23 hours', '+30 minutes'))`
            );
        }
    }

    getTimeRemaining(harvestTime) {
        const now = moment();
        const harvest = moment(harvestTime);
        
        if (now.isAfter(harvest)) {
            return 'Ready to harvest!';
        }
        
        const duration = moment.duration(harvest.diff(now));
        const hours = Math.floor(duration.asHours());
        const minutes = duration.minutes();
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async applyBooster(cropId, boosterCount) {
        const crop = await dbUtils.get('SELECT * FROM crops WHERE id = ?', [cropId]);
        if (!crop) {
            throw new Error('Crop not found');
        }

        const cropInfo = this.cropInfo[crop.crop_type];
        const reductionPerBooster = 2; // hours
        const maxReduction = cropInfo.maxBoosterReduction;
        
        const currentReduction = crop.boosters_used * reductionPerBooster;
        const newReduction = Math.min(currentReduction + (boosterCount * reductionPerBooster), maxReduction);
        const actualReduction = newReduction - currentReduction;
        
        if (actualReduction === 0) {
            throw new Error('Cannot apply more boosters to this crop');
        }

        const newHarvestTime = moment(crop.harvest_time).subtract(actualReduction, 'hours');
        
        await dbUtils.run(
            'UPDATE crops SET harvest_time = ?, boosters_used = boosters_used + ? WHERE id = ?',
            [newHarvestTime.format('YYYY-MM-DD HH:mm:ss'), boosterCount, cropId]
        );

        return actualReduction;
    }

    getCropInfo(cropType) {
        return this.cropInfo[cropType];
    }

    getVIPTierInfo(tier) {
        return this.vipTiers[tier];
    }

    getPatchPartPrice() {
        return this.patchPartPrice;
    }

    getShopPrices() {
        return {
            seeds: this.cropInfo,
            boosters: this.boosterPrice,
            water: this.waterPrice,
            patchParts: this.patchPartPrice
        };
    }
}

module.exports = GameManager;