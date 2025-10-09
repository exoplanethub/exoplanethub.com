# Contributing to ExoplanetHub

Thanks for your interest in contributing! We welcome contributions of all kinds.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/exoplanethub.com.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test locally (see README for setup)
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Frontend
```bash
cd exoplanethub.com
pnpm install
pnpm dev
```

### Backend
```bash
cd aws-backend
sam build
sam local start-api
```

## Pull Request Guidelines

- Keep changes focused and atomic
- Update documentation if needed
- Follow existing code style
- Test your changes locally
- Reference related issues in PR description

## Reporting Issues

Use GitHub Issues to report bugs or suggest features. Include:
- Clear description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

## Code Style

- **Frontend**: Follow TypeScript/React best practices, use existing ESLint config
- **Backend**: Follow PEP 8 for Python code
- Use meaningful variable names
- Add comments for complex logic

## Questions?

Open a discussion or issue—we're happy to help!
