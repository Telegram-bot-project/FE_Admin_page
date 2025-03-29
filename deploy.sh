#!/bin/bash

# TeleBot Deployment Script
# This script builds and deploys the TeleBot dashboard application

echo "🚀 Starting TeleBot deployment process..."

# Check if DISTRIBUTION_ID environment variable is set
if [ -z "${DISTRIBUTION_ID}" ]; then
  echo "⚠️ CloudFront DISTRIBUTION_ID not set. Please set it with:"
  echo "export DISTRIBUTION_ID=your-distribution-id"
  read -p "Enter your CloudFront distribution ID now (leave empty to skip CloudFront deployment): " DISTRIBUTION_ID
fi

# Check if S3_BUCKET environment variable is set
if [ -z "${S3_BUCKET}" ]; then
  echo "⚠️ S3_BUCKET not set. Please set it with:"
  echo "export S3_BUCKET=your-bucket-name"
  read -p "Enter your S3 bucket name now (default: telebot-dashboard): " S3_BUCKET
  S3_BUCKET=${S3_BUCKET:-telebot-dashboard}
fi

# Make sure we have the latest changes
echo "📦 Fetching latest code..."
git pull

# Install dependencies
echo "🔧 Installing dependencies..."
npm install --production

# Build the application
echo "🏗️ Building for production..."
npm run build:prod

# Deploy to CloudFront (if AWS CLI is configured)
if command -v aws &> /dev/null; then
  echo "☁️ Deploying to AWS S3 bucket: ${S3_BUCKET}"
  
  # Upload to S3
  aws s3 sync dist/ s3://${S3_BUCKET}/ --delete
  
  # Invalidate CloudFront cache if DISTRIBUTION_ID is set
  if [ ! -z "${DISTRIBUTION_ID}" ]; then
    echo "🔄 Invalidating CloudFront cache for distribution: ${DISTRIBUTION_ID}"
    aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"
    echo "✅ Deployment to CloudFront complete!"
  else
    echo "⚠️ CloudFront invalidation skipped (no distribution ID provided)"
  fi
else
  echo "⚠️ AWS CLI not found. Manual deployment needed."
  echo "✅ Build is located in the 'dist' directory."
fi

echo "✨ Deployment process complete!" 