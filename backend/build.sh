#!/usr/bin/env bash
set -o errexit  # exit on error

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt || pip install -e .

# Collect static files (safe even if unused now)
python manage.py collectstatic --noinput
