import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 查找安装包文件
function findInstallers(bundleDir) {
    const msiPattern = path.join(bundleDir, '**', '*.msi');
    const nsisPattern = path.join(bundleDir, '**', '*.exe');
    
    const msiFiles = glob.sync(msiPattern);
    const nsisFiles = glob.sync(nsisPattern);
    
    return {
        msi: msiFiles[0],
        nsis: nsisFiles[0]
    };
}

// 获取文件大小
function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024 / 1024).toFixed(2);
}

// 构建 Windows 版本
async function buildWindows() {
    try {
        console.log('开始构建 Windows 版本...');
        
        // 执行构建命令
        execSync('npm run tauri build', { stdio: 'inherit' });
        
        // 检查构建输出
        const bundleDir = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');
        const installers = findInstallers(bundleDir);
        
        if (installers.msi) {
            console.log('\nMSI 安装包:');
            console.log(`位置: ${installers.msi}`);
            console.log(`大小: ${getFileSize(installers.msi)} MB`);
        }
        
        if (installers.nsis) {
            console.log('\nNSIS 安装包:');
            console.log(`位置: ${installers.nsis}`);
            console.log(`大小: ${getFileSize(installers.nsis)} MB`);
        }
        
        if (!installers.msi && !installers.nsis) {
            throw new Error('未找到安装包文件');
        }
        
        console.log('\n构建完成！');
    } catch (error) {
        console.error('构建失败:', error);
        process.exit(1);
    }
}

buildWindows(); 