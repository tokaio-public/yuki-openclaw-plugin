# Packaging & Build Guide - Phase 8

## Overview

This document describes the build process, packaging configuration, and release procedures for the OpenClaw Yuki plugin.

## Build Process

### Prerequisites

- Node.js 22+ LTS
- npm 10+
- TypeScript 5.8.3+

### Build Steps

```bash
# Install dependencies
npm install

# Clean previous builds
npm run clean

# Type checking
npm run type-check

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/

# Run full validation before publish
npm run prepublishOnly
```

### Build Output Structure

```
dist/
├── index.js                           # Plugin entry point
├── index.d.ts                         # Type definitions
├── cli/
│   ├── index.js
│   ├── commands.js
│   └── formatter.js
├── config.js
├── yuki/
│   ├── client.js
│   ├── services/                      # All service modules
│   └── ...
└── tools/
    ├── index.js
    ├── readTools.js
    └── writeTools.js
```

## Package Metadata

### Package.json Configuration

```json
{
  "name": "@tokaio/openclaw-yuki",
  "version": "0.1.0",
  "description": "OpenClaw plugin for secure Yuki SOAP webservice access",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "yuki-cli": "dist/cli/index.js"
  },
  "files": [
    "dist",
    "openclaw.plugin.json",
    "README.md",
    "LICENSE",
    "docs"
  ],
  "scripts": {
    "prepublishOnly": "npm run clean && npm run build && npm run test:coverage"
  }
}
```

### Key Fields

- **name**: Scoped package name for npm registry
- **version**: Semantic versioning (MAJOR.MINOR.PATCH)
- **main**: Entry point for CommonJS/default exports
- **types**: TypeScript definitions location
- **bin**: CLI executable entry point
- **files**: Included in npm package (uses .npmignore for exclusions)
- **prepublishOnly**: Runs before `npm publish`

## Versioning Strategy

### Semantic Versioning

- **MAJOR** (0.1.0 → 1.0.0): Breaking changes to plugin API/tools
- **MINOR** (0.1.0 → 0.2.0): New features (new tools, new commands)
- **PATCH** (0.1.0 → 0.1.1): Bug fixes, documentation updates

### Version Bumping

```bash
# Patch release (0.1.0 → 0.1.1)
npm version patch

# Minor release (0.1.0 → 0.2.0)
npm version minor

# Major release (0.1.0 → 1.0.0)
npm version major

# Custom version
npm version 0.2.0-beta.1
```

## Publishing

### Pre-Publication Checklist

- [ ] All tests pass: `npm run test:coverage`
- [ ] Coverage targets met: 75% statements, branches, functions, lines
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Build successful: `npm run build`
- [ ] CLI works: `npm run build && dist/cli/index.js health`
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Git changes committed

### Publishing Process

```bash
# 1. Verify everything works
npm run prepublishOnly

# 2. Login to npm
npm login

# 3. Publish to npm registry
npm publish

# 4. Verify published package
npm view @tokaio/openclaw-yuki

# 5. Tag release in git
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

### Publishing Options

#### Public Release

```bash
# Standard npm registry (public)
npm publish
```

#### Pre-Release

```bash
# Beta version
npm publish --tag beta

# Alpha version
npm publish --tag alpha
```

#### Private/Organization

```bash
# To private registry (if configured)
npm publish --registry https://private.npm.example.com
```

## Dependency Management

### Production Dependencies

```json
{
  "dependencies": {
    "@sinclair/typebox": "^0.34.41",
    "fast-xml-parser": "^4.5.0"
  }
}
```

- **@sinclair/typebox**: JSON schema validation library
- **fast-xml-parser**: SOAP XML parsing

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^22.15.17",
    "rimraf": "^6.0.1",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}
```

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm install @sinclair/typebox@latest

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Release Workflow

### Before Release

1. **Create release branch**
   ```bash
   git checkout -b release/v0.2.0
   ```

2. **Update version**
   ```bash
   npm version minor
   ```

3. **Update CHANGELOG**
   ```bash
   # Add entry to CHANGELOG.md
   ```

4. **Commit changes**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: prepare release v0.2.0"
   ```

5. **Create pull request**
   ```bash
   git push origin release/v0.2.0
   # Create PR for review
   ```

### Release

1. **Merge to main**
   ```bash
   git checkout main
   git pull
   git merge release/v0.2.0
   ```

2. **Publish to npm**
   ```bash
   npm publish
   ```

3. **Tag release**
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

### After Release

1. **Announce release**
   - Update README with new version number
   - Post release notes
   - Notify users

2. **Monitor for issues**
   - Watch issue tracker
   - Respond to bug reports quickly

3. **Plan next release**
   - Create milestone for next version
   - Prioritize features/fixes

## Build Artifacts

### CLI Binary

After build, the CLI is available at:

```bash
node dist/cli/index.js health
# or after npm install -g
yuki-cli health
```

### Plugin Registration

Plugin is registered when:

1. `openclaw plugins list` detects the package
2. OpenClaw scans manifest (`openclaw.plugin.json`)
3. Plugin entry point (`dist/index.js`) is imported

### TypeScript Definitions

Type definitions are exported for consumers:

```typescript
import { YukiClient } from '@tokaio/openclaw-yuki';

const client = new YukiClient({
  accessKey: '...',
  country: 'nl'
});

// TypeScript provides autocomplete and type checking
```

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Check for type errors
npm run type-check

# Verbose build output
npm run build -- --pretty false --listFilesOnly
```

### Publishing Fails

```bash
# Verify npm login
npm whoami

# Check package name conflicts
npm view @tokaio/openclaw-yuki

# Verify build before publish
npm run prepublishOnly

# Publish with verbose output
npm publish --verbose
```

### Version Conflicts

```bash
# Check git status
git status

# Ensure clean working directory
git stash

# Verify package.json version
cat package.json | jq .version
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
      - run: npm ci
      - run: npm run test:coverage
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Distribution Channels

### npm Registry

- **URL**: https://npmjs.com/@tokaio/openclaw-yuki
- **Installation**: `npm install @tokaio/openclaw-yuki`

### Direct from GitHub

```bash
npm install github:tokaio-public/yuki-openclaw-plugin#main
npm install github:tokaio-public/yuki-openclaw-plugin#v0.1.0
```

### Local Development

```bash
npm install -l ./  # Local relative path
npm link           # Global link for testing
```

## Maintenance

### Keep Dependencies Updated

```bash
# Monthly security audits
npm audit

# Quarterly dependency updates
npm update

# Monitor Node.js LTS versions
```

### Support Multiple Node Versions

- Ensure compatibility with Node 22 LTS+
- Test with newer LTS versions as available

### Backward Compatibility

- Don't break plugin API in patch releases
- Only break API in major version bumps
- Document breaking changes in CHANGELOG

## Checklist for Release

- [ ] Tests pass (100% coverage)
- [ ] Build succeeds
- [ ] CLI works
- [ ] Documentation current
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] No uncommitted changes
- [ ] npm publish successful
- [ ] Git tag created
- [ ] Announcement posted
