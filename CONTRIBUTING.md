# Contributing to netlistsvg

This is a modernized fork of [nturley/netlistsvg](https://github.com/nturley/netlistsvg), which is no longer actively maintained.

## Setup

```bash
git clone https://github.com/paulgeorge/netlistsvg.git
cd netlistsvg
npm install
```

## Development

```bash
npx tsc              # compile TypeScript
npx tsc --watch      # compile in watch mode
npm test             # full test suite (compile + lint + jest)
npm run lint         # lint only
```

## Pull Requests

- Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)
- Keep the first line under 72 characters
- Ensure `npm test` passes before submitting
- No lodash -- use native JS/TS equivalents
