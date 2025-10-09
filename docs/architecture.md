# Architecture Overview

ExoplanetHub uses a serverless architecture to deliver real-time exoplanet data from NASA to users worldwide.

## High-Level Flow

```
NASA Exoplanet Archive (TAP API)
          ↓
    EventBridge (every 6 hours)
          ↓
    Lambda Sync Function (Python)
          ↓
    DynamoDB (with GSIs)
          ↓
    Next.js Frontend (Vercel)
          ↓
    User Browser
```

## Components

### Data Ingestion
- **EventBridge Scheduler**: Triggers sync every 6 hours
- **Lambda Sync Function**: Fetches data from NASA TAP API, transforms, and writes to DynamoDB
- **NASA TAP API**: Source of truth for confirmed exoplanet data

### Data Storage
- **DynamoDB Table**: Stores exoplanet records with partition key `pl_name`
- **Global Secondary Indexes (GSIs)**: Enable efficient queries by discovery year, method, and other attributes
- **Lambda Cleanup Function**: Removes stale records not present in latest NASA data

### Frontend
- **Next.js 15**: Server-side rendering and static generation
- **AWS SDK v3**: Direct DynamoDB queries from API routes
- **Vercel Edge Network**: Global CDN for fast page loads
- **TypeScript**: Type-safe data models matching DynamoDB schema

## Data Flow Details

1. **Sync Process**: Lambda queries NASA TAP API → parses CSV response → batch writes to DynamoDB
2. **Query Process**: User request → Next.js API route → DynamoDB scan/query → JSON response → React UI
3. **Cleanup Process**: Lambda compares current DynamoDB items with latest NASA data → deletes orphaned records

## Scalability

- **Serverless**: Auto-scales with traffic, zero maintenance
- **DynamoDB**: On-demand billing, handles thousands of requests/second
- **Vercel**: Global edge caching for static assets and pages
- **EventBridge**: Reliable scheduled execution

## Security

- **IAM Roles**: Least-privilege access for Lambda functions
- **Environment Variables**: Secrets managed via AWS Systems Manager or Vercel
- **No Public APIs**: Frontend queries DynamoDB directly via AWS SDK with scoped credentials
