# ExoplanetHub 🪐

A modern web application for exploring confirmed exoplanets using real-time data from NASA's Exoplanet Archive. Built with Next.js and powered by a serverless AWS backend.

## Features

- **Real-time Data**: Automatically syncs with NASA's Exoplanet Archive every 6 hours
- **Interactive Exploration**: Browse and filter thousands of confirmed exoplanets
- **Detailed Information**: View comprehensive data including orbital parameters, stellar characteristics, and discovery details
- **Serverless Architecture**: Scalable AWS infrastructure with DynamoDB and Lambda

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **AWS SDK** - Direct DynamoDB integration
- **Vercel** - Deployment platform

### Backend
- **AWS Lambda** - Serverless compute (Python 3.13)
- **DynamoDB** - NoSQL database with GSIs for efficient querying
- **EventBridge** - Scheduled data synchronization
- **SAM** - Infrastructure as Code
- **GitHub Actions** - CI/CD pipeline

## Project Structure

```
.
├── exoplanethub.com/          # Next.js frontend
│   ├── app/                   # App router pages
│   ├── components/            # React components
│   └── lib/                   # Types and utilities
└── aws-backend/               # Serverless backend
    ├── lambda/
    │   ├── sync/              # NASA data sync function
    │   └── cleanup/           # Database cleanup function
    └── template.yaml          # SAM template
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.13+
- AWS Account
- AWS SAM CLI

### Frontend Setup

```bash
cd exoplanethub.com
pnpm install

# Create .env.local with:
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# EXOPLANETS_DATABASE_TABLE=exoplanets-dev

pnpm dev
```

### Backend Deployment

```bash
cd aws-backend

# Create samconfig.toml with your AWS settings

sam build
sam deploy --guided
```

## Deployment

### Automated Deployments

- **Frontend**: Automatically deploys to Vercel on push to `main`
- **Backend**: Deploy by pushing tags:
  - `dev-aws-backend-*` → dev environment
  - `main-aws-backend-*` → production environment

### GitHub Secrets Required

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Data Source

Exoplanet data is sourced from [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) using their TAP API.

## License

MIT