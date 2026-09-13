import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));

await Promise.all([
  sharp(source).resize(192, 192).png().toFile(fileURLToPath(new URL('../public/pwa-192x192.png', import.meta.url))),
  sharp(source).resize(512, 512).png().toFile(fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url))),
  sharp(source).resize(180, 180).png().toFile(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)))
]);