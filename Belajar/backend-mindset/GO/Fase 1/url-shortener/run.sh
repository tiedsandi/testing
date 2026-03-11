#!/bin/bash

echo "🚀 Starting URL Shortener API with Docker Compose..."
echo ""

# Stop dan hapus container lama jika ada
echo "🧹 Cleaning up old containers..."
docker-compose down 2>/dev/null

# Build dan start semua services
echo ""
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait sedikit untuk services start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Show status
echo ""
echo "📊 Services Status:"
docker-compose ps

echo ""
echo "✅ Application is ready!"
echo ""
echo "🌐 API URL: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3000/health"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart"
echo ""
echo "🧪 Test the API:"
echo "  curl http://localhost:3000/health"
echo ""
