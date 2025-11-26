#!/bin/bash
set -e

echo "Starting deployment..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Build frontend
echo "Building frontend..."
npm run build

# Build backend
echo "Building backend..."
npm run server:build

# Run migrations
echo "Running database migrations..."
cd server
npm run migration:run
cd ..

# Seed the database
echo "Seeding the database..."
cd server
npm run seed
cd ..

# Start the application
echo "Starting the application..."
npm run start:prod

echo "Deployment finished."
