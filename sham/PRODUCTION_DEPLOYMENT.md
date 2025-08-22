# 🚀 Production Deployment Guide - QS Financial Management System

## 🔒 Security Checklist ✅

### **1. Environment Configuration**

- [ ] Update `sham/.env.production` with your actual domain
- [ ] Set `NEXT_PUBLIC_API_URL=https://your-domain.com/api`
- [ ] Ensure `NODE_ENV=production`
- [ ] Verify HTTPS is enforced

### **2. Backend Security**

- [ ] Update backend CORS settings for production domain
- [ ] Ensure JWT_SECRET is strong and unique
- [ ] Set proper JWT expiration (recommended: 24 hours)
- [ ] Enable rate limiting on login endpoints
- [ ] Configure HTTPS redirects

### **3. Frontend Security**

- [ ] Remove all demo credentials ✅
- [ ] Strong password validation (8+ chars, mixed case, numbers) ✅
- [ ] Security headers configured ✅
- [ ] HTTPS enforcement ✅
- [ ] Rate limiting on login attempts ✅

### **4. User Management**

- [ ] Create production user accounts (admin, data_entry, partners)
- [ ] Set strong passwords for each user
- [ ] Verify role permissions are correct
- [ ] Test each user role functionality

## 🛠️ Deployment Steps

### **Step 1: Update Environment Variables**

```bash
# In sham/.env.production
NEXT_PUBLIC_API_URL=https://your-actual-domain.com/api
NODE_ENV=production
NEXT_PUBLIC_ENFORCE_HTTPS=true
```

### **Step 2: Build Frontend**

```bash
cd sham
npm run build
npm run export  # If using static export
```

### **Step 3: Deploy Backend**

```bash
cd backend
npm run build
pm2 start npm --name "backend" -- start
```

### **Step 4: Configure Domain**

- Point your domain to your VPS
- Set up SSL certificate (Let's Encrypt recommended)
- Configure reverse proxy (Nginx/Apache)

### **Step 5: Test Production**

- [ ] Test login with each user role
- [ ] Verify permissions work correctly
- [ ] Check HTTPS enforcement
- [ ] Test API endpoints
- [ ] Verify security headers

## 🔐 User Roles & Permissions

### **Admin User**

- **Username:** admin
- **Permissions:** Full access to everything
- **Use Case:** System administration, full financial control

### **Data Entry User**

- **Username:** dataentry
- **Permissions:** Can enter data, cannot see SAFE or make payments
- **Use Case:** Invoice entry, expense recording, report generation

### **Partners User**

- **Username:** partners
- **Permissions:** View-only access, can see SAFE balance
- **Use Case:** Financial reporting, project monitoring

## 🚨 Security Features Implemented

### **Frontend Security**

- ✅ Strong password validation (8+ chars, mixed case, numbers)
- ✅ Rate limiting on login attempts (5 attempts per 15 minutes)
- ✅ HTTPS enforcement in production
- ✅ Security headers (X-Frame-Options, CSP, HSTS)
- ✅ Token expiration handling
- ✅ Secure token storage with expiration

### **Backend Security**

- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Permission middleware
- ✅ CORS configuration
- ✅ Input validation

## 📱 PWA Features

- ✅ Service Worker for offline capability
- ✅ App manifest for mobile installation
- ✅ Caching strategies for performance
- ✅ Production-ready configuration

## 🔍 Monitoring & Maintenance

### **Log Monitoring**

```bash
# Check backend logs
pm2 logs backend

# Check frontend errors
# Monitor browser console in production
```

### **Security Updates**

- Regularly update dependencies
- Monitor for security vulnerabilities
- Keep SSL certificates current
- Review access logs

### **Backup Strategy**

- Database backups (daily)
- Code repository backups
- Configuration backups
- User data backups

## 🆘 Troubleshooting

### **Common Issues**

1. **CORS Errors:** Check backend CORS configuration
2. **Authentication Failures:** Verify JWT_SECRET and token expiration
3. **Permission Denied:** Check user role assignments
4. **HTTPS Issues:** Ensure SSL certificate is valid

### **Emergency Access**

If you lose access to admin account:

1. Access database directly
2. Reset admin password hash
3. Update user table with new credentials

## 📞 Support

For production issues:

1. Check logs first
2. Verify environment configuration
3. Test with different user roles
4. Check network connectivity

---

**⚠️ IMPORTANT:** Never commit `.env.production` to version control. Keep production credentials secure and separate from development.
