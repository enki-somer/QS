import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  username: string;
  role: 'admin' | 'data_entry';
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
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
    // Extract token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'لم يتم توفير رمز المصادقة',
        }),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'لا تملك صلاحية للوصول إلى هذا المورد',
        }),
      };
    }

    // Return hardcoded users (without passwords)
    const users = [
      {
        id: '1',
        username: 'admin',
        role: 'admin' as const,
        fullName: 'المدير العام',
        email: 'admin@financial-system.com',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        username: 'dataentry',
        role: 'data_entry' as const,
        fullName: 'موظف إدخال البيانات',
        email: 'dataentry@financial-system.com',
        isActive: true,
        createdAt: new Date().toISOString(),
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users,
      }),
    };
  } catch (error) {
    console.error('Users error:', error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'رمز المصادقة غير صالح',
      }),
    };
  }
};

export { handler }; 