# 🚀 Render Deployment Guide - Surprise Sender

Complete guide to deploy your enterprise-grade Surprise Sender application on Render.

## 📋 Prerequisites

- [Render Account](https://render.com) (Free tier available)
- [GitHub Repository](https://github.com) with your code
- [Google Gemini API Key](https://makersuite.google.com/app/apikey) (for AI features)

## 🎯 Quick Deploy (Recommended)

### Option 1: Blueprint Deploy (Easiest)

1. **Fork/Clone** your repository to GitHub
2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository with Surprise Sender

3. **Configure Environment Variables**:
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   GEMINI_API_KEY=your-gemini-api-key-here
   CORS_ORIGIN=https://your-frontend-domain.onrender.com
   ```

4. **Deploy**:
   - Click "Apply" to deploy all services
   - Render will automatically create:
     - API Service (Backend)
     - Frontend Service (Static)
     - PostgreSQL Database

### Option 2: Manual Deploy

#### Step 1: Create Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `surprise-sender-db`
   - **Database**: `surprise_sender`
   - **User**: `surprise_sender_user`
   - **Plan**: `Starter` (Free)

4. **Copy the connection string** for later use

#### Step 2: Deploy Backend API

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `surprise-sender-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Starter` (Free)

4. **Environment Variables**:
   ```bash
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   DATABASE_URL=postgresql://username:password@host:port/database
   GEMINI_API_KEY=your-gemini-api-key-here
   CORS_ORIGIN=https://your-frontend-domain.onrender.com
   ```

5. **Health Check Path**: `/api/health`

#### Step 3: Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `surprise-sender-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: `Free`

4. **Environment Variables**:
   ```bash
   VITE_API_URL=https://your-api-domain.onrender.com
   ```

## 🔧 Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000
VITE_API_URL=https://your-api-domain.onrender.com

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
CORS_ORIGIN=https://your-frontend-domain.onrender.com

# AI Services
GEMINI_API_KEY=your-gemini-api-key-here
```

### Optional Variables

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
LOG_LEVEL=info
ENABLE_LOGGING=true
ENABLE_METRICS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## 🗄️ Database Setup

### Automatic Setup (Recommended)

The application will automatically:
- Run migrations on startup
- Create all necessary tables
- Set up indexes and foreign keys

### Manual Setup (If needed)

1. **Access Database**:
   - Go to your PostgreSQL service in Render
   - Click "Connect" → "External Database"
   - Use a PostgreSQL client (pgAdmin, DBeaver, etc.)

2. **Run Migrations**:
   ```bash
   # In your local environment
   npm run migration:run
   ```

## 🔍 Health Checks

### API Health Check

The API includes a health check endpoint:
```
GET https://your-api-domain.onrender.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Frontend Health Check

The frontend will automatically redirect API calls to the backend.

## 📊 Monitoring

### Render Dashboard

- **Logs**: View real-time application logs
- **Metrics**: Monitor CPU, memory, and network usage
- **Events**: Track deployments and errors

### Application Monitoring

- **Health Checks**: Automatic health monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance**: Real-time performance metrics

## 🔒 Security

### SSL/TLS

Render automatically provides SSL certificates for all services.

### Environment Variables

- All sensitive data is stored as environment variables
- Never commit secrets to your repository
- Use Render's secure environment variable storage

### CORS Configuration

Configure CORS to allow only your frontend domain:
```bash
CORS_ORIGIN=https://your-frontend-domain.onrender.com
```

## 🚀 Scaling

### Automatic Scaling

- **Free Tier**: 750 hours/month
- **Starter Plan**: $7/month, always on
- **Professional Plan**: $25/month, auto-scaling

### Manual Scaling

1. **Upgrade Plan**: Go to service settings
2. **Increase Resources**: CPU, memory, disk
3. **Add Instances**: For high availability

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Build command fails
**Solution**: Check package.json scripts and dependencies

#### 2. Database Connection

**Problem**: Cannot connect to database
**Solution**: Verify DATABASE_URL and network access

#### 3. Environment Variables

**Problem**: Variables not available
**Solution**: Check variable names and restart service

#### 4. CORS Errors

**Problem**: Frontend can't access API
**Solution**: Verify CORS_ORIGIN configuration

### Debug Commands

```bash
# Check logs
render logs --service surprise-sender-api

# Check environment
render env --service surprise-sender-api

# Restart service
render restart --service surprise-sender-api
```

## 📈 Performance Optimization

### Frontend Optimization

- **Code Splitting**: Automatic with Vite
- **Compression**: Enabled by default
- **Caching**: Static assets cached

### Backend Optimization

- **Connection Pooling**: Database connections optimized
- **Caching**: Validation results cached
- **Compression**: Response compression enabled

## 🔄 Continuous Deployment

### Automatic Deployments

- **GitHub Integration**: Automatic deploys on push
- **Branch Deployments**: Deploy from specific branches
- **Preview Deployments**: Test changes before production

### Manual Deployments

1. **Trigger Deploy**: Click "Manual Deploy" in Render
2. **Clear Cache**: Option to clear build cache
3. **Rollback**: Revert to previous deployment

## 📞 Support

### Render Support

- **Documentation**: [docs.render.com](https://docs.render.com)
- **Community**: [community.render.com](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com)

### Application Support

- **Health Check**: `/api/health`
- **Logs**: Available in Render dashboard
- **Metrics**: Real-time performance data

## 🎉 Success!

Once deployed, your Surprise Sender application will be available at:

- **Frontend**: `https://your-frontend-domain.onrender.com`
- **API**: `https://your-api-domain.onrender.com`
- **Health Check**: `https://your-api-domain.onrender.com/api/health`

### Next Steps

1. **Test the Application**: Verify all features work
2. **Configure SMTP**: Set up email sending
3. **Add Users**: Create admin and user accounts
4. **Monitor Performance**: Watch logs and metrics
5. **Scale as Needed**: Upgrade plans for growth

---

**🎯 Your enterprise-grade Surprise Sender is now live on Render!**