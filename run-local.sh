#!/usr/bin/env bash
set -e

echo "1) Démarrage de MySQL, backend et frontend..."
docker compose up --build
