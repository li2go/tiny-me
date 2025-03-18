# TinyMe - Lightweight Local Image Compression Tool

<div align="center">
  <img src="./public/icon.png" alt="TinyMe Logo" width="180" />
  <p>
    <em>Simple and efficient image compression, completely local processing, protecting privacy and security</em>
  </p>
</div>

English | [简体中文](./README.md)

## ✨ Project Introduction

TinyMe is a simple and efficient local image compression tool focused on providing the best image compression experience. Unlike online compression services, TinyMe processes your images completely locally, without requiring an internet connection, protecting your data privacy.

TinyMe is developed using [Tauri](https://tauri.app/) + [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/), featuring lightweight, efficient characteristics while providing a beautiful and intuitive user interface.

## 🚀 Features

- 🖼️ Supports multiple image formats (PNG, JPG, WebP)
- 🧩 Smart compression algorithm, maintaining optimal image quality
- 📦 Batch processing capability
- 🎛️ Multiple compression preset options
- 🔒 Completely local processing, protecting privacy
- 🌐 Multilingual support (Chinese, English)
- 💻 Cross-platform support (Windows, macOS, Linux)

## 📥 Installation

### Download Installation Package

Visit the [Releases](https://github.com/li2go/tiny-me/releases) page to download the installation package suitable for your system:

- Windows: `.msi` or `.exe` installation package
- macOS: `.dmg` installation package
- Linux: `.AppImage` or `.deb` package

### Build from Source Code

If you wish to build TinyMe from source code, please ensure you have installed:

1. [Node.js](https://nodejs.org/) (v18+)
2. [Rust](https://www.rust-lang.org/) (latest stable version)
3. [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

Then execute:

```bash
# Clone the repository
git clone https://github.com/li2go/tiny-me.git
cd tiny-me

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production version
npm run tauri build
```

## 🖱️ Usage

1. **Select images**: Drag and drop images into the application, or click the "Select Images" button
2. **Choose compression settings**:
   - Use presets: Select optimal compression settings for different scenarios
   - Custom settings: Adjust compression quality, output format, and maximum dimensions
3. **Compress images**: Click the "Compress" button for individual images or process in batch
4. **Save results**: Output compressed images to your chosen folder

## 🌍 Internationalization

TinyMe supports multiple languages:
- Chinese
- English

The system will automatically detect your system language and apply it. You can also manually switch languages in the top right corner of the application.

## 👨‍💻 Technical Architecture

- **Frontend**: React, TypeScript, Ant Design
- **Backend**: Rust, Tauri
- **Image Processing**: image-rs library
- **Internationalization**: i18next

## 🛠️ Contribution Guidelines

Your contributions to TinyMe are very welcome! Whether it's feature requests, bug fixes, or documentation improvements, we greatly appreciate them.

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📜 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [Tauri](https://tauri.app/) - Provides a framework for building lightweight cross-platform applications
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Ant Design](https://ant.design/) - Enterprise-class UI design language and React component library
- [image-rs](https://github.com/image-rs/image) - Rust image processing library

## 📝 Changelog

Check [CHANGELOG.md](CHANGELOG.md) to understand the changes in each version.

## 📧 Contact

For any questions or suggestions, please contact us through [GitHub Issues](https://github.com/li2go/tiny-me/issues).

---

<div align="center">
  <p>Made with ❤️ by li2go</p>
</div> 