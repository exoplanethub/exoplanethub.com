# ExoplanetHub AI Coding Instructions

## Architecture Overview

ExoplanetHub is a **dual-repo serverless application** with strict separation:
- `exoplanethub.com/` - Next.js 15 frontend (Vercel deployment)  
- `aws-backend/` - Python Lambda functions + DynamoDB (AWS SAM)

**Critical**: Frontend directly queries DynamoDB via AWS SDK, no REST API layer between them.

## Data Flow & Key Components

```
NASA TAP API → Lambda Sync (every 6 hours) → DynamoDB → Next.js API Routes → React Components
```

### DynamoDB Schema
- **Table**: `exoplanets-{env}` with partition key `pl_name`
- **GSIs**: `habitability-index`, `year-index` for efficient queries
- **Data Source**: NASA Exoplanet Archive TAP API (confirmed planets only: `default_flag=1`)

### Frontend Patterns
- **API Routes**: Use `@aws-sdk/lib-dynamodb` directly in `/app/api/planets/route.ts`
- **Components**: Modular CSS modules (`.module.css`) with theme CSS variables
- **Theming**: Centralized in `/lib/theme.ts` with JSON config in `/theme/theme.json`
- **Types**: Planet interface in `/lib/mockPlanets.ts` (despite name, contains real types)

## Development Workflows

### Frontend (exoplanethub.com/)
```bash
cd exoplanethub.com
pnpm dev          # Uses Turbopack for fast dev
pnpm build        # Production build
```

### Backend (aws-backend/)
```bash
cd aws-backend
sam build                           # Build Lambda functions
sam local start-api                 # Local testing with SAM CLI
sam deploy --config-env dev         # Manual deploy (local dev only)
```

**Note**: Manual SAM deploys are for local development/testing. Production uses GitHub Actions.

### Deployment Strategy
- **Frontend**: Auto-deploy via Vercel on push to main branch
- **Backend**: Automated via GitHub Actions (`.github/workflows/deploy-aws-backend.yml`)
  - **Dev environment**: Push tag `dev-aws-backend-x.x.x`
  - **Prod environment**: Push tag `main-aws-backend-x.x.x`
  - Uses OIDC (no long-lived credentials) with `AWS_ROLE_ARN` secret

## Code Conventions

### Component Structure
- Components in `/components/{feature}/` with co-located CSS modules
- Client components marked with `'use client'` directive
- Props interfaces defined inline or imported from `/lib/mockPlanets.ts`

### Environment Variables
- **Frontend**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EXOPLANETS_DATABASE_TABLE`
- **Backend**: `TABLE_NAME` (auto-injected by SAM)

### CSS & Styling
- CSS custom properties from theme system (e.g., `var(--color-primary)`)
- Mobile-first responsive design with CSS Grid/Flexbox
- Font variables: `var(--font-inter)`, `var(--font-poppins)`

## Critical Integration Points

### NASA Data Sync
- Lambda function queries TAP API with specific column selection
- **Data transformation**: Converts null values using `to_decimal()` helper
- **Batch writes**: Uses DynamoDB batch writer for performance
- **Schedule**: EventBridge triggers every 6 hours

### Frontend-Backend Communication
- No REST API layer - frontend uses AWS SDK directly
- **Caching**: API routes use `revalidate = 21600` (6 hours)
- **Error handling**: Client-side loading states for async data fetching

## Testing & Debugging

### Backend Testing
- Test files in `/aws-backend/tests/`
- Local testing: `sam local start-api`
- CloudWatch logs: Function name pattern `exoplanet-data-sync-{env}`

### Frontend Development
- Mock data available in production for fallback scenarios
- Use browser dev tools Network tab to debug DynamoDB queries
- Vercel deployment previews for testing

## Contributing & Development Process

### Pull Request Workflow
- Fork and create feature branches: `feature/your-feature-name`
- Keep changes focused and atomic
- Test locally before pushing (both frontend and backend if applicable)
- Reference `CONTRIBUTING.md` for detailed guidelines

### Testing Changes
- **Frontend**: Run `pnpm dev` and test in browser
- **Backend**: Use `sam local start-api` to test Lambda functions locally
- **Integration**: Ensure API routes still work with any Lambda changes

### Branch Protection
- `main` branch is protected and auto-deploys to production
- All changes require pull requests
- GitHub Actions must pass before merge

## Common Gotchas

- **DynamoDB Decimals**: All numeric values must use `Decimal` type in Python Lambda
- **Turbopack**: Used for both dev and build - don't use webpack-specific configs
- **Environment switching**: Table names include environment suffix (`-dev`, `-main`)
- **Component imports**: Use `@/` alias for absolute imports from project root