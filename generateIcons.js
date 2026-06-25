const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'src/assets/taskmark.svg');
const pngPath = path.join(__dirname, 'src/assets/taskmark.png');
const icoPath = path.join(__dirname, 'src/assets/taskmark.ico');

async function buildIcons() {
  // 1. Convert SVG to 256x256 High-Res PNG
  await sharp(svgPath)
    .resize(256, 256)
    .toFile(pngPath);
  console.log('✓ Generated icon.png');

  // 2. Convert PNG to Windows Compatible ICO format
  const buf = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, buf);
  console.log('✓ Generated icon.ico');
}

buildIcons().catch(console.error);