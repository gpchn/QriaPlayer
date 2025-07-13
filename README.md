# QriaPlayer

[![项目版本](https://img.shields.io/badge/版本-1.0.0-blue.svg)](https://github.com/your-username/QriaPlayer)
[![Python版本](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![许可证](https://img.shields.io/badge/许可证-Apache%202.0-green.svg)](LICENSE)

一个简洁美观的跨平台音乐播放器，支持音乐和视频播放，带有实时歌词显示和 B 站视频下载功能。

![QriaPlayer Logo](static/favicon.ico)

## 目录

- [背景](#背景)
- [安装](#安装)
- [使用方法](#使用方法)
- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [API](#api)
- [依赖项](#依赖项)
- [贡献](#贡献)
- [许可证](#许可证)

## 背景

QriaPlayer 是一个结合了现代网页前端和 Python 后端的音乐播放器应用程序。它采用 FastAPI 作为后端服务，提供 RESTful API 接口，并使用 PyWebView 将网页界面嵌入到桌面应用中，打造了一个跨平台的媒体播放解决方案。

该项目旨在提供一个简洁、易用且功能丰富的媒体播放器，支持音乐和视频的播放，并具有实时歌词显示、B 站视频下载等特色功能。

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
# 或者使用uv进行依赖安装
uv pip install .
```

## 使用方法

### 启动应用

运行主程序文件：

```bash
python QriaPlayer.pyw
```

应用会自动打开一个窗口显示播放器界面。

### 基本操作

- **播放音乐**：点击左侧播放列表中的歌曲进行播放
- **搜索**：使用顶部搜索框搜索歌曲或艺术家
- **播放控制**：使用底部控制栏进行播放/暂停、上一曲/下一曲、音量调节
- **循环模式**：切换不同的循环播放模式（列表循环、单曲循环、随机播放、不循环）
- **歌词显示**：播放音乐时自动显示歌词（如果有对应的 LRC 文件）

## 功能特性

- **多媒体播放**：支持 MP3 音频和 MP4 视频播放
- **实时歌词**：支持 LRC 格式歌词，并实时高亮显示当前歌词
- **多种循环模式**：列表循环、单曲循环、随机播放和不循环
- **搜索功能**：快速搜索歌曲和艺术家
- **B 站视频下载**：支持通过 BV 号下载 B 站视频
- **响应式界面**：美观的 UI 设计，支持窗口大小调整

## 项目结构

```
QriaPlayer/
├── QriaPlayer.pyw      # 主程序入口
├── server.py           # FastAPI后端服务
├── downloader.py       # B站视频下载工具
├── apis.toml           # API配置文件
├── pyproject.toml      # 项目依赖配置
├── static/             # 前端静态文件
│   ├── css/            # 样式表文件
│   ├── js/             # JavaScript文件
│   ├── icons/          # 图标资源
│   └── index.html      # 主页面
├── musics/             # 音乐文件存储目录
├── lyrics/             # 歌词文件存储目录
└── videos/             # 视频文件存储目录
```

## API

后端提供以下主要 API 接口：

| 路径                      | 方法 | 描述             |
| ------------------------- | ---- | ---------------- |
| `/api/music_list`         | GET  | 获取音乐文件列表 |
| `/api/video_list`         | GET  | 获取视频文件列表 |
| `/api/get_mp3/{filename}` | GET  | 获取指定音乐文件 |
| `/api/get_mp4/{filename}` | GET  | 获取指定视频文件 |
| `/api/get_lrc/{filename}` | GET  | 获取指定歌词文件 |

## 依赖项

QriaPlayer 依赖于以下主要 Python 库：

- **fastapi** (>=0.115.13)：高性能 Web 框架
- **uvicorn** (>=0.34.3)：ASGI 服务器
- **pywebview** (>=5.4)：将 Web 内容嵌入到桌面应用
- **bilibili-api-python** (>=17.2.1)：B 站 API 接口
- **httpx** (>=0.28.1)：现代化的 HTTP 客户端
- **pyffmpeg** (>=2.4.3)：Python 的 FFmpeg 封装

完整依赖列表详见`pyproject.toml`文件。

## 贡献

欢迎对 QriaPlayer 项目做出贡献！您可以通过以下方式参与：

1. 提交问题或建议（Issues）
2. 提交代码改进（Pull Requests）
3. 完善文档

请确保您的代码符合项目的编码规范和质量标准。

## 许可证

本项目采用[Apache 2.0 许可证](LICENSE)。详情请参阅 LICENSE 文件。
