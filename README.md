# Clash of Clans Clan War Recommender (WIP)
A tool to identify your clan’s most valuable attackers in Clash of Clans by tracking war participation and performance. The website pulls current war data from the Clash of Clans API, stores history in DynamoDB, and provides recommendations on who is the most effective.

Status: Work in Progress

## Why
In clan wars, players get two attacks, and the game makes it hard to track who consistently uses both and delivers the most value. This project:
- Aggregates war participation and performance
- Stores per-player, per-clan history
- Provides recommendations on who to prioritize for war attacks

## Usage Tips
- Run a “clan update” before starting a war so the previous war’s data is stored

## Features
- Pull current war data from the Clash of Clans API
- Store player war history by clan in DynamoDB
- REST endpoints for recommendations and history updates
- Single page Vite-powered frontend to visualize recommendations
- Serverless deployment on AWS

## Roadmap
- Public deployment (planned: Vercel for frontend)
- Auth and rate limiting
- Better UI for filtering and per-clan views

## Tech Stack
- Frontend:
  - JavaScript (Vite), HTML, CSS
- Backend (Serverless on AWS):
  - AWS Lambda (Python)
  - Amazon API Gateway
  - Amazon DynamoDB
  - VPC for networking
- Integrations:
  - Clash of Clans API
 



