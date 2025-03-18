use anyhow::Result;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tempfile::NamedTempFile;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressOptions {
    pub quality: u32,            // 压缩质量 (1-100)
    pub max_width: Option<u32>,  // 最大宽度
    pub max_height: Option<u32>, // 最大高度
    pub format: Option<String>,  // 输出格式
}

#[derive(Debug, Serialize)]
pub struct CompressResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub width: u32,
    pub height: u32,
}

pub async fn compress_image(
    input_path: PathBuf,
    output_dir: Option<PathBuf>,
    options: CompressOptions,
) -> Result<CompressResult> {
    // 输出文件路径到控制台以便于调试
    println!("Compressing image: {:?}", input_path);
    // 检查输入文件是否存在
    if !input_path.exists() {
        anyhow::bail!("Input file does not exist: {:?}", input_path);
    }

    // 获取输入文件的扩展名
    let extension = input_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");

    // 创建临时文件，确保有正确的扩展名
    let temp_file = NamedTempFile::new()?;
    let temp_path = temp_file.path().to_path_buf();
    let temp_path_with_ext = temp_path.with_extension(
        options.format.as_deref().unwrap_or(extension)
    );

    // 构建ffmpeg命令
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-i").arg(&input_path);

    // 添加压缩选项
    if let Some(w) = options.max_width {
        if let Some(h) = options.max_height {
            cmd.arg("-vf").arg(format!(
                "scale=min({w},iw):min({h},ih):force_original_aspect_ratio=decrease"
            ));
        }
    }

    // 设置输出质量
    cmd.arg("-q:v")
        .arg(format!("{}", (100 - options.quality) / 5));

    // 设置输出格式
    if let Some(format) = &options.format {
        cmd.arg("-f").arg(format);
    }

    // 设置输出路径
    cmd.arg(&temp_path_with_ext);

    // 执行命令
    let output = cmd.output()?;
    if !output.status.success() {
        anyhow::bail!("FFmpeg failed: {}", String::from_utf8_lossy(&output.stderr));
    }

    // 获取输出文件信息
    let output_path = if let Some(dir) = output_dir {
        let filename = input_path
            .file_name()
            .ok_or_else(|| anyhow::anyhow!("Invalid input filename"))?;
        let mut output_path = dir;
        output_path.push(filename);
        // 如果指定了输出格式，更改输出文件的扩展名
        let output_path = if let Some(format) = &options.format {
            output_path.with_extension(format)
        } else {
            output_path
        };
        std::fs::copy(&temp_path_with_ext, &output_path)?;
        output_path
    } else {
        temp_path_with_ext.clone()
    };

    // 获取原始文件大小
    let original_size = std::fs::metadata(&input_path)?.len();
    let compressed_size = std::fs::metadata(&temp_path_with_ext)?.len();

    // 获取图片尺寸
    let img = image::open(&temp_path_with_ext)?;
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
    input_paths: Vec<PathBuf>,
    output_dir: PathBuf,
    options: CompressOptions,
) -> Result<Vec<CompressResult>> {
    let mut results = Vec::new();

    for input_path in input_paths {
        match compress_image(
            input_path.clone(),
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
