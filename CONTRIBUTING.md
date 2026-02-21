# Contributing to EcoTronics

Thank you for your interest in contributing to EcoTronics! This document provides guidelines and instructions for contributing to the project.

## 🎯 Project Vision

EcoTronics is a local-first carbon emission monitoring platform that serves four distinct user roles:
- 🚗 Vehicle Owners
- ⚡ Generator Owners
- 🏭 Industry Owners
- 🏛️ City Administrators

Our mission is to make emission tracking accessible, accurate, and actionable.

## 📋 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender identity and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race
- Ethnicity
- Age
- Religion
- Nationality

### Our Standards

**Positive behaviors include**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behaviors include**:
- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## 🚀 Getting Started

### Prerequisites

1. Read the documentation:
   - `README.md` - Project overview
   - `PHASE_0_REQUIREMENTS.md` - Core principles
   - `GETTING_STARTED.md` - Setup instructions
   - `docs/ARCHITECTURE.md` - System design

2. Set up your development environment:
   - Node.js 18+
   - Docker Desktop
   - Git
   - VS Code (recommended)

3. Run the setup:
   ```bash
   npm run setup
   ```

### Finding Issues to Work On

- **Good First Issues**: Tagged with `good-first-issue`
- **Help Wanted**: Tagged with `help-wanted`
- **Bugs**: Tagged with `bug`
- **Features**: Tagged with `enhancement`

Browse issues: https://github.com/yourusername/ecotronics/issues

## 🔄 Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ecotronics.git
cd ecotronics
git remote add upstream https://github.com/original/ecotronics.git
```

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feat/your-feature-name

# Or a bugfix branch
git checkout -b fix/bug-description
```

**Branch naming conventions**:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions/updates
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

### 3. Make Your Changes

#### Code Style

We use ESLint and Prettier for consistent formatting:

```bash
# Lint your code
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

**Key style guidelines**:
- Use TypeScript for all new code
- Write descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Follow the existing code structure

#### Testing

All new code must include tests:

```bash
# Run all tests
npm test

# Run tests for a specific service
cd backend/auth-service
npm test

# Run tests in watch mode
npm test -- --watch

# Check coverage
npm run test:coverage
```

**Testing requirements**:
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

#### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(auth): add JWT refresh token mechanism
fix(device): resolve device ownership validation bug
docs(readme): update installation instructions
test(analytics): add unit tests for aggregation service
refactor(rbac): extract permission checking logic
chore(deps): update dependencies
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `chore` - Maintenance
- `ci` - CI/CD changes
- `build` - Build system changes

### 4. Push and Create Pull Request

```bash
# Push your branch
git push origin feat/your-feature-name

# Create a Pull Request on GitHub
```

## 📝 Pull Request Guidelines

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main branch
- [ ] Self-review completed

### PR Title

Use the same format as commit messages:

```
feat(auth): add JWT refresh token mechanism
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Testing
Describe the tests you ran and how to reproduce them.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: At least one maintainer reviews
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges to main

## 🏗️ Project Structure

### Backend Services

Each microservice follows this structure:

```
backend/service-name/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── utils/          # Helper functions
│   └── index.ts        # Entry point
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Frontend

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API clients
│   ├── stores/         # Zustand stores
│   ├── utils/          # Helper functions
│   └── types/          # TypeScript types
├── public/             # Static assets
└── tests/              # E2E tests
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// Example: auth-service/tests/unit/jwt.test.ts
import { generateToken, verifyToken } from '../../src/utils/jwt';

describe('JWT Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: '123', role: 'vehicle_owner' };
      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { userId: '123', role: 'vehicle_owner' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('123');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid')).toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// Example: auth-service/tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/v1/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'vehicle_owner',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('accessToken');
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'password123',
      });

    expect(response.status).toBe(400);
  });
});
```

## 📚 Documentation

### Code Comments

```typescript
/**
 * Calculates CO2 emissions based on fuel consumption
 * 
 * @param fuelAmount - Amount of fuel consumed in liters
 * @param fuelType - Type of fuel (gasoline, diesel, etc.)
 * @returns CO2 emissions in grams
 * 
 * @example
 * const co2 = calculateCO2(10, 'gasoline'); // Returns 23100 grams
 */
export function calculateCO2(fuelAmount: number, fuelType: FuelType): number {
  const factor = FUEL_CO2_FACTORS[fuelType];
  return fuelAmount * factor * 1000; // Convert kg to grams
}
```

### API Documentation

We use OpenAPI 3.0 for API documentation:

```yaml
# Example: auth-service/openapi.yaml
/api/v1/auth/register:
  post:
    summary: Register a new user
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RegisterRequest'
    responses:
      '201':
        description: User registered successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'
      '400':
        description: Invalid input
```

## 🐛 Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Try to reproduce the bug
3. Gather relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Windows 11]
 - Node.js version: [e.g. 18.15.0]
 - Docker version: [e.g. 20.10.23]
 - Browser: [e.g. Chrome 110]

**Additional context**
Any other relevant information.
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Which user role does this benefit?**
- [ ] Vehicle Owner
- [ ] Generator Owner
- [ ] Industry Owner
- [ ] City Admin
- [ ] All roles

**Additional context**
Any other relevant information, mockups, or examples.
```

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (when available)

## 📞 Getting Help

- **GitHub Discussions**: Ask questions
- **GitHub Issues**: Report bugs
- **Email**: support@ecotronics.example.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to EcoTronics! Together, we're building a more sustainable future.** 🌍
