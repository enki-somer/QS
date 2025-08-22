"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseUserService = exports.DatabaseUserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class DatabaseUserService {
    jwtSecret;
    jwtExpiresIn;
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        this.initializeDefaultUsers();
    }
    async initializeDefaultUsers() {
        try {
            const pool = (0, config_1.getPool)();
            const existingAdmin = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
            if (existingAdmin.rows.length === 0) {
                console.log('🔧 Creating default admin user...');
                const adminPasswordHash = await bcryptjs_1.default.hash('admin123', 12);
                await pool.query(`
          INSERT INTO users (username, password_hash, role, full_name, email, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['admin', adminPasswordHash, 'admin', 'Administrator', 'admin@company.com', true]);
                const dataEntryPasswordHash = await bcryptjs_1.default.hash('dataentry123', 12);
                await pool.query(`
          INSERT INTO users (username, password_hash, role, full_name, email, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['dataentry', dataEntryPasswordHash, 'data_entry', 'Data Entry User', 'dataentry@company.com', true]);
                console.log('✅ Default users created in database:');
                console.log('   - Admin: username="admin", password="admin123"');
                console.log('   - Data Entry: username="dataentry", password="dataentry123"');
            }
            else {
                console.log('✅ Default users already exist in database');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize database users:', error);
        }
    }
    async login(loginRequest) {
        try {
            const { username, password } = loginRequest;
            const pool = (0, config_1.getPool)();
            const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
            const user = result.rows[0];
            if (!user) {
                return {
                    success: false,
                    message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
                };
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
                };
            }
            await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            const payload = {
                id: user.id,
                username: user.username,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
                expiresIn: this.jwtExpiresIn,
            });
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                    email: user.email,
                },
                token,
                message: 'تم تسجيل الدخول بنجاح',
            };
        }
        catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'حدث خطأ أثناء تسجيل الدخول',
            };
        }
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            const pool = (0, config_1.getPool)();
            const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
            const user = result.rows[0];
            if (!user) {
                return null;
            }
            return {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name,
                email: user.email,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getUserById(id) {
        try {
            const pool = (0, config_1.getPool)();
            const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [id]);
            const user = result.rows[0];
            return user || null;
        }
        catch (error) {
            return null;
        }
    }
    hasRole(user, requiredRole) {
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        return user.role === requiredRole;
    }
}
exports.DatabaseUserService = DatabaseUserService;
exports.databaseUserService = new DatabaseUserService();
//# sourceMappingURL=userService.js.map