# 🗄️ Database Setup - PostgreSQL Migration

**نظام الإدارة المالية المتكامل لشركة قصر الشام**

This document guides you through setting up PostgreSQL database for the Backend API server.

## 📋 Prerequisites

- PostgreSQL 12+ installed
- Node.js 18+ installed
- Access to your PostgreSQL instance

## 🚀 Quick Setup

### 1. Install PostgreSQL (if needed)

**Windows:**

```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql
```

**macOS:**

```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE qs_financial;
CREATE USER qs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE qs_financial TO qs_user;

# Exit PostgreSQL
\q
```

### 3. Configure Environment

```bash
# Copy environment template (in backend directory)
cp .env.example .env

# Edit the .env file with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qs_financial
DB_USER=qs_user
DB_PASSWORD=your_secure_password
```

### 4. Run Database Schema

```bash
# Apply the database schema (from backend directory)
psql -h localhost -U qs_user -d qs_financial -f database/schema.sql
```

### 5. Install Dependencies

```bash
# Navigate to the backend directory
cd backend

# Install PostgreSQL dependencies
npm install pg @types/pg

# Or install all dependencies
npm install
```

## 🛠️ Project Structure

```
backend/
├── database/
│   ├── schema.sql          # Complete database schema
│   ├── config.ts           # Database connection configuration
│   ├── types.ts            # TypeScript interface definitions
│   └── services/
│       └── safeService.ts  # Safe/Treasury service layer
├── src/
│   ├── server.ts           # Express server
│   ├── types/              # API type definitions
│   ├── services/           # Business logic services
│   ├── middleware/         # Auth & security middleware
│   └── routes/             # API route handlers
├── .env.example            # Environment variables template
├── DATABASE_SETUP.md       # This file
└── package.json            # Dependencies and scripts
```

## 🔧 Testing Connection

After setup, test your database connection:

```bash
# From backend directory
npm run test-db
```

Or manually:

```bash
node -e "
const { testConnection } = require('./database/config');
testConnection().then(success => {
  console.log('Connection test:', success ? 'PASSED' : 'FAILED');
  process.exit(success ? 0 : 1);
});
"
```

## 🎯 Next Steps

1. **Ensure backend is running** with database connection
2. **Start the backend server**: `npm run dev`
3. **Update the frontend** to use API endpoints instead of localStorage
4. **Test all Safe functionality** works with PostgreSQL
5. **Migrate other modules** (Projects, Employees, Expenses)

## 📊 Current Implementation

The Safe system has been fully migrated to PostgreSQL with:

- ✅ **SafeService** - Complete CRUD operations
- ✅ **Transaction Management** - Balance tracking with ACID transactions
- ✅ **Data Validation** - Type-safe operations
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Performance** - Optimized queries with indexes

### Safe API Methods:

- `getSafeState()` - Get current balance and totals
- `addFunding()` - Add money to treasury
- `deductForInvoice()` - Process invoice payments
- `deductForSalary()` - Process salary payments
- `deductForExpense()` - Process expense payments
- `getTransactionHistory()` - Retrieve transaction history with filters
- `hasBalance()` - Check sufficient funds
- `getSafeSummary()` - Get summary statistics

## 🔐 Security

- All queries use parameterized statements (SQL injection protection)
- Connection pooling with limits
- Transaction rollback on errors
- Audit logging for all operations

---

**Database is now ready for the Safe system! Next: Update frontend to use API calls.**
