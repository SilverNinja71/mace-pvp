#!/usr/bin/env bash
# Spear-Mace PVP - Quick Start Script

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Starting Spear-Mace PVP..."

if command -v python3 &> /dev/null; then
    python3 server.py
elif command -v open &> /dev/null; then
    open index.html
else
    echo "Please open index.html in your web browser."
fi
