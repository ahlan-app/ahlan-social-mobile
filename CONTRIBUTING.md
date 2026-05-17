# Contributing to Ahlan Social

Thank you for your interest in contributing! This document covers the process and expectations for contributing to Ahlan Social.

## Development Setup

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/ahlan-social-mobile.git
   cd ahlan-social-mobile
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase project credentials. See the [README](README.md#environment-variables) for required variables.
5. **Start the development server:**
   ```bash
   npx expo start
   ```

## Creating a Branch

- Branch off from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Use descriptive branch names:
  - `feature/add-story-views` — new features
  - `fix/message-timestamp-bug` — bug fixes
  - `docs/update-api-guide` — documentation changes
  - `refactor/simplify-auth-flow` — code refactoring

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

optional longer description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(camera): add flash toggle to camera screen`
- `fix(auth): resolve session expiry redirect loop`
- `docs(readme): add architecture section`

## Code Style

- **TypeScript** is required — all new files must be `.ts` or `.tsx`.
- **React Native** conventions: functional components with hooks, no class components.
- **NativeWind** for styling — use Tailwind utility classes via `className`, avoid inline styles where possible.
- **Linting:** Run `npx expo lint` before committing and fix all warnings/errors.
- **Formatting:** Use consistent indentation (2 spaces), trailing commas, and single quotes.
- **Imports:** Group imports by external packages, then internal modules, then types.

## Submitting a Pull Request

1. **Rebase** your branch on latest `main` before opening a PR:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Push** to your fork and open a Pull Request against `main`.
3. **PR description** should include:
   - What the change does and why
   - How to test it
   - Any relevant screenshots (for UI changes)
   - Related issue number (e.g., `Closes #42`)
4. **One feature per PR** — keep PRs focused and reviewable.
5. Ensure all existing tests pass and no new lint errors are introduced.

## Reporting Issues

Found a bug or have a feature request? Open an issue on [GitHub Issues](https://github.com/ahlan-app/ahlan-social-mobile/issues):

- **Bug reports:** Include steps to reproduce, expected vs actual behavior, and your environment (OS, Expo SDK version, device/simulator).
- **Feature requests:** Describe the use case and proposed solution.

## Security Vulnerabilities

Please see [SECURITY.md](SECURITY.md) for our security policy and responsible disclosure process.

## License

By contributing to Ahlan Social, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE). All source files must include the standard copyright header:

```
// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...
```