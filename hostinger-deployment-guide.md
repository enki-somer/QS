# 🚀 Hostinger VPS Deployment Guide for QS Financial PWA

## 📋 Prerequisites

### VPS Requirements

- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (Recommended 4GB)
- **Storage**: Minimum 20GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Public IP with domain pointing to it

### Software Stack

- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v13+
- **Nginx**: Latest stable
- **PM2**: Process manager
- **SSL**: Let's Encrypt (Certbot)

---

## 🔧 Step 1: Server Setup

### 1.1 Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Create application user
sudo adduser qsfinancial
sudo usermod -aG sudo qsfinancial
```

### 1.2 Install Node.js

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE qs_financial;
CREATE USER qs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE qs_financial TO qs_user;
\q
```

### 1.4 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Allow through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable
```

---

## 📦 Step 2: Application Deployment

### 2.1 Clone and Setup Backend

```bash
# Switch to application user
sudo su - qsfinancial

# Clone repository
git clone https://github.com/your-repo/qs-financial.git
cd qs-financial

# Setup backend
cd backend
npm install
npm run build

# Create environment file
cp .env.example .env
nano .env
```

### 2.2 Backend Environment Configuration

```env
# backend/.env
NODE_ENV=production
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qs_financial
DB_USER=qs_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars
CORS_ORIGIN=https://yourdomain.com
```

### 2.3 Setup Frontend

```bash
# Setup frontend
cd ../sham
npm install

# Create environment file
nano .env.local
```

### 2.4 Frontend Environment Configuration

```env
# sham/.env.local
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 2.5 Build Applications

```bash
# Build backend
cd ../backend
npm run build

# Build frontend
cd ../sham
npm run build
```

---

## 🔄 Step 3: Process Management with PM2

### 3.1 Install PM2

```bash
sudo npm install -g pm2
```

### 3.2 Create PM2 Ecosystem File

```bash
# Create ecosystem file
nano ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "qs-backend",
      script: "./backend/dist/server.js",
      cwd: "/home/qsfinancial/qs-financial",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_file: "./logs/backend-combined.log",
      time: true,
      max_memory_restart: "1G",
      restart_delay: 4000,
    },
    {
      name: "qs-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/qsfinancial/qs-financial/sham",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend-combined.log",
      time: true,
      max_memory_restart: "1G",
    },
  ],
};
```

### 3.3 Start Applications

```bash
# Create logs directory
mkdir -p logs

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the instructions provided by PM2
```

---

## 🌐 Step 4: Nginx Configuration

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/qs-financial
```

```nginx
# /etc/nginx/sites-available/qs-financial
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (will be added by Certbot)

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # API routes to backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # PWA specific files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker
    location /sw.js {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest
    location /manifest.json {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### 4.2 Enable Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/qs-financial /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 5: SSL Certificate with Let's Encrypt

### 5.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## 🗄️ Step 6: Database Setup

### 6.1 Import Database Schema

```bash
# Import the schema
sudo -u postgres psql -d qs_financial -f /home/qsfinancial/qs-financial/backend/database/schema_master.sql
```

### 6.2 Create Initial Admin User

```bash
# Connect to database
sudo -u postgres psql -d qs_financial

# Insert admin user (replace with your details)
INSERT INTO users (username, password_hash, role, full_name, email)
VALUES ('admin', '$2b$10$your_hashed_password', 'admin', 'System Administrator', 'admin@yourdomain.com');
```

---

## 📊 Step 7: Monitoring and Maintenance

### 7.1 Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/qs-financial
```

```
/home/qsfinancial/qs-financial/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 qsfinancial qsfinancial
    postrotate
        pm2 reload all
    endscript
}
```

### 7.2 Create Backup Script

```bash
nano /home/qsfinancial/backup.sh
```

```bash
#!/bin/bash
# Database backup script

BACKUP_DIR="/home/qsfinancial/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="qs_financial"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U qs_user -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.sql"
```

```bash
# Make executable
chmod +x /home/qsfinancial/backup.sh

# Add to crontab for daily backups
crontab -e
# Add this line:
0 2 * * * /home/qsfinancial/backup.sh
```

---

## 🔍 Step 8: Testing and Verification

### 8.1 Test PWA Functionality

1. Visit https://yourdomain.com
2. Check PWA installability in browser
3. Test offline functionality
4. Verify push notifications
5. Test on mobile devices

### 8.2 Performance Testing

```bash
# Install lighthouse CLI for testing
npm install -g lighthouse

# Run lighthouse audit
lighthouse https://yourdomain.com --output html --output-path ./lighthouse-report.html
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **502 Bad Gateway**

   ```bash
   # Check if applications are running
   pm2 status

   # Check logs
   pm2 logs
   ```

2. **Database Connection Issues**

   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Check database connectivity
   sudo -u postgres psql -d qs_financial -c "SELECT version();"
   ```

3. **SSL Certificate Issues**

   ```bash
   # Renew certificate manually
   sudo certbot renew

   # Check certificate status
   sudo certbot certificates
   ```

4. **PWA Not Installing**
   - Check manifest.json accessibility
   - Verify HTTPS is working
   - Check service worker registration
   - Ensure all PWA requirements are met

---

## 📈 Performance Optimization

### 8.1 Enable Redis Caching (Optional)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

### 8.2 Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY idx_invoices_project_id ON invoices(project_id);
CREATE INDEX CONCURRENTLY idx_invoices_status ON invoices(status);
CREATE INDEX CONCURRENTLY idx_safe_transactions_type ON safe_transactions(transaction_type);
```

---

## 🔄 Deployment Updates

### Update Process

```bash
# Pull latest changes
cd /home/qsfinancial/qs-financial
git pull origin main

# Update backend
cd backend
npm install
npm run build

# Update frontend
cd ../sham
npm install
npm run build

# Restart applications
pm2 restart all

# Check status
pm2 status
```

---

This deployment guide ensures your QS Financial PWA runs optimally on Hostinger VPS with proper security, performance, and monitoring in place.
