#!/bin/bash

set -e

npx knex migrate:latest
node build/src/bot.js
