# Swara App Icons

Place the following icon files in this directory:

| File | Size | Used for |
|------|------|----------|
| `icon-192.png` | 192×192 | Android home screen, PWA manifest |
| `icon-512.png` | 512×512 | Android splash, PWA manifest |
| `icon-maskable-512.png` | 512×512 | Android adaptive icon (safe zone = center 80%) |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `favicon.ico` | 32×32 (multi-size) | Browser tab |

## Quick generation using the SVG below

Save as `icon.svg`, then use any of these tools:

### Option A — Real Favicon Generator (recommended)
1. Go to https://realfavicongenerator.net
2. Upload your SVG or PNG
3. Set background: `#080808`
4. Download the package and place files here

### Option B — Sharp (Node.js)
```bash
npm install -g sharp-cli
sharp -i icon.svg -o icon-192.png resize 192 192
sharp -i icon.svg -o icon-512.png resize 512 512
sharp -i icon.svg -o apple-touch-icon.png resize 180 180
```

### Option C — ImageMagick
```bash
convert -background '#080808' icon.svg -resize 192x192 icon-192.png
convert -background '#080808' icon.svg -resize 512x512 icon-512.png
convert -background '#080808' icon.svg -resize 180x180 apple-touch-icon.png
convert icon-32.png icon-16.png favicon.ico
```

## Swara SVG Icon

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#080808"/>
  <circle cx="256" cy="256" r="200" stroke="#4f8ef7" stroke-width="10" stroke-opacity="0.3" fill="none"/>
  <rect x="140" y="196" width="28" height="120" rx="14" fill="#4f8ef7" opacity="0.5"/>
  <rect x="188" y="156" width="28" height="200" rx="14" fill="#4f8ef7" opacity="0.7"/>
  <rect x="242" y="116" width="28" height="280" rx="14" fill="#4f8ef7"/>
  <rect x="296" y="156" width="28" height="200" rx="14" fill="#4f8ef7" opacity="0.7"/>
  <rect x="344" y="196" width="28" height="120" rx="14" fill="#4f8ef7" opacity="0.5"/>
</svg>
```

## Maskable icon notes

For `icon-maskable-512.png`:
- The safe zone is the center 80% (410×410px of the 512 canvas)
- Keep the waveform bars within the safe zone
- Fill the entire 512×512 background with `#080808`
