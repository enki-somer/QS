# QS Financial Management System

**نظام الإدارة المالية المتكامل لشركة قصر الشام**

A comprehensive financial management system built for construction companies, featuring role-based access control, real-time financial tracking, and Arabic-first interface design.

## 🏗️ System Overview

The QS Financial Management System provides a complete solution for managing construction projects, treasury operations, human resources, and financial reporting with role-based access control.

### 🎯 Key Features

- **Project Management**: Complete project lifecycle with invoicing and budget tracking
- **Treasury Management**: Real-time cash flow monitoring and transaction history
- **Human Resources**: Employee management with salary calculations
- **General Expenses**: Operational cost tracking with categorization
- **Financial Reports**: Comprehensive analytics and reporting
- **Role-Based Access**: Admin and Data Entry user types with granular permissions
- **Approval Workflow**: Pending approval system for data entry actions

## 🚀 Tech Stack

### Frontend (sham/)

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context API** for state management
- **Lucide React** for icons
- **Arabic-first design** with RTL support

### Backend (backend/)

- **Express.js** with TypeScript
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests
- **Helmet** for security headers
- **Rate limiting** for API protection

## 📁 Project Structure

```
QS/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── types/          # TypeScript type definitions
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Authentication & authorization
│   │   ├── routes/         # API route handlers
│   │   └── server.ts       # Express server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── sham/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React context providers
│   │   ├── lib/          # Utility functions
│   │   └── types/        # TypeScript interfaces
│   ├── public/           # Static assets
│   ├── package.json
│   ├── next.config.ts
│   └── tailwind.config.ts
├── mockUp.md             # Original project specification
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/enki-somer/QS.git
cd QS
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Start development server (port 5000)
```

### 3. Setup Frontend

```bash
cd sham
npm install
npm run dev           # Start development server (port 3000)
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 👥 Default Users

For testing purposes, the system includes default users:

### Admin User

- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: Full system access

### Data Entry User

- **Username**: `dataentry`
- **Password**: `data123`
- **Permissions**: Limited to data entry operations

## 🔐 Role-Based Access Control

### Admin Role

- **Treasury Access**: Full access to SAFE balance and transactions
- **HR Management**: Complete employee lifecycle management
- **Payment Authorization**: Can approve/reject pending items
- **Financial Oversight**: Access to all financial reports and data

### Data Entry Role

- **Project Data Entry**: Create projects and invoices
- **Expense Recording**: Enter general expenses
- **Report Generation**: Generate reports for admin review
- **Restricted Access**: No treasury balance visibility or payment capabilities

## 🏛️ System Architecture

### Frontend Architecture

- **Pages**: Next.js app router with protected routes
- **Components**: Modular, reusable UI components
- **State Management**: React Context API for global state
- **Authentication**: JWT-based with role checking
- **Data Storage**: localStorage for development/testing

### Backend Architecture

- **Authentication**: JWT with role-based permissions
- **Security**: Helmet, CORS, and rate limiting
- **Validation**: Input validation and sanitization
- **Error Handling**: Centralized error management

## 🌟 Key Features in Detail

### Financial Management

- Real-time treasury balance tracking
- Multi-project budget management
- Automated invoice generation with sequential numbering
- Expense categorization and tracking
- Comprehensive financial reporting

### User Experience

- **Arabic-first interface** with proper RTL support
- **Smooth animations** and transitions throughout
- **Mobile-responsive** design
- **Role-based navigation** that adapts to user permissions
- **Real-time notifications** for pending approvals

### Security Features

- **JWT authentication** with secure token management
- **Role-based access control** with granular permissions
- **Input validation** and sanitization
- **CORS protection** and security headers
- **Rate limiting** to prevent abuse

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev        # Development with hot reload
npm run build      # Production build
npm start          # Production server
```

### Frontend Development

```bash
cd sham
npm run dev        # Development server
npm run build      # Production build
npm start          # Production server
npm run lint       # ESLint checking
```

## 📊 Currency & Localization

- **Primary Currency**: Iraqi Dinar (IQD)
- **Number Format**: Arabic numerals with proper formatting
- **Date Format**: Localized Arabic date display
- **Interface Language**: Arabic with RTL support
- **Fallback**: English for technical terms where appropriate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed for Qasr Al-Sham Construction & Real Estate Development Company.

## 📞 Support

For support and inquiries, please contact the development team.

---

**Built with ❤️ for Qasr Al-Sham Construction & Real Estate Development Company**
