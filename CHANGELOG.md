# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases will use
semantic versioning once the production platform has a verified release process. Dates use ISO 8601.

## [Unreleased]

### Added

- Pull-request CI for formatting, linting, strict typechecking, unit/integration coverage,
  production builds, Chromium smoke/accessibility coverage, local link integrity, dependency
  auditing, secret scanning, and isolated Supabase migration linting.
- Scheduled and pull-request CodeQL analysis for JavaScript and TypeScript.
- Dependabot update policies for pnpm dependencies and GitHub Actions.
- Security-aware pull-request and bug-report templates.
- Contribution guidance for prayer integrity, RLS, privacy, accessibility, testing, migrations, and
  environment-dependent controls.
- Explicit CODEOWNERS launch placeholder pending Association-approved GitHub ownership.

### Security

- CI jobs use read-only default permissions, concurrency cancellation, locked dependencies, disabled
  checkout credential persistence, and no production application or deployment secrets.

<!-- Add the first dated release below only after its artefact, migrations, deployment configuration, and rollback have been verified. -->
