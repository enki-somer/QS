"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.testConnection = exports.closePool = exports.getPool = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pg_1 = require("pg");
const getDatabaseConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    const baseConfig = {
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
    if (env === 'production') {
        baseConfig.ssl = true;
        baseConfig.maxConnections = 10;
    }
    return baseConfig;
};
const createPoolConfig = () => {
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
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'QS_Financial_System',
    };
};
let pool = null;
const getPool = () => {
    if (!pool) {
        const poolConfig = createPoolConfig();
        pool = new pg_1.Pool(poolConfig);
        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
        pool.on('connect', () => {
            console.log('✅ Connected to PostgreSQL database');
        });
    }
    return pool;
};
exports.getPool = getPool;
const closePool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('🔌 Database connection pool closed');
    }
};
exports.closePool = closePool;
const testConnection = async () => {
    try {
        const pool = (0, exports.getPool)();
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        client.release();
        console.log('🎯 Database connection test successful:');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
const initializeDatabase = async () => {
    try {
        const pool = (0, exports.getPool)();
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
            }
            else {
                console.log('✅ Database already initialized');
            }
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ Failed to check database initialization:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
exports.default = {
    getPool: exports.getPool,
    closePool: exports.closePool,
    testConnection: exports.testConnection,
    initializeDatabase: exports.initializeDatabase,
    getDatabaseConfig,
};
//# sourceMappingURL=config.js.map