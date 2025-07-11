#!/usr/bin/env python3
# coding=utf-8
"""
QriaPlayer 后端服务器

该模块实现了基于FastAPI的Web服务器，为QriaPlayer前端提供以下功能：
1. 提供静态资源（HTML、CSS、JavaScript、图标等）
2. 提供RESTful API接口访问音乐、视频和歌词文件
3. 管理文件系统中的媒体资源

主要接口：
- GET / - 返回主页
- GET /api/music_list - 获取音乐文件列表
- GET /api/video_list - 获取视频文件列表
- GET /api/get_mp3/{filename} - 获取指定音乐文件
- GET /api/get_mp4/{filename} - 获取指定视频文件
- GET /api/get_lrc/{filename} - 获取指定歌词文件
"""

import fastapi
import uvicorn
from pathlib import Path


app = fastapi.FastAPI()

# 初始化项目目录结构
home = Path(__file__).parent  # 项目根目录
static = home / "static"  # 静态资源目录
musics = home / "musics"  # 音乐文件目录
musics.mkdir(exist_ok=True)  # 确保音乐目录存在
music_list = [f.name for f in musics.glob("*.mp3")]  # 扫描所有MP3文件
lyrics = home / "lyrics"  # 歌词文件目录
lyrics.mkdir(exist_ok=True)  # 确保歌词目录存在
videos = home / "videos"  # 视频文件目录
videos.mkdir(exist_ok=True)  # 确保视频目录存在
video_list = [f.name for f in videos.glob("*.mp4")]  # 扫描所有MP4文件


@app.get("/")
async def route_index():
    """提供主页HTML文件"""
    return fastapi.responses.FileResponse(static / "index.html")


@app.get("/{filename}")
async def route_favicon(filename):
    """
    根据文件扩展名提供不同类型的静态资源

    Args:
        filename (str): 请求的文件名

    Returns:
        FileResponse: 对应的文件响应
    """
    if filename.endswith(".html"):
        return fastapi.responses.FileResponse(static / filename)
    elif filename.endswith(".svg"):
        return fastapi.responses.FileResponse(static / "icons" / filename)
    elif filename.endswith(".css"):
        return fastapi.responses.FileResponse(static / "css" / filename)
    elif filename.endswith(".js"):
        return fastapi.responses.FileResponse(static / "js" / filename)


@app.get("/api/music_list")
async def route_music_list():
    """
    获取音乐文件列表

    Returns:
        JSONResponse: 包含所有MP3文件名的JSON响应
    """
    return fastapi.responses.JSONResponse({"music_list": music_list})


@app.get("/api/video_list")
async def route_video_list():
    """
    获取视频文件列表

    Returns:
        JSONResponse: 包含所有MP4文件名的JSON响应
    """
    return fastapi.responses.JSONResponse({"video_list": video_list})


@app.get("/api/get_mp3/{filename}")
async def route_get_mp3(filename: str):
    """
    提供指定的音乐文件

    Args:
        filename (str): 音乐文件名

    Returns:
        FileResponse: 对应的音乐文件响应
    """
    return fastapi.responses.FileResponse(musics / filename)


@app.get("/api/get_mp4/{filename}")
async def route_get_mp4(filename: str):
    """
    提供指定的视频文件

    Args:
        filename (str): 视频文件名

    Returns:
        FileResponse: 对应的视频文件响应
    """
    return fastapi.responses.FileResponse(videos / filename)


@app.get("/api/get_lrc/{filename}")
async def route_get_lrc(filename: str):
    """
    提供指定歌曲的歌词文件内容

    Args:
        filename (str): 歌词文件名（与对应的音乐文件同名）

    Returns:
        JSONResponse: 包含歌词内容的JSON响应，如果文件不存在则返回空内容
    """
    lrc_path = lyrics / filename
    if not lrc_path.exists():
        return fastapi.responses.JSONResponse({"lyrics": ""})
    content = lrc_path.read_text(encoding="utf-8")
    return fastapi.responses.JSONResponse({"lyrics": content})


def start():
    """
    启动FastAPI服务器

    使用Uvicorn在localhost:41004上运行FastAPI应用
    """
    uvicorn.run("server:app", host="localhost", port=41004)

