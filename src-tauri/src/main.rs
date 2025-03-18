// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod image_processor;

use image_processor::{CompressOptions, CompressResult};
use std::path::PathBuf;
use std::fs;
use serde::Serialize;
use std::process::Command;
use tauri::Window;

#[derive(Serialize)]
struct FileStats {
    size: u64,
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    file_path: String,
    progress: u32,
}

#[tauri::command]
async fn handle_drop(_window: Window, paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        println!("Dropped file: {}", path);
    }
    Ok(())
}

#[tauri::command]
fn get_file_stats(path: String) -> Result<FileStats, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    Ok(FileStats {
        size: metadata.len(),
    })
}

#[tauri::command]
fn open_dir(path: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let _parent = path.parent().ok_or("Invalid file path")?;
        Command::new("xdg-open")
            .arg(_parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn compress_image(
    window: Window,
    input_path: String,
    output_dir: Option<String>,
    options: CompressOptions,
) -> Result<CompressResult, String> {
    let input_path = PathBuf::from(input_path);
    let output_dir = output_dir.map(PathBuf::from);

    // 发送开始压缩事件
    window.emit("compress-progress", ProgressEvent {
        file_path: input_path.to_string_lossy().to_string(),
        progress: 0,
    }).map_err(|e| e.to_string())?;

    let result = image_processor::compress_image(&input_path, output_dir, options)
        .await
        .map_err(|e| e.to_string())?;

    // 发送完成事件
    window.emit("compress-progress", ProgressEvent {
        file_path: input_path.to_string_lossy().to_string(),
        progress: 100,
    }).map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
async fn batch_compress(
    window: Window,
    input_paths: Vec<String>,
    output_dir: String,
    options: CompressOptions,
) -> Result<Vec<CompressResult>, String> {
    let input_paths: Vec<PathBuf> = input_paths.into_iter().map(PathBuf::from).collect();
    let output_dir = PathBuf::from(output_dir);

    // 发送开始批量压缩事件
    for path in &input_paths {
        window.emit("compress-progress", ProgressEvent {
            file_path: path.to_string_lossy().to_string(),
            progress: 0,
        }).map_err(|e| e.to_string())?;
    }

    let results = image_processor::batch_compress(&input_paths, output_dir, options)
        .await
        .map_err(|e| e.to_string())?;

    // 发送完成事件
    for (_result, input_path) in results.iter().zip(input_paths.iter()) {
        window.emit("compress-progress", ProgressEvent {
            file_path: input_path.to_string_lossy().to_string(),
            progress: 100,
        }).map_err(|e| e.to_string())?;
    }

    Ok(results)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            compress_image, 
            batch_compress, 
            get_file_stats, 
            open_file_location, 
            open_dir,
            handle_drop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
