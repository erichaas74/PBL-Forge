#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'assets-source/dragon-genetics/great-hall-home-v2.png';
const outputDirectory = 'public/assets/dragon-genetics';
const widths = [960, 1672];

await mkdir(outputDirectory, { recursive: true });

for (const width of widths) {
  const image = sharp(source).resize({ width, withoutEnlargement: true });
  await Promise.all([
    image.clone().avif({ quality: 58, effort: 6 }).toFile(`${outputDirectory}/great-hall-${width}.avif`),
    image.clone().webp({ quality: 76, effort: 6 }).toFile(`${outputDirectory}/great-hall-${width}.webp`),
  ]);
}

await sharp(source)
  .jpeg({ quality: 78, progressive: true, mozjpeg: true })
  .toFile(`${outputDirectory}/great-hall-1672.jpg`);

console.log('Optimized Great Hall artwork for AVIF, WebP, and JPEG delivery.');
