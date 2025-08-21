#!/bin/bash

# Surprise Sender Production Build Script
echo "🚀 Building Surprise Sender for production..."

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Starting production build..."

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf server/dist/
rm -rf node_modules/
rm -rf server/node_modules/

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci --only=production

print_status "Installing backend dependencies..."
cd server && npm ci --only=production && cd ..

# Build frontend
print_status "Building frontend..."
npm run build

# Build backend
print_status "Building backend..."
cd server && npm run build && cd ..

# Create production directory structure
print_status "Creating production structure..."
mkdir -p production/
cp -r dist/ production/frontend/
cp -r server/dist/ production/backend/
cp -r server/node_modules/ production/backend/
cp server/package.json production/backend/
cp package.json production/

# Copy necessary files
print_status "Copying configuration files..."
cp .env.example production/
cp render.yaml production/
cp Dockerfile production/
cp .dockerignore production/

# Create production start script
cat > production/start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Surprise Sender in production mode..."

# Start backend
cd backend && npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Check if backend is running
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Keep the script running
wait $BACKEND_PID
EOF

chmod +x production/start.sh

# Create health check script
cat > production/health-check.sh << 'EOF'
#!/bin/bash
# Health check for the application
curl -f http://localhost:3000/api/health || exit 1
EOF

chmod +x production/health-check.sh

print_status "Build completed successfully!"
print_status "Production files are in the 'production/' directory"

# Show build summary
echo ""
echo "📦 Build Summary:"
echo "=================="
echo "Frontend: $(du -sh production/frontend | cut -f1)"
echo "Backend:  $(du -sh production/backend | cut -f1)"
echo "Total:    $(du -sh production | cut -f1)"
echo ""

print_status "Ready for deployment! 🚀"