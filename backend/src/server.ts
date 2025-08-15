import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import safeRoutes from './routes/safe';
import contractorRoutes from './routes/contractors';
import projectRoutes from './routes/projects';
import categoryInvoiceRoutes from './routes/categoryInvoices';
import generalExpenseRoutes from './routes/generalExpenses';
import { testConnection, initializeDatabase } from '../database/config';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'];

// Security middleware
app.use(helmet());

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً',
  },
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS',
});

app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost on any port for development
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly - apply before rate limiting
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (public - no auth required)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام الإدارة المالية - الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Public API status endpoint (no auth required)
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin || 'no-origin',
      allowed: 'localhost development'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/safe', safeRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/category-invoices', categoryInvoiceRoutes);
app.use('/api/general-expenses', generalExpenseRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ في الخادم',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار المطلوب غير موجود',
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }
    
    // Initialize database
    await initializeDatabase();

// Start server
app.listen(PORT, () => {
  console.log('🚀 Financial Management System Backend');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 CORS enabled for: ${CORS_ORIGIN}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`💰 Safe API: http://localhost:${PORT}/api/safe`);
      console.log(`👥 Contractors API: http://localhost:${PORT}/api/contractors`);
  console.log('');
});
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app; 