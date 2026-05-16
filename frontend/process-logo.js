const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'logo.png');
const output512 = path.join(__dirname, 'public', 'icon-512x512.png');
const output192 = path.join(__dirname, 'public', 'icon-192x192.png');

async function processImage() {
  try {
    if (!fs.existsSync(inputPath)) {
      console.log('Error: public/logo.png not found. Please save the image there first.');
      return;
    }

    const size = 512;
    const roundedCorners = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`
    );

    console.log('Processing 512x512 icon...');
    await sharp(inputPath)
      .resize(size, size)
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }])
      .png({ quality: 80, compressionLevel: 9 }) // Lightweight compression
      .toFile(output512);

    console.log('Processing 192x192 icon...');
    await sharp(inputPath)
      .resize(192, 192)
      .composite([{
        input: Buffer.from(`<svg><circle cx="96" cy="96" r="96" /></svg>`),
        blend: 'dest-in'
      }])
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(output192);

    console.log('Successfully created circular, lightweight PWA icons!');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
