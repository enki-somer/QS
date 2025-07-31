# 🚀 Quick Setup Guide - PostgreSQL Database

## Current Situation:

- ✅ PostgreSQL is installed (version 17.4)
- ❌ PostgreSQL service is not running
- ❌ Database not created yet
- ❌ Backend not connected to database

## Step 1: Start PostgreSQL Service

### Method A: Using Windows Services (Recommended)

1. Press `Windows + R`
2. Type `services.msc` and press Enter
3. Look for PostgreSQL service (might be named one of these):
   - `postgresql-x64-17`
   - `PostgreSQL 17 Server`
   - `PostgreSQL Database Server 17`
4. Right-click the service → "Start"
5. Right-click the service → "Properties" → Set "Startup type" to "Automatic"

### Method B: Using Command Line

Try these commands one by one until one works:

```cmd
net start "postgresql-x64-17"
net start "PostgreSQL Database Server 17"
net start "PostgreSQL 17 Server"
```

## Step 2: Create Database

Once PostgreSQL is running, open Command Prompt as Administrator and run:

```cmd
psql -U postgres -c "CREATE DATABASE qs_financial;"
```

If you get a password prompt, use the password you set during PostgreSQL installation.

## Step 3: Setup Environment Variables

In the `backend` folder, copy `.env.example` to `.env` and edit it:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qs_financial
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

## Step 4: Apply Database Schema

```cmd
cd backend
psql -U postgres -d qs_financial -f database/schema.sql
```

## Step 5: Install Dependencies and Start Backend

```cmd
cd backend
npm install
npm run dev
```

## Step 6: Test Everything

1. Open `check-data-location.html` in your browser
2. Click "اختبار الـ API الخلفي" button
3. Should show "✅ الخادم يعمل" if everything is working

## Common Issues:

### "Password authentication failed"

- Use the password you set during PostgreSQL installation
- Or reset password: `ALTER USER postgres PASSWORD 'newpassword';`

### "Connection refused"

- PostgreSQL service is not running
- Check Windows Services and start it

### "Database does not exist"

- Run: `psql -U postgres -c "CREATE DATABASE qs_financial;"`

### "Permission denied"

- Run Command Prompt as Administrator
- Make sure you're using the correct username

## What Happens Next:

Once this setup is complete:

1. Your data will still be in localStorage (old way)
2. But the backend API will be ready to use PostgreSQL
3. We'll then update the frontend to use the API instead of localStorage
4. Your existing data can be migrated if needed

---

**Need help? The current issue is that PostgreSQL service needs to be started first!**
