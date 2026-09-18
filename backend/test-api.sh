#!/usr/bin/env bash
set -e

BASE_URL="${BASE_URL:-http://localhost:8081/api}"
EMAIL="${EMAIL:-test@example.com}"
PASSWORD="${PASSWORD:-Password123!}"

echo "== Register =="
curl -sS -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true
echo

echo "== Login =="
LOGIN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN"
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

echo "== Create task =="
curl -sS -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test API","description":"Tâche créée par curl","status":"TODO"}'
echo

echo "== List tasks =="
curl -sS "$BASE_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
echo
