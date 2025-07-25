import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'data_entry';
  fullName: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface JWTPayload {
  id: string;
  username: string;
  role: 'admin' | 'data_entry';
}

// Hardcoded users for testing (same as your backend)
const initializeUsers = async (): Promise<User[]> => {
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const dataEntryPasswordHash = await bcrypt.hash('dataentry123', 12);

  return [
    {
      id: '1',
      username: 'admin',
      password: adminPasswordHash,
      role: 'admin',
      fullName: 'المدير العام',
      email: 'admin@financial-system.com',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'dataentry',
      password: dataEntryPasswordHash,
      role: 'data_entry',
      fullName: 'موظف إدخال البيانات',
      email: 'dataentry@financial-system.com',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed',
      }),
    };
  }

  try {
    const loginRequest: LoginRequest = JSON.parse(event.body || '{}');
    
    // Validate input
    if (!loginRequest.username || !loginRequest.password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'يجب توفير اسم المستخدم وكلمة المرور',
        }),
      };
    }

    const users = await initializeUsers();
    const { username, password } = loginRequest;

    // Find user
    const user = users.find(u => u.username === username && u.isActive);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        }),
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        }),
      };
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء تسجيل الدخول',
      }),
    };
  }
};

export { handler }; 