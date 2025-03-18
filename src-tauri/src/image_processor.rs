use anyhow::{Result, Context};
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::ffi::OsStr;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressOptions {
    pub quality: u32,            // 压缩质量 (1-100)
    pub max_width: Option<u32>,  // 最大宽度
    pub max_height: Option<u32>, // 最大高度
    pub maintain_aspect_ratio: Option<bool>, // 保持宽高比
    pub lossless: Option<bool>,  // 是否使用无损压缩
}

#[derive(Debug, Serialize)]
pub struct CompressResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub width: u32,
    pub height: u32,
    pub compression_ratio: f64,  // 压缩比率
    pub format: String,         // 输出格式
}

// 支持的图片格式
const SUPPORTED_FORMATS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"];

// 检查文件格式是否支持
fn is_supported_format(extension: &str) -> bool {
    SUPPORTED_FORMATS.contains(&extension.to_lowercase().as_str())
}

fn get_unique_filename(dir: &PathBuf, filename: &PathBuf) -> PathBuf {
    let mut counter = 1;
    let mut new_path = dir.join(filename);
    
    while new_path.exists() {
        let stem = filename.file_stem().unwrap_or_default();
        let extension = filename.extension().unwrap_or_default();
        let new_filename = format!("{}_{}.{}", stem.to_string_lossy(), counter, extension.to_string_lossy());
        new_path = dir.join(new_filename);
        counter += 1;
    }
    
    new_path
}

// 获取文件扩展名
fn get_extension(path: &PathBuf) -> Result<String> {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|s| s.to_lowercase())
        .context("无法获取文件扩展名")
}

// 构建 FFmpeg 压缩参数
fn build_compression_args(
    format: &str,
    quality: u32,
    lossless: bool,
    cmd: &mut Command,
) -> Result<()> {
    match format {
        "jpg" | "jpeg" => {
            if lossless {
                cmd.arg("-q:v").arg("0");
            } else {
                // JPEG 质量范围是 2-31，2 是最高质量
                let q = (100 - quality) / 3;
                cmd.arg("-q:v").arg(format!("{}", q.max(2).min(31)));
            }
        },
        "png" => {
            if lossless {
                cmd.arg("-compression_level").arg("0");
            } else {
                // PNG 压缩级别范围是 0-9，9 是最高压缩率
                let level = (100 - quality) / 11;
                cmd.arg("-compression_level").arg(format!("{}", level.max(0).min(9)));
            }
        },
        "webp" => {
            if lossless {
                cmd.arg("-lossless").arg("1");
            } else {
                cmd.arg("-quality").arg(format!("{}", quality));
            }
        },
        "gif" => {
            let q = (100 - quality) / 5;
            cmd.arg("-q:v").arg(format!("{}", q.max(2).min(31)));
        },
        "bmp" => {
            let q = (100 - quality) / 5;
            cmd.arg("-q:v").arg(format!("{}", q.max(2).min(31)));
        },
        "tiff" => {
            if lossless {
                cmd.arg("-compression").arg("lzw");
            } else {
                cmd.arg("-compression").arg("jpeg");
                let q = (100 - quality) / 5;
                cmd.arg("-q:v").arg(format!("{}", q.max(2).min(31)));
            }
        },
        _ => {
            let q = (100 - quality) / 5;
            cmd.arg("-q:v").arg(format!("{}", q.max(2).min(31)));
        }
    }
    Ok(())
}

pub async fn compress_image(
    input_path: &PathBuf,
    output_dir: Option<PathBuf>,
    options: CompressOptions,
) -> Result<CompressResult> {
    // 检查输入文件是否存在
    if !input_path.exists() {
        anyhow::bail!("输入文件不存在: {:?}", input_path);
    }

    // 检查文件格式
    let input_extension = get_extension(input_path)?;
    if !is_supported_format(&input_extension) {
        anyhow::bail!("不支持的图片格式: {}", input_extension);
    }

    // 获取输出文件路径
    let output_path = if let Some(dir) = &output_dir {
        if !dir.exists() {
            anyhow::bail!("输出目录不存在: {:?}", dir);
        }
        
        let filename = input_path
            .file_name()
            .ok_or_else(|| anyhow::anyhow!("无效的输入文件名"))?;
        
        get_unique_filename(dir, &PathBuf::from(filename))
    } else {
        anyhow::bail!("请选择输出目录");
    };

    // 构建ffmpeg命令
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-i").arg(input_path);

    // 添加压缩选项
    let mut filter_complex = String::new();
    if let Some(max_width) = options.max_width {
        if let Some(max_height) = options.max_height {
            if options.maintain_aspect_ratio.unwrap_or(true) {
                filter_complex = format!(
                    "scale='min({},iw)':'min({},ih)':force_original_aspect_ratio=1",
                    max_width, max_height
                );
            } else {
                filter_complex = format!(
                    "scale={}:{}",
                    max_width, max_height
                );
            }
        } else {
            filter_complex = format!(
                "scale='min({},iw)':-1:force_original_aspect_ratio=1",
                max_width
            );
        }
    } else if let Some(max_height) = options.max_height {
        filter_complex = format!(
            "scale=-1:'min({},ih)':force_original_aspect_ratio=1",
            max_height
        );
    }

    if !filter_complex.is_empty() {
        cmd.arg("-vf").arg(filter_complex);
    }

    // 设置压缩参数
    build_compression_args(
        &input_extension,
        options.quality,
        options.lossless.unwrap_or(false),
        &mut cmd,
    )?;

    // 设置输出格式和编码器
    match input_extension.as_str() {
        "png" => {
            cmd.arg("-f").arg("image2")
                .arg("-c:v").arg("png");
        },
        "jpg" | "jpeg" => {
            cmd.arg("-f").arg("image2")
                .arg("-c:v").arg("mjpeg");
        },
        "webp" => {
            cmd.arg("-f").arg("image2")
                .arg("-c:v").arg("libwebp");
        },
        "gif" => {
            cmd.arg("-f").arg("gif");
        },
        "bmp" => {
            cmd.arg("-f").arg("image2")
                .arg("-c:v").arg("bmp");
        },
        "tiff" => {
            cmd.arg("-f").arg("image2")
                .arg("-c:v").arg("tiff");
        },
        _ => {
            cmd.arg("-f").arg("image2");
        }
    }

    // 设置输出路径
    cmd.arg(&output_path);

    // 执行命令
    let output = cmd.output()?;
    if !output.status.success() {
        anyhow::bail!("FFmpeg 压缩失败: {}", String::from_utf8_lossy(&output.stderr));
    }

    // 获取原始文件大小和压缩后大小
    let original_size = fs::metadata(input_path)?.len();
    let compressed_size = fs::metadata(&output_path)?.len();

    // 计算压缩比率
    let compression_ratio = if original_size > 0 {
        ((compressed_size as f64 / original_size as f64) - 1.0) * 100.0
    } else {
        0.0
    };

    // 获取图片尺寸
    let img = image::open(&output_path)?;
    let (width, height) = img.dimensions();

    Ok(CompressResult {
        output_path: output_path.to_string_lossy().into_owned(),
        original_size,
        compressed_size,
        width,
        height,
        compression_ratio,
        format: input_extension,
    })
}

pub async fn batch_compress(
    input_paths: &[PathBuf],
    output_dir: PathBuf,
    options: CompressOptions,
) -> Result<Vec<CompressResult>, String> {
    let mut results = Vec::new();
    let mut errors = Vec::new();

    for input_path in input_paths {
        match compress_image(
            input_path,
            Some(output_dir.clone()),
            options.clone(),
        )
        .await
        {
            Ok(result) => results.push(result),
            Err(e) => errors.push(format!("压缩文件 {:?} 失败: {}", input_path, e)),
        }
    }

    if !errors.is_empty() {
        return Err(errors.join("\n"));
    }

    Ok(results)
}
