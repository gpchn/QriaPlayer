# QriaPlayer

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)
[![项目版本](https://img.shields.io/badge/版本-2.0.0-blue.svg)](https://github.com/gpchn/QriaPlayer)
[![Python版本](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![许可证](https://img.shields.io/badge/许可证-Apache%202.0-green.svg)](LICENSE)

> 一个简洁美观的跨平台音乐播放器，支持音乐和视频播放，带有实时歌词显示和 B 站视频下载功能。

![QriaPlayer Logo](QriaPlayerIcon/QiraPlayer_256.png)

## 目录

- [背景](#背景)
- [安装](#安装)
- [使用方法](#使用方法)
- [功能特性](#功能特性)
- [API](#api)
- [项目结构](#项目结构)
- [维护者](#维护者)
- [依赖项](#依赖项)
- [贡献](#贡献)
- [许可证](#许可证)

## 背景

QriaPlayer 是一个结合了现代网页前端和 Python 后端的音乐播放器应用程序。它采用 Bottle 和 Waitress 作为后端服务，提供 RESTful API 接口，并使用 PyWebView 将网页界面嵌入到桌面应用中，打造了一个跨平台的媒体播放解决方案。

该项目旨在提供一个简洁、易用且功能丰富的媒体播放器，支持音乐和视频的播放，并具有实时歌词显示、B 站视频下载等功能。QriaPlayer 采用响应式设计，提供美观的用户界面，让用户在不同设备上都能获得优质的使用体验。

## 安装

### 系统要求

- Python 3.12+
- 支持的操作系统：Windows、macOS、Linux

### 安装方法

1. 克隆仓库：

```bash
git clone https://github.com/your-username/QriaPlayer.git
cd QriaPlayer
```

2. 使用 pip 安装依赖：

```bash
pip install -r requirements.txt
# 或者使用 uv 进行依赖安装（推荐）
uv sync
```

## 使用方法

### 启动应用

运行主程序文件：

```bash
# 如果有 uv
uv run QriaPlayer.pyw
# 或直接运行
python QriaPlayer.pyw
```

应用会自动打开一个窗口显示播放器界面。

### 基本操作

- **播放媒体**：点击左侧播放列表中的歌曲或视频进行播放
- **搜索**：使用顶部搜索框搜索歌曲、视频或艺术家
- **播放控制**：使用底部控制栏进行播放/暂停、上一曲/下一曲、音量调节
- **循环模式**：切换不同的循环播放模式（列表循环、单曲循环、随机播放、不循环）
- **歌词显示**：播放音乐时自动显示歌词（如果有对应的 LRC 文件）
- **视频下载**：通过B站BV号下载视频

### 系统托盘功能

QriaPlayer 支持最小化到系统托盘，您可以：

- 点击托盘图标显示或隐藏主窗口
- 通过托盘菜单控制应用

## 功能特性

- **多媒体播放**：支持 MP3 音频和 MP4 视频播放
- **实时歌词**：支持 LRC 格式歌词，并实时高亮显示当前歌词
- **多种循环模式**：列表循环、单曲循环、随机播放和不循环
- **搜索功能**：快速搜索歌曲和艺术家
- **B 站视频下载**：支持通过 BV 号下载 B 站视频
- **状态记忆**：自动记忆上次播放状态，下次启动时恢复
- **系统托盘**：支持最小化到系统托盘运行
- **响应式界面**：美观的 UI 设计，支持窗口大小调整

## API

后端提供以下主要 API 接口：

| 路径                      | 方法 | 描述                               |
| ------------------------- | ---- | ---------------------------------- |
| `/api/playlist`           | GET  | 获取统一媒体文件列表（音乐和视频） |
| `/api/get_lrc/{filename}` | GET  | 获取指定歌词文件                   |
| `/api/play_state`         | GET  | 获取播放状态                       |
| `/api/play_state`         | POST | 保存播放状态                       |
| `/media/music/{filename}` | GET  | 获取指定音乐文件                   |
| `/media/video/{filename}` | GET  | 获取指定视频文件                   |

## 项目结构

```
QriaPlayer/
├── QriaPlayer.pyw      # 主程序入口
├── server.py           # Bottle 后端服务器
├── downloader.py       # B站视频下载工具
├── apis.toml           # API 配置文件
├── pyproject.toml      # 项目依赖配置
├── static/             # 前端静态文件
│   ├── css/            # 样式表文件
│   ├── js/             # JavaScript 文件
│   ├── icons/          # 图标资源
│   └── index.html      # 主页面
├── musics/             # 音乐文件存储目录
├── lyrics/             # 歌词文件存储目录
└── videos/             # 视频文件存储目录
```

## 维护者

[@your-github-username](https://github.com/your-username)

## 依赖项

QriaPlayer 依赖于以下主要 Python 库：

- **bilibili-api-python** (>=17.3.0)：B 站 API 接口
- **httpx** (>=0.28.1)：现代化的 HTTP 客户端
- **pillow** (>=11.2.1)：Python 图像处理库
- **pyffmpeg** (>=2.4.3)：Python 的 FFmpeg 封装
- **pystray** (>=0.19.5)：系统托盘支持
- **pywebview** (>=5.4)：将 Web 内容嵌入到桌面应用
- **waitress** (>=3.0.2)：生产级 WSGI 服务器

完整依赖列表详见 `pyproject.toml` 文件。

## 贡献

非常欢迎你的加入！[提一个 Issue](https://github.com/your-username/QriaPlayer/issues/new)或者提交一个 Pull Request。

贡献前请先阅读 [贡献者行为准则](CODE_OF_CONDUCT.md)。

### 贡献者

暂无贡献者。

## 许可证

[Apache License 2.0](LICENSE) © gpchn
