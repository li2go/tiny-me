// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod image_processor;

use image_processor::{CompressOptions, CompressResult};
use std::path::PathBuf;
use std::fs;
use serde::Serialize;

#[derive(Serialize)]
struct FileStats {
    size: u64,
}

#[tauri::command]
fn get_file_stats(path: String) -> Result<FileStats, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    Ok(FileStats {
        size: metadata.len(),
    })
}

#[tauri::command]
async fn compress_image(
    input_path: String,
    output_dir: Option<String>,
    options: CompressOptions,
) -> Result<CompressResult, String> {
    let input_path = PathBuf::from(input_path);
    let output_dir = output_dir.map(PathBuf::from);

    image_processor::compress_image(input_path, output_dir, options)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn batch_compress(
    input_paths: Vec<String>,
    output_dir: String,
    options: CompressOptions,
) -> Result<Vec<CompressResult>, String> {
    let input_paths: Vec<PathBuf> = input_paths.into_iter().map(PathBuf::from).collect();
    let output_dir = PathBuf::from(output_dir);

    image_processor::batch_compress(input_paths, output_dir, options)
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compress_image, batch_compress, get_file_stats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
