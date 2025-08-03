# 🚀 Deployment Guide - Telegram Farmer Game

This guide will help you deploy the Telegram Farmer Game on various platforms.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Telegram Bot Token**
   - Create a bot via [@BotFather](https://t.me/BotFather)
   - Copy the bot token
   - Set bot commands and description

2. **Environment Setup**
   - Node.js v14+ installed
   - npm or yarn package manager
   - Git for version control

3. **External Services** (Optional)
   - Payment gateway accounts (Binance Pay, TON, TRON)
   - Domain name for webhook setup
   - SSL certificate for HTTPS

## 🏠 Local Development

### Step 1: Clone and Setup
```bash
git clone <your-repository>
cd telegram-farmer-game
npm install
```

### Step 2: Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Step 3: Configure Bot Token
1. Get your bot token from [@BotFather](https://t.me/BotFather)
2. Replace `BOT_TOKEN` in `.env` file
3. Add your Telegram ID as `ADMIN_TELEGRAM_ID`

### Step 4: Start Development Server
```bash
npm run dev
# or
npm start
```

### Step 5: Test the Bot
1. Send `/start` to your bot
2. Test farm, shop, and wallet functions
3. Use `/admin stats` for admin commands

## ☁️ Cloud Deployment Options

### Option 1: Heroku Deployment

#### Requirements
- Heroku account
- Heroku CLI installed

#### Steps
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-farmer-game

# Set environment variables
heroku config:set BOT_TOKEN=your_bot_token_here
heroku config:set ADMIN_USERNAME=admin
heroku config:set ADMIN_PASSWORD=your_secure_password
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

#### Heroku-specific Configuration
Create `Procfile`:
```
web: node bot.js
```

### Option 2: Railway Deployment

#### Requirements
- Railway account
- GitHub repository

#### Steps
1. Connect Railway to your GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### Railway Configuration
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node bot.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Option 3: DigitalOcean App Platform

#### Requirements
- DigitalOcean account
- Docker knowledge (optional)

#### Steps
1. Create new app in DigitalOcean
2. Connect to GitHub repository
3. Configure environment variables
4. Deploy with auto-scaling

### Option 4: VPS Deployment (Ubuntu)

#### Requirements
- VPS with Ubuntu 20.04+
- SSH access
- Domain name (optional)

#### Steps
```bash
# Connect to VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Clone repository
git clone <your-repository>
cd telegram-farmer-game

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start with PM2
pm2 start bot.js --name "farmer-game"
pm2 startup
pm2 save

# Setup Nginx (optional, for web interface)
apt install nginx
# Configure Nginx proxy for port 3000
```

#### PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'telegram-farmer-game',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Option 5: Docker Deployment

#### Dockerfile
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["node", "bot.js"]
```

#### Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  farmer-game:
    build: .
    ports:
      - "3000:3000"
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./database:/app/database
    restart: unless-stopped
```

#### Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔧 Environment Variables

### Required Variables
```bash
BOT_TOKEN=your_telegram_bot_token
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD=secure_password
JWT_SECRET=your_jwt_secret
```

### Optional Variables
```bash
ADMIN_TELEGRAM_ID=your_telegram_id
PORT=3000
NODE_ENV=production
BINANCE_PAY_API_KEY=optional
TON_API_KEY=optional
TRON_API_KEY=optional
```

## 🗄️ Database Setup

### SQLite (Default)
- Automatically created on first run
- Stored in `./database/game.db`
- No additional setup required

### PostgreSQL (Production)
```bash
# Install PostgreSQL
npm install pg

# Update database connection in database/database.js
# Set DATABASE_URL environment variable
```

### MongoDB (Alternative)
```bash
# Install MongoDB driver
npm install mongodb

# Update database layer
# Set MONGODB_URI environment variable
```

## 🔐 Security Considerations

### Environment Security
1. Never commit `.env` files
2. Use strong passwords and JWT secrets
3. Rotate keys regularly
4. Use environment-specific configurations

### Bot Security
1. Validate all user inputs
2. Implement rate limiting
3. Monitor for suspicious activity
4. Regular security audits

### Server Security
```bash
# Update system regularly
apt update && apt upgrade

# Configure firewall
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Setup SSL with Let's Encrypt
certbot --nginx -d yourdomain.com
```

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs farmer-game

# Restart app
pm2 restart farmer-game
```

### Health Checks
Add to your app:
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Log Management
```bash
# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🔄 CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Deploy to server
      run: |
        # Your deployment script here
        echo "Deploying to production..."
```

## 🆘 Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Check bot token validity
   - Verify internet connection
   - Check bot permissions

2. **Database Errors**
   - Ensure write permissions
   - Check disk space
   - Verify database path

3. **Memory Issues**
   - Monitor RAM usage
   - Implement memory limits
   - Consider server upgrade

4. **Network Issues**
   - Check firewall settings
   - Verify port accessibility
   - Test external API connections

### Debug Commands
```bash
# Check bot process
pm2 list

# View detailed logs
pm2 logs farmer-game --lines 100

# Restart bot
pm2 restart farmer-game

# Monitor resource usage
pm2 monit
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review logs for error messages
3. Contact development team
4. Create GitHub issue with details

---

**Happy Farming! 🌾🚜**