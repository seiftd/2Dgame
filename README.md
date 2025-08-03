# 🌾 Telegram Farmer Game

A comprehensive 2D farming game for Telegram where users cultivate crops, manage resources, and build their agricultural empire through strategic decisions and resource management.

## ✨ Features

### 🚜 Core Gameplay
- **Farm Management**: Start with 3 patches, expand up to 8 patches
- **4 Crop Types**: Potato (24h), Tomato (48h), Onion (96h), Carrot (144h)
- **Visual Farm Layout**: Interactive grid showing crop status
- **Growth Boosters**: Reduce growth time by 2 hours per booster
- **Real-time Updates**: Automated crop maturity tracking

### 💧 Water Management System
- **Daily Check-in**: 10 drops (resets at 00:00 UTC)
- **Ad Rewards**: 1 drop per ad (1-min cooldown)
- **Telegram Integration**: Join channel for 5 drops
- **Referral System**: 1-10 drops based on friend activity
- **Heavy Water**: Convert 100 regular drops = 1 heavy drop

### 🏪 Comprehensive Shop
#### Buy Section
- **Seeds**: All crop types with different payment methods
- **Boosters**: Speed up crop growth
- **Water**: Stock up on farming essentials
- **Patch Parts**: Expand your farm (10 parts = 1 patch)

#### Sell Section
- **Auto-sell**: Crops automatically sold on harvest
- **Conversions**: Water ↔ Heavy Water ↔ SBR coins

### 💰 Advanced Wallet System
- **Multi-currency**: USDT, TON, SBR coins
- **Payment Methods**: Binance Pay, TON Wallet, TRC20
- **Secure Withdrawals**: Admin approval system
- **Exchange Rates**: Real-time conversion rates
- **Transaction History**: Complete audit trail

### 👑 VIP Subscription System
| Tier | Price | Benefits |
|------|-------|----------|
| **Tier 1** | $7/month | +1 patch, 2 potato seedlings daily |
| **Tier 2** | $15/month | +1 patch, 5 patch parts, 2 potatoes, 10 water daily, tomato every 2 days |
| **Tier 3** | $30/month | +2 patches, 2 potatoes, 20 water daily, onion every 2 days |
| **Tier 4** | $99/month | +3 patches, 2 potatoes + 2 onions daily, carrot every 3 days |

### 🏆 Contest System
- **Daily Contests**: 20 SBR entry + 5 ads, Random SBR/Water prizes
- **Weekly Contests**: 100 SBR entry + 30 ads, Bigger prizes
- **Monthly Contests**: 200 SBR entry + 100 ads, VIP Tier 1 (3 winners)

### 📋 Tasks & Missions
- **Daily Tasks**: Login rewards, planting goals, ad watching
- **Weekly Challenges**: Harvest targets, earning goals
- **One-time Achievements**: VIP upgrades, referral milestones

### 🛡️ Admin Dashboard
- **User Management**: View, ban/unban users, track activity
- **Transaction Control**: Approve/reject withdrawals
- **VIP Management**: Monitor subscriptions and benefits
- **Analytics**: User growth, revenue tracking, game metrics
- **Contest Management**: Setup prizes, select winners

## 🛠️ Technical Stack

- **Backend**: Node.js with Express
- **Database**: SQLite with comprehensive schema
- **Telegram API**: node-telegram-bot-api
- **Scheduling**: Cron jobs for automated tasks
- **Authentication**: JWT for admin sessions
- **Security**: bcrypt for password hashing

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd telegram-farmer-game
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Configure your bot**
```bash
# Add your bot token and other settings to .env
BOT_TOKEN=your_bot_token_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

5. **Start the application**
```bash
npm start
# For development with auto-reload:
npm run dev
```

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | ✅ |
| `ADMIN_USERNAME` | Admin dashboard username | ✅ |
| `ADMIN_PASSWORD` | Admin dashboard password | ✅ |
| `ADMIN_TELEGRAM_ID` | Telegram ID for bot admin commands | ⚠️ |
| `PORT` | Server port (default: 3000) | ❌ |
| `JWT_SECRET` | Secret for JWT tokens | ✅ |
| `BINANCE_PAY_API_KEY` | Binance Pay integration | ❌ |
| `TON_API_KEY` | TON blockchain integration | ❌ |
| `TRON_API_KEY` | TRON network integration | ❌ |

## 🎮 Game Mechanics

### Crop Growth System
```javascript
const crops = {
    potato: { growthTime: 24, waterCost: 10, sellPrice: 100 },
    tomato: { growthTime: 48, waterCost: 20, sellPrice: 150 },
    onion: { growthTime: 96, waterCost: 50, sellPrice: 250 },
    carrot: { growthTime: 144, waterCost: 1, sellPrice: 1300 } // Uses heavy water
};
```

### Exchange Rates
- **200 SBR = 1 USDT**
- **1 TON = 3.5 USDT**
- **100 Water = 1 Heavy Water**
- **10 Heavy Water = 5 SBR**

### Inventory Limits
- 💧 Water: Max 100 drops
- ⚡ Boosters: Max 10
- 🌊 Heavy Water: Max 5 drops

## 🔧 Admin Commands

Use these commands in Telegram with the admin account:

```bash
/admin stats                    # Game statistics
/admin users [all|vip|banned]   # List users
/admin ban <telegram_id>        # Ban user
/admin unban <telegram_id>      # Unban user
/admin addwater <id> <amount>   # Add water to user
/admin addsbr <id> <amount>     # Add SBR coins to user
/admin setvip <id> <tier>       # Set VIP tier (0-4)
/admin transactions             # Pending transactions
/admin approve <transaction_id> # Approve transaction
/admin reject <id> <reason>     # Reject transaction
```

## 📊 Database Schema

### Key Tables
- **users**: Player accounts and balances
- **crops**: Active crop tracking
- **inventory**: Item storage (seeds, boosters, etc.)
- **transactions**: Payment history
- **contests**: Competition management
- **user_tasks**: Mission progress

## 🔐 Security Features

- **Admin Authentication**: Secure login system
- **Transaction Approval**: Manual withdrawal verification
- **Rate Limiting**: Ad cooldowns and limits
- **Input Validation**: Comprehensive data sanitization
- **Fraud Detection**: Referral abuse prevention

## 🎨 UI/UX Features

- **Rich Emojis**: Visual crop and resource indicators
- **Interactive Keyboards**: Intuitive navigation
- **Real-time Updates**: Live crop status and timers
- **Responsive Design**: Works on all devices
- **Progress Tracking**: Visual progress bars and stats

## 📈 Monetization Strategy

1. **VIP Subscriptions**: Monthly recurring revenue
2. **Transaction Fees**: Small fees on withdrawals
3. **Premium Items**: Exclusive seeds and boosters
4. **Ad Revenue**: Integration with ad networks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🛠️ Development

### Project Structure
```
telegram-farmer-game/
├── bot.js                 # Main bot entry point
├── database/
│   └── database.js       # Database setup and utilities
├── models/
│   └── User.js          # User model and methods
├── services/
│   ├── GameManager.js   # Game logic and cron jobs
│   └── AdminService.js  # Admin functionality
├── handlers/
│   ├── FarmHandler.js   # Farm management
│   ├── ShopHandler.js   # Shop operations
│   └── WalletHandler.js # Wallet and payments
└── public/              # Static assets
```

### Adding New Features

1. **New Handlers**: Create in `/handlers/` directory
2. **Database Changes**: Update schema in `database/database.js`
3. **Game Logic**: Add to `GameManager.js`
4. **Admin Features**: Extend `AdminService.js`

## 📱 Telegram Integration

### Bot Commands
- `/start` - Start the game
- `/admin <command>` - Admin functions

### Inline Keyboards
- Farm management
- Shop navigation
- Wallet operations
- VIP subscriptions

## 🔄 Automated Systems

- **Cron Jobs**: Crop maturity checks, VIP benefits, contests
- **Daily Resets**: Water drops, task progress
- **Contest Management**: Automatic winner selection
- **VIP Benefits**: Scheduled reward distribution

## 📞 Support

For support, questions, or feature requests:
- Create an issue on GitHub
- Contact the development team
- Join our Telegram community

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Telegram Bot API community
- Node.js ecosystem contributors
- Game design inspiration from farming simulation games

---

**Happy Farming! 🌾🚜**