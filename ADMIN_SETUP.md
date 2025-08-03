# 🛡️ Admin Dashboard Setup Guide

This guide will help you set up and use the comprehensive admin dashboard for your Telegram Farmer Game.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Dashboard](#running-the-dashboard)
5. [Dashboard Features](#dashboard-features)
6. [VS Code Setup](#vs-code-setup)
7. [Troubleshooting](#troubleshooting)
8. [Security Notes](#security-notes)

---

## 🔧 Prerequisites

Before setting up the admin dashboard, make sure you have:

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **VS Code** (recommended IDE)
- **Git** (for version control)
- **Telegram Bot Token** (from @BotFather)

---

## 📦 Installation

### 1. Navigate to Your Project Directory

```bash
cd /path/to/your/telegram-farmer-game
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in your project root if you haven't already:

```bash
# Copy the example file
cp .env.example .env
```

Edit the `.env` file with your actual values:

```env
# Telegram Bot Token (REQUIRED)
BOT_TOKEN=your_actual_bot_token_here

# Admin Dashboard Credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# Admin Telegram ID (your personal Telegram user ID)
ADMIN_TELEGRAM_ID=123456789

# Database Path
DB_PATH=./database/game.db

# Server Configuration
PORT=3000
NODE_ENV=development

# Security (CHANGE THIS!)
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Game Settings
DAILY_RESET_HOUR=0
MAX_WATER_DROPS=100
MAX_BOOSTERS=10
MAX_HEAVY_WATER=5

# Exchange Rates (can be updated via dashboard)
SBR_TO_USDT_RATE=200
USDT_TO_TON_RATE=3.5

# Withdrawal Limits
MIN_USDT_WITHDRAWAL=5
MIN_TON_WITHDRAWAL=1
MIN_TRC20_WITHDRAWAL=4
```

---

## ⚙️ Configuration

### 1. Initialize Database

Run the bot once to create the database and admin user:

```bash
npm start
```

This will:
- Create the SQLite database
- Set up all required tables
- Create the default admin user
- Initialize game settings

### 2. Update Admin Password (Recommended)

For security, change the default admin password by updating the `.env` file and restarting the application.

---

## 🚀 Running the Dashboard

### Option 1: Run Admin Dashboard Only

```bash
npm run server
```

This starts only the web admin dashboard on `http://localhost:3000`

### Option 2: Run Bot + Dashboard Together

```bash
# Terminal 1: Start the Telegram Bot
npm start

# Terminal 2: Start the Admin Dashboard
npm run server
```

### Option 3: Development Mode

```bash
# Terminal 1: Bot with auto-restart
npm run dev

# Terminal 2: Dashboard with auto-restart
npm run dev-server
```

---

## 🖥️ VS Code Setup

### 1. Install Recommended Extensions

Open VS Code and install these extensions:

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-node-azure-pack
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension formulahendry.auto-rename-tag
```

### 2. VS Code Workspace Configuration

Create `.vscode/settings.json`:

```json
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll": true
    },
    "emmet.includeLanguages": {
        "javascript": "javascriptreact"
    },
    "files.associations": {
        "*.env": "properties"
    }
}
```

### 3. VS Code Tasks Configuration

Create `.vscode/tasks.json`:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Bot",
            "type": "shell",
            "command": "npm",
            "args": ["start"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "panel": "new"
            }
        },
        {
            "label": "Start Admin Dashboard",
            "type": "shell",
            "command": "npm",
            "args": ["run", "server"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "panel": "new"
            }
        },
        {
            "label": "Development Mode",
            "type": "shell",
            "command": "npm",
            "args": ["run", "dev"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "panel": "new"
            }
        }
    ]
}
```

### 4. VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Bot",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/bot.js",
            "env": {
                "NODE_ENV": "development"
            },
            "envFile": "${workspaceFolder}/.env",
            "console": "integratedTerminal"
        },
        {
            "name": "Launch Admin Server",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/server.js",
            "env": {
                "NODE_ENV": "development"
            },
            "envFile": "${workspaceFolder}/.env",
            "console": "integratedTerminal"
        }
    ]
}
```

---

## 🎯 Dashboard Features

### 📊 Overview Section
- **Real-time Statistics**: Total users, active users, VIP subscribers
- **Revenue Tracking**: USDT transactions and earnings
- **Growth Charts**: User acquisition over time
- **Crop Analytics**: Active crops and farm statistics

### 👥 User Management
- **Search & Filter**: Find users by name, username, or ID
- **Ban/Unban**: Moderate problematic users
- **VIP Management**: Assign or remove VIP tiers
- **Resource Management**: Add water, SBR coins, boosters
- **Activity Tracking**: Monitor user engagement

### 💰 Transaction Management
- **Pending Approvals**: Review deposit/withdrawal requests
- **Transaction History**: Complete audit trail
- **Bulk Actions**: Process multiple transactions
- **Currency Filters**: Sort by USDT, TON, SBR
- **Status Tracking**: Pending, approved, rejected

### 👑 VIP Management
- **Tier Statistics**: Monitor VIP distribution
- **Subscription Control**: Manage VIP memberships
- **Benefit Tracking**: Monitor VIP perks usage
- **Revenue Analytics**: VIP subscription income

### 📈 Analytics Dashboard
- **User Growth**: Registration trends
- **Revenue Charts**: Income analysis
- **Crop Distribution**: Popular crop types
- **Engagement Metrics**: Activity patterns

### ⚙️ Game Settings
- **Exchange Rates**: SBR to USDT, USDT to TON
- **Game Limits**: Water drops, boosters, daily rewards
- **Economic Controls**: Inflation management
- **Feature Toggles**: Enable/disable game features

### 📢 Broadcast System
- **Mass Messaging**: Send announcements
- **Target Audiences**: All, active, VIP, or free users
- **Message Scheduling**: Plan communications
- **Delivery Tracking**: Monitor reach

---

## 🔐 Access Instructions

### 1. Open Dashboard

Navigate to: `http://localhost:3000/admin`

### 2. Login Credentials

- **Username**: `admin` (or your custom username)
- **Password**: Use the password from your `.env` file

### 3. First Login Checklist

After logging in for the first time:

1. ✅ Change default admin password
2. ✅ Review game settings
3. ✅ Test user management features
4. ✅ Set up transaction approval workflow
5. ✅ Configure VIP tiers
6. ✅ Test broadcast functionality

---

## 🛠️ Development Workflow in VS Code

### 1. Starting Development

1. Open VS Code: `code .`
2. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Type "Tasks: Run Task"
4. Select "Development Mode" to start bot with auto-restart

### 2. Running Admin Dashboard

1. Open VS Code terminal: `Ctrl+`` (backtick)
2. Run: `npm run dev-server`
3. Open browser: `http://localhost:3000/admin`

### 3. Debugging

1. Press `F5` to open debug menu
2. Select "Launch Bot" or "Launch Admin Server"
3. Set breakpoints by clicking line numbers
4. Use debug console for testing

### 4. File Organization

```
project-root/
├── admin/                 # Admin dashboard files
│   ├── index.html        # Dashboard HTML
│   └── admin.js          # Dashboard JavaScript
├── routes/               # API routes
│   └── admin.js          # Admin API endpoints
├── database/             # Database files
├── models/               # Data models
├── services/             # Business logic
├── handlers/             # Bot handlers
├── public/               # Static assets
├── .vscode/              # VS Code configuration
├── server.js             # Admin server
├── bot.js                # Telegram bot
└── .env                  # Environment variables
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Dashboard Won't Load
```bash
# Check if server is running
npm run server

# Check port availability
netstat -an | grep 3000

# Verify environment variables
echo $PORT
```

#### 2. Login Failed
```bash
# Verify admin credentials in .env
cat .env | grep ADMIN

# Check database for admin user
sqlite3 database/game.db "SELECT * FROM admin_users;"

# Reset admin password
node -e "
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('newpassword', 10));
"
```

#### 3. Database Errors
```bash
# Check database file exists
ls -la database/

# Verify database schema
sqlite3 database/game.db ".schema"

# Reset database (CAUTION: Deletes all data)
rm database/game.db
npm start
```

#### 4. API Errors
```bash
# Check server logs
npm run server | tee server.log

# Test API endpoints
curl http://localhost:3000/health

# Verify JWT secret
echo $JWT_SECRET
```

### VS Code Specific Issues

#### 1. Extensions Not Working
```bash
# Reload VS Code window
Ctrl+Shift+P > "Developer: Reload Window"

# Reset extension host
Ctrl+Shift+P > "Developer: Restart Extension Host"
```

#### 2. Terminal Issues
```bash
# Open new terminal
Ctrl+Shift+`

# Change default shell
Ctrl+Shift+P > "Terminal: Select Default Profile"
```

#### 3. Debug Configuration
```bash
# Verify .vscode/launch.json exists
ls .vscode/

# Check Node.js path
which node
```

---

## 🔒 Security Notes

### Production Deployment

1. **Change Default Credentials**:
   ```env
   ADMIN_USERNAME=your_secure_username
   ADMIN_PASSWORD=very_secure_password_123!
   ```

2. **Secure JWT Secret**:
   ```env
   JWT_SECRET=super_long_random_string_that_nobody_can_guess
   ```

3. **Environment Security**:
   ```bash
   # Set proper file permissions
   chmod 600 .env
   
   # Don't commit .env to git
   echo ".env" >> .gitignore
   ```

4. **HTTPS Setup** (Production):
   - Use reverse proxy (nginx/Apache)
   - SSL certificate (Let's Encrypt)
   - Secure headers

### Access Control

- Admin dashboard requires authentication
- JWT tokens expire after 24 hours
- Failed login attempts are logged
- Database access is restricted

---

## 📞 Support

If you encounter issues:

1. **Check Logs**: Look at console output for error messages
2. **Verify Setup**: Ensure all steps were followed correctly
3. **Environment**: Double-check `.env` file configuration
4. **Dependencies**: Run `npm install` to update packages
5. **Documentation**: Review this guide and comments in code

### Quick Commands Reference

```bash
# Install dependencies
npm install

# Start bot only
npm start

# Start admin dashboard only
npm run server

# Development mode (auto-restart)
npm run dev
npm run dev-server

# Check health
curl http://localhost:3000/health

# View database
sqlite3 database/game.db
```

---

## 🎉 You're Ready!

Your admin dashboard is now set up and ready to use! You can:

- ✅ Monitor your game in real-time
- ✅ Manage users and transactions
- ✅ Control VIP subscriptions
- ✅ Send broadcasts to players
- ✅ Analyze game performance
- ✅ Backup your database

Navigate to `http://localhost:3000/admin` and start managing your Telegram Farmer Game! 🌾🚜