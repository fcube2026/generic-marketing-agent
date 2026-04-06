# Contributing to Curex24

Thank you for your interest in contributing to Curex24! This guide covers the standards and workflow we follow so every contribution is consistent and easy to review.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Workflow](#pull-request-workflow)
- [Code Review & Merge](#code-review--merge)
- [Issue Tracking](#issue-tracking)

---

## Getting Started

1. **Fork** the repository and clone your fork.
2. Install the correct toolchain — the project requires **Node ≥ 18** and **pnpm 9.4.0**:

   ```bash
   corepack enable
   corepack prepare pnpm@9.4.0 --activate
   ```

3. Install dependencies from the **monorepo root** (never from inside an individual app):

   ```bash
   pnpm install
   ```

4. Follow the [Quick Start](README.md#-quick-start) section in the README to get the stack running locally.

> **Important:** Never use `npm` or `yarn`. The repo uses `workspace:*` protocol dependencies that only pnpm can resolve.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. All CI checks must pass before merge. |
| `<scope>/<short-description>` | Feature, fix, or chore branches created from `main`. |

### Branch naming convention

Use the format `<scope>/<short-description>` where scope describes the type of work:

```
feat/patient-booking-flow
fix/payment-refund-status
docs/contributing-guide
chore/upgrade-prisma
```

Always create your branch from the latest `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

---

## Commit Messages

Write clear, concise commit messages that describe **what** changed and **why**.

### Format

```
<type>: <short summary>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |

### Examples

```
feat: add patient referral list endpoint
fix: correct refund status on booking cancellation
docs: add contributing guidelines
chore: upgrade TypeScript to 5.4.5
test: add integration tests for payments module
```

---

## Code Style

Code style is enforced automatically — you rarely need to think about it.

### Formatting

- **Prettier** formats all code. The project uses single quotes and trailing commas.
- **Husky + lint-staged** runs Prettier on every commit automatically, so committed code is always formatted.
- You can check formatting manually:

  ```bash
  pnpm format:check
  ```

### Linting

- **ESLint** is configured per app (`apps/api`, `apps/admin`).
- Run linting for a specific workspace:

  ```bash
  pnpm --filter @curex24/api lint
  pnpm --filter @curex24/admin lint
  ```

- Run all linters:

  ```bash
  pnpm lint
  ```

### General guidelines

- Use **TypeScript** for all code.
- Follow the existing patterns in the module you are modifying.
- Avoid introducing `any` types when possible.
- Keep files focused — one module, service, or component per file.

---

## Testing

All code changes should include tests when applicable.

### Running tests

```bash
# All tests (from repo root)
pnpm test

# API unit tests
pnpm --filter @curex24/api test -- --passWithNoTests --forceExit

# Mobile tests
pnpm --filter @curex24/mobile test -- --passWithNoTests --forceExit
```

### Conventions

- **API tests** are colocated as `*.spec.ts` files under `apps/api/src/modules/`.
- **Mobile tests** are `*.test.tsx` files in `__tests__/` directories.
- **Integration tests** use `*.integration.spec.ts` naming and a separate Jest config.
- When adding a new module or feature, include unit tests for services and controllers.

---

## Pull Request Workflow

1. **Create a branch** from `main` following the [branching convention](#branching-strategy).
2. **Make your changes** in small, focused commits.
3. **Push** your branch and open a Pull Request against `main`.
4. **Fill in the PR template** — describe the change, check the applicable type/area boxes, and link related issues (e.g., `Fixes #42`).
5. **Ensure CI passes** — the pipeline runs linting, type-checking, building, and tests automatically.
6. **Request a review** from a maintainer.

### PR checklist

Before requesting a review, confirm:

- [ ] Code follows existing code style
- [ ] Changes are tested locally
- [ ] New/updated tests are included (if applicable)
- [ ] Documentation is updated (if applicable)
- [ ] No new warnings are introduced
- [ ] All CI checks pass

---

## Code Review & Merge

### For authors

- Keep PRs small and focused — one concern per PR.
- Respond to review feedback promptly.
- Push fixes as new commits during review so reviewers can see incremental changes.
- Squash or clean up commits before final merge if requested.

### For reviewers

- Be constructive and specific in feedback.
- Approve when the change is correct, tested, and follows project standards.
- Use GitHub suggestions for small fixes.

### Merge policy

- PRs require at least **one approving review** before merge.
- All CI checks must be **green**.
- Use **Squash and merge** for feature/fix branches to keep `main` history clean.

---

## Issue Tracking

- Use the provided [issue templates](.github/ISSUE_TEMPLATE/) when filing bugs or feature requests.
- Reference issues in your PR description with `Fixes #<number>` or `Relates to #<number>`.
- Check existing issues before opening a new one to avoid duplicates.

---

Thank you for contributing! If you have questions, open an issue and we'll be happy to help.
