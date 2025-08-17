# PWA Setup Commands for QS Financial System

## 1. Install PWA Dependencies

```bash
cd sham
npm install next-pwa@5.6.0 workbox-webpack-plugin@6.6.0
npm install --save-dev @types/serviceworker
```

## 2. Create PWA Configuration Files

- next.config.ts (update existing)
- public/manifest.json (new)
- public/sw.js (auto-generated)
- public/icons/ (new directory with icons)

## 3. Update package.json scripts

```json
{
  "scripts": {
    "build": "next build",
    "build:pwa": "next build && next export",
    "start": "next start",
    "start:pwa": "next start"
  }
}
```
