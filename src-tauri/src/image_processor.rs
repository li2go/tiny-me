use anyhow::Result;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::env;
use rand;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressOptions {
    pub quality: u32,            // 压缩质量 (1-100)
    pub max_width: Option<u32>,  // 最大宽度
    pub max_height: Option<u32>, // 最大高度
    pub format: Option<String>,  // 输出格式
    pub maintain_aspect_ratio: Option<bool>, // 保持宽高比
}

#[derive(Debug, Serialize)]
pub struct CompressResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub width: u32,
    pub height: u32,
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


pub async fn compress_image(
    input_path: &PathBuf,
    output_dir: Option<PathBuf>,
    options: CompressOptions,
) -> Result<CompressResult> {
    // 输出文件路径到控制台以便于调试
    println!("Compressing image: {:?}", input_path);
    println!("Output directory: {:?}", output_dir); // 添加调试日志

    // 检查输入文件是否存在
    if !input_path.exists() {
        anyhow::bail!("Input file does not exist: {:?}", input_path);
    }

    // 获取输入文件的扩展名
    let extension = input_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");

    // 获取输出文件路径
    let output_path = if let Some(dir) = &output_dir {
        if !dir.exists() {
            anyhow::bail!("Output directory does not exist: {:?}", dir);
        }
        
        let filename = input_path
            .file_name()
            .ok_or_else(|| anyhow::anyhow!("Invalid input filename"))?;
        let output_path = if let Some(format) = &options.format {
            PathBuf::from(filename).with_extension(format)
        } else {
            PathBuf::from(filename)
        };
        
        // 使用新的函数处理文件名冲突
        get_unique_filename(dir, &output_path)
    } else {
        anyhow::bail!("Output directory is required. Please select an output directory first.");
    };

    // 构建ffmpeg命令
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-i").arg(input_path);

    // 添加压缩选项
    let mut filter_complex = String::new();
    if let Some(max_width) = options.max_width {
        if let Some(max_height) = options.max_height {
            if options.maintain_aspect_ratio.unwrap_or(true) {
                // 使用 force_original_aspect_ratio=1 来保持宽高比
                filter_complex = format!(
                    "scale=min({},iw):min({},ih):force_original_aspect_ratio=1",
                    max_width, max_height
                );
            } else {
                // 不保持宽高比时直接指定尺寸
                filter_complex = format!(
                    "scale={}:{}",
                    max_width, max_height
                );
            }
        } else if let Some(max_width) = options.max_width {
            // 只设置最大宽度
            filter_complex = format!(
                "scale=min({},iw):-1:force_original_aspect_ratio=1",
                max_width
            );
        } else if let Some(max_height) = options.max_height {
            // 只设置最大高度
            filter_complex = format!(
                "scale=-1:min({},ih):force_original_aspect_ratio=1",
                max_height
            );
        }
    }

    if !filter_complex.is_empty() {
        cmd.arg("-vf").arg(filter_complex);
    }

    // 设置输出质量
    cmd.arg("-q:v")
        .arg(format!("{}", (100 - options.quality) / 5));

    // 设置输出格式
    if let Some(format) = &options.format {
        cmd.arg("-f").arg(format);
    }

    // 设置输出路径
    cmd.arg(&output_path);

    // 执行命令
    let output = cmd.output()?;
    if !output.status.success() {
        anyhow::bail!("FFmpeg failed: {}", String::from_utf8_lossy(&output.stderr));
    }

    // 获取原始文件大小
    let original_size = fs::metadata(input_path)?.len();
    let compressed_size = fs::metadata(&output_path)?.len();

    // 获取图片尺寸
    let img = image::open(&output_path)?;
    let dimensions = img.dimensions();

    Ok(CompressResult {
        output_path: output_path.to_string_lossy().into_owned(),
        original_size,
        compressed_size,
        width: dimensions.0,
        height: dimensions.1,
    })
}

// 批量压缩函数
pub async fn batch_compress(
    input_paths: &[PathBuf],
    output_dir: PathBuf,
    options: CompressOptions,
) -> Result<Vec<CompressResult>, String> {
    let mut results = Vec::new();

    for input_path in input_paths {
        match compress_image(
            input_path,
            Some(output_dir.clone()),
            options.clone(),
        )
        .await
        {
            Ok(result) => results.push(result),
            Err(e) => eprintln!("Error compressing {:?}: {}", input_path, e),
        }
    }

    Ok(results)
}
