import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';

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

    // Verify token (just to make sure it's valid)
    jwt.verify(token, jwtSecret);
    
    // Since we're using JWT, we just return success
    // The frontend should remove the token from storage
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
      }),
    };
  } catch (error) {
    // Even if token is invalid, we'll return success for logout
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
      }),
    };
  }
};

export { handler }; 