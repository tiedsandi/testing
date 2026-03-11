#!/bin/bash

echo "🐘 Starting PostgreSQL container..."
docker run --name postgres-shortener \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=url_shortener \
  -p 5432:5432 \
  -d postgres:15-alpine

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "✅ PostgreSQL is ready!"
echo ""
echo "Database connection info:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo "  Password: postgres"
echo "  Database: url_shortener"
