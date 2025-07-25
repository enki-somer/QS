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
    
    // Mock user data (since we don't have a database)
    const userData = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      fullName: decoded.role === 'admin' ? 'المدير العام' : 'موظف إدخال البيانات',
      email: decoded.role === 'admin' ? 'admin@financial-system.com' : 'dataentry@financial-system.com',
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: userData,
        message: 'الرمز صالح',
      }),
    };
  } catch (error) {
    console.error('Verify error:', error);
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