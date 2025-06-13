# Contributing to BunSQLiteORM

Thank you for your interest in contributing to BunSQLiteORM! This guide will help you get started.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/bun-sqlite-orm.git
   cd bun-sqlite-orm
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run tests to ensure everything works**
   ```bash
   bun test
   ```

## Development Workflow

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Run the test suite**
   ```bash
   bun run lint          # Check code style
   bun run typecheck     # Verify TypeScript
   bun test              # Run all tests
   bun run test:coverage # Check coverage
   ```

### Commit Guidelines

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions/changes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

Example: `feat: add UUID primary key support`

### Pull Request Process

1. **Ensure your PR includes:**
   - Clear description of changes
   - Tests for new functionality
   - Updated documentation if needed
   - All checks passing

2. **PR Title Format:**
   Follow conventional commit format: `type: description`

3. **Review Process:**
   - Maintainers will review your PR
   - Address any feedback
   - Once approved, your PR will be merged

## Testing

### Running Tests

```bash
bun test                    # All tests
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:coverage      # With coverage report
```

### Writing Tests

- Unit tests go in `tests/unit/`
- Integration tests go in `tests/integration/`
- Follow existing test patterns
- Aim for high test coverage

## Code Style

We use Biome for linting and formatting:

```bash
bun run lint      # Check for issues
bun run lint:fix  # Auto-fix issues
```

## Documentation

- Update README.md for user-facing changes
- Add/update JSDoc comments for new APIs
- Update relevant documentation in `docs/`

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Contact maintainers for questions

Thank you for contributing! 🎉