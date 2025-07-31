import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import { Pool, PoolConfig } from 'pg';

// Database configuration interface
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Environment-based configuration
const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'qs_financial',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  };

  // Production overrides
  if (env === 'production') {
    baseConfig.ssl = true;
    baseConfig.maxConnections = 10; // Lower for production
  }

  return baseConfig;
};

// Create PostgreSQL pool configuration
const createPoolConfig = (): PoolConfig => {
  const config = getDatabaseConfig();
  
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    // Additional PostgreSQL specific settings
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000,
    application_name: 'QS_Financial_System',
  };
};

// Global connection pool
let pool: Pool | null = null;

// Get database connection pool
export const getPool = (): Pool => {
  if (!pool) {
    const poolConfig = createPoolConfig();
    pool = new Pool(poolConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
    
    // Log successful connection
    pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });
  }
  
  return pool;
};

// Close database connection
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Database connection pool closed');
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    console.log('🎯 Database connection test successful:');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Initialize database (run migrations if needed)
export const initializeDatabase = async (): Promise<void> => {
  try {
    const pool = getPool();
    
    // Check if database is already initialized
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (!result.rows[0].exists) {
        console.log('🔧 Database not initialized. Please run the schema.sql file first.');
        console.log('   Command: psql -U username -d database_name -f backend/database/schema.sql');
      } else {
        console.log('✅ Database already initialized');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to check database initialization:', error);
    throw error;
  }
};

export default {
  getPool,
  closePool,
  testConnection,
  initializeDatabase,
  getDatabaseConfig,
}; 