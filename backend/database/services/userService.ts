import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config';
import { User, UserRole, LoginRequest, LoginResponse, AuthenticatedUser, JWTPayload } from '../../src/types';

export class DatabaseUserService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers(): Promise<void> {
    try {
      const pool = getPool();
      
      // Check if admin user exists
      const existingAdmin = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        ['admin']
      );

      if (existingAdmin.rows.length === 0) {
        console.log('🔧 Creating default admin user...');
        
        // Create admin user with clean simple name
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        await pool.query(`
          INSERT INTO users (username, password_hash, role, full_name, email, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['admin', adminPasswordHash, 'admin', 'Administrator', 'admin@company.com', true]);

        // Create data entry user with clean simple name
        const dataEntryPasswordHash = await bcrypt.hash('dataentry123', 12);
        await pool.query(`
          INSERT INTO users (username, password_hash, role, full_name, email, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['dataentry', dataEntryPasswordHash, 'data_entry', 'Data Entry User', 'dataentry@company.com', true]);

        console.log('✅ Default users created in database:');
        console.log('   - Admin: username="admin", password="admin123"');
        console.log('   - Data Entry: username="dataentry", password="dataentry123"');
      } else {
        console.log('✅ Default users already exist in database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize database users:', error);
    }
  }

  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, password } = loginRequest;
      const pool = getPool();

      // Find user in database
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 AND is_active = true',
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        return {
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        };
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const payload: JWTPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
      } as jwt.SignOptions);

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
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء تسجيل الدخول',
      };
    }
  }

  async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      const pool = getPool();
      
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
      );
      
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
    } catch (error) {
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      
      const user = result.rows[0];
      return user || null;
    } catch (error) {
      return null;
    }
  }

  hasRole(user: AuthenticatedUser, requiredRole: UserRole | UserRole[]): boolean {
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  }
}

export const databaseUserService = new DatabaseUserService();