import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole, LoginRequest, LoginResponse, AuthenticatedUser, JWTPayload } from '../types';

// In-memory user storage (for testing purposes)
// In production, this should be replaced with a database
const users: User[] = [];

export class UserService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers(): Promise<void> {
    // Clear existing users
    users.length = 0;

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const adminUser: User = {
      id: '1',
      username: 'admin',
      password: adminPasswordHash,
      role: 'admin',
      fullName: 'المدير العام',
      email: 'admin@financial-system.com',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Create data entry user
    const dataEntryPasswordHash = await bcrypt.hash('dataentry123', 12);
    const dataEntryUser: User = {
      id: '2',
      username: 'dataentry',
      password: dataEntryPasswordHash,
      role: 'data_entry',
      fullName: 'موظف إدخال البيانات',
      email: 'dataentry@financial-system.com',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    users.push(adminUser, dataEntryUser);
    console.log('✅ Default users initialized:');
    console.log('   - Admin: username="admin", password="admin123"');
    console.log('   - Data Entry: username="dataentry", password="dataentry123"');
  }

  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, password } = loginRequest;

      // Find user
      const user = users.find(u => u.username === username && u.isActive);
      if (!user) {
        return {
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        };
      }

      // Update last login
      user.lastLogin = new Date().toISOString();

      // Generate JWT token
      const payload: JWTPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
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

  verifyToken(token: string): AuthenticatedUser | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      const user = users.find(u => u.id === decoded.id && u.isActive);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      };
    } catch (error) {
      return null;
    }
  }

  getUserById(id: string): User | null {
    return users.find(u => u.id === id && u.isActive) || null;
  }

  getAllUsers(): Omit<User, 'password'>[] {
    return users
      .filter(u => u.isActive)
      .map(u => {
        const { password, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
  }

  hasRole(user: AuthenticatedUser, requiredRole: UserRole | UserRole[]): boolean {
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  }
}

export const userService = new UserService(); 