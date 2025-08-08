# CORS Configuration Guide

## Development vs Production

### Development (Current)

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000`
- **CORS**: Allow all localhost origins

### Production Setup

#### Option 1: Same Domain Deployment

```
Frontend: https://yourdomain.com
Backend:  https://yourdomain.com/api
CORS:     Not needed (same origin)
```

#### Option 2: Subdomain Deployment

```
Frontend: https://app.yourdomain.com
Backend:  https://api.yourdomain.com
CORS:     Configure specific origins
```

## Environment Variables

### Development (.env)

```env
NODE_ENV=development
PORT=8000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

## Testing CORS

### Browser Test

1. Open Network tab in DevTools
2. Check for:
   - ✅ Status 200 (not 0 or failed)
   - ✅ Response headers include `Access-Control-Allow-Origin`
   - ✅ No CORS errors in console

### Command Line Test

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8000/api/contractors
```

## Troubleshooting

1. **Check backend is running**: Visit `http://localhost:8000/health`
2. **Verify CORS headers**: Use browser DevTools Network tab
3. **Check console errors**: Look for specific CORS messages
4. **Test with curl**: Bypass browser CORS entirely
5. **Restart both servers**: Sometimes needed after config changes

## Production Deployment

### Netlify/Vercel Frontend + Railway/Heroku Backend

```env
# Frontend environment variable
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Backend environment variable
CORS_ORIGIN=https://your-frontend.netlify.app
```

### Same-Origin Deployment (Recommended)

Use a reverse proxy to serve both frontend and backend from the same domain:

```nginx
# nginx.conf
location / {
    proxy_pass http://frontend:3000;
}

location /api {
    proxy_pass http://backend:8000;
}
```
