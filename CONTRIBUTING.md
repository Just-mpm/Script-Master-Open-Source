# Contributing to Script Master

First off, thank you for considering contributing to Script Master. It is people like you that make open source great.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Available Commands](#available-commands)
- [Conventions](#conventions)
- [Pull Request Process](#pull-request-process)
- [Branch Policy](#branch-policy)
- [PR Checklist](#pr-checklist)

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/script-master.git
   cd script-master
   ```
3. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/Just-mpm/Script-Master-Open-Source.git
   ```

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime for the frontend)
- [Node.js](https://nodejs.org/) 24+ (for Cloud Functions)
- [Firebase CLI](https://firebase.google.com/docs/cli) (for emulators and deployment)

### Install dependencies

```bash
# Frontend (root directory)
bun install

# Cloud Functions (functions directory)
cd functions
npm install
cd ..
```

### Firebase configuration

Copy `.env.example` to `.env` and fill in your Firebase project credentials. See `AGENTS.md` for detailed environment variable documentation.

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server at http://localhost:3000 |
| `bun run lint` | Run ESLint 10 (flat config) |
| `bun run lint:fix` | Run ESLint with auto-fix |
| `bun run typecheck` | Run TypeScript compiler (`tsc -b`) |
| `bun run test` | Run Vitest tests (single run) |
| `bun run test:watch` | Run Vitest in watch mode |
| `bun run build` | Lint + typecheck + Vite production build |

## Conventions

### TypeScript

- **Strict typing is mandatory.** The use of `any`, `@ts-ignore`, `eslint-disable` (for type rules), or equivalent workarounds is prohibited.
- Prefer explicit types over inferred types when the intent is not obvious.
- Use interfaces for object shapes and type aliases for unions, intersections, and utility types.

### Architecture

- Follow **SOLID** principles and **Clean Code** practices.
- Keep functions short (under 20 lines when practical).
- Use meaningful, descriptive names.
- Don't repeat yourself (DRY), but avoid premature abstraction.

### Comments

- Write comments in **Portuguese (pt-BR)** with proper accents.
- Comment when the logic is not obvious -- do not state the obvious.

### UI Framework

- **MUI v9** is the sole UI framework. Do not use Tailwind CSS, CSS modules, or styled-components.
- Follow the existing theme tokens in `src/theme/`.

### Internationalization

- The UI supports 3 locales: pt-BR (default), en, and es.
- If you change or add user-facing text, update all 3 locale files in `src/features/i18n/locales/`.
- Run `bun run i18n` to verify locale parity and unused keys.

### AI Integration

- All AI calls must go through Firebase Cloud Functions via `httpsCallable`. Never call Gemini directly from the frontend.
- The project uses a **BYOK (Bring Your Own Key)** model. API keys are stored in the user's IndexedDB and passed in each request payload.

### Environment Variables

- Use `import.meta.env` (Vite) in the frontend, not `process.env`.
- Use the helpers in `src/lib/env.ts` to read environment variables.

## Pull Request Process

1. **Create a branch** from `develop` (or `main` if `develop` does not exist):
   ```bash
   git checkout -b feat/my-feature develop
   ```

2. **Make your changes** following the conventions above.

3. **Write or update tests** for your changes. New features should include tests.

4. **Run all checks locally** before pushing:
   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```

5. **Commit with clear messages** describing what and why (not how).

6. **Push to your fork** and open a Pull Request against `develop` (or `main`).

7. **Fill out the PR template** completely, including the checklist.

8. **Respond to review feedback** promptly.

## Branch Policy

| Branch | Purpose |
|--------|---------|
| `main` | Production. Matches what is deployed to script-master.pro. |
| `develop` | Integration branch for ongoing work. PRs should target this branch. |

If `develop` does not exist yet, target `main`.

## PR Checklist

Before submitting your PR, verify the following:

- [ ] No use of `any`, `@ts-ignore`, or `eslint-disable` to bypass type rules.
- [ ] `bun run lint` passes with no errors or warnings.
- [ ] `bun run typecheck` passes with no errors.
- [ ] `bun run test` passes with no failures.
- [ ] i18n is updated for all 3 locales (if you changed or added UI text).
- [ ] Changes are documented (in AGENTS.md version table, if applicable).

## Questions?

Feel free to open an issue with the `question` label, or reach out via the contact information in the README.
