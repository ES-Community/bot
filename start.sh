#!/bin/bash

set -e

mkdir -p data
npx knex migrate:latest
node build/src/bot.js
