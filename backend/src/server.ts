import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import safeRoutes from './routes/safe';
import contractorRoutes from './routes/contractors';
import projectRoutes from './routes/projects';
import { testConnection, initializeDatabase } from '../database/config';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً',
  },
});

app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام الإدارة المالية - الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/safe', safeRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);

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