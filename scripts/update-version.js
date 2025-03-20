import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 提交更改
function commitChanges(version) {
    try {
        // 添加修改的文件
        execSync('git add src-tauri/tauri.conf.json package.json src-tauri/Cargo.toml', { stdio: 'inherit' });
        
        // 提交更改
        execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
        
        // 推送代码更改
        execSync('git push origin main', { stdio: 'inherit' });
        
        console.log('已提交并推送版本号更改');
    } catch (error) {
        console.error('提交更改失败:', error.message);
        process.exit(1);
    }
}

// 创建 Git tag
function createGitTag(version) {
    try {
        // 创建 tag
        execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
        console.log(`已创建 Git tag: v${version}`);
        
        // 推送 tag 到远程仓库
        execSync(`git push origin v${version}`, { stdio: 'inherit' });
        console.log(`已推送 tag 到远程仓库`);
    } catch (error) {
        console.error('创建 Git tag 失败:', error.message);
        process.exit(1);
    }
}

// 更新版本号
function updateVersion(newVersion) {
    // 更新 tauri.conf.json
    const tauriConfigPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
    tauriConfig.version = newVersion;
    fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
    
    // 更新 package.json
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // 更新 Cargo.toml
    const cargoTomlPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
    let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    cargoToml = cargoToml.replace(/version = "[\d\.]+"/, `version = "${newVersion}"`);
    fs.writeFileSync(cargoTomlPath, cargoToml);
    
    console.log(`版本号已更新为: ${newVersion}`);
    console.log('已更新以下文件:');
    console.log('- src-tauri/tauri.conf.json');
    console.log('- package.json');
    console.log('- src-tauri/Cargo.toml');

    // 提交更改
    commitChanges(newVersion);

    // 创建 Git tag
    createGitTag(newVersion);
}

// 获取命令行参数
const newVersion = process.argv[2];
if (!newVersion) {
    console.error('请提供新的版本号，例如: npm run update-version 0.2.0');
    process.exit(1);
}

// 验证版本号格式
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
    console.error('版本号格式不正确，请使用 x.y.z 格式，例如: 0.2.0');
    process.exit(1);
}

updateVersion(newVersion); 