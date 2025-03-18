import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义需要生成的图标尺寸
const sizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_64x64.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_256x256.png' }
];

// 源图标路径
const sourceIcon = path.join(__dirname, '../src-tauri/icons/icon.png');
const outputDir = path.join(__dirname, '../src-tauri/icons');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 生成不同尺寸的图标
async function generateIcons() {
  try {
    for (const { size, name } of sizes) {
      const outputPath = path.join(outputDir, name);
      const command = `ffmpeg -i "${sourceIcon}" -vf scale=${size}:${size} "${outputPath}"`;
      
      await execAsync(command);
      console.log(`Generated ${name}`);
    }
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 