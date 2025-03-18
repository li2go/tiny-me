import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const sourceIcon = path.join(process.cwd(), 'src-tauri', 'icons', 'icon.png');
const iconsDir = path.join(process.cwd(), 'src-tauri', 'icons');

// 确保目标目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 定义需要生成的图标尺寸
const sizes = [
  { width: 16, height: 16, name: 'icon_16x16.png' },
  { width: 32, height: 32, name: 'icon_32x32.png' },
  { width: 64, height: 64, name: 'icon_64x64.png' },
  { width: 128, height: 128, name: 'icon_128x128.png' },
  { width: 256, height: 256, name: 'icon_256x256.png' },
  // 高分辨率版本
  { width: 32, height: 32, name: 'icon_32x32@2x.png' },
  { width: 64, height: 64, name: 'icon_64x64@2x.png' },
  { width: 128, height: 128, name: 'icon_128x128@2x.png' }
];

async function generateIcons() {
  try {
    for (const size of sizes) {
      await sharp(sourceIcon)
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(iconsDir, size.name));
      console.log(`Generated ${size.name}`);
    }
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 