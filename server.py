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
- GET /api/get_lrc/{filename} - 获取指定歌词文件
"""

import fastapi
import uvicorn
import orjson
from pathlib import Path
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse


app = fastapi.FastAPI()


# 数据模型定义
class PlayState(BaseModel):
    """播放状态数据模型"""

    filename: str = ""
    current_time: float = 0


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

# 播放状态存储
state_file = home / "player_state.json"
play_state = PlayState()  # 默认播放状态

# 如果状态文件存在，加载之前的播放状态
if state_file.exists():
    try:
        saved_state = orjson.loads(state_file.read_text(encoding="utf-8"))
        play_state = PlayState(**saved_state)
    except Exception as e:
        print(f"加载播放状态失败: {e}")

# 挂载静态资源目录
app.mount("/static", StaticFiles(directory=str(static)), name="static")
# 挂载媒体资源目录
app.mount("/media/music", StaticFiles(directory=str(musics)), name="music_files")
app.mount("/media/video", StaticFiles(directory=str(videos)), name="video_files")


@app.get("/")
async def route_index():
    """提供主页HTML文件"""
    return FileResponse(static / "index.html")


@app.get("/favicon.ico")
async def route_favicon():
    """提供网站图标"""
    return FileResponse(static / "favicon.ico")


@app.get("/api/music_list")
async def route_music_list():
    """
    获取音乐文件列表

    Returns:
        JSONResponse: 包含所有 MP3 文件名的 JSON 响应
    """
    return JSONResponse({"music_list": music_list})


@app.get("/api/video_list")
async def route_video_list():
    """
    获取视频文件列表

    Returns:
        JSONResponse: 包含所有MP4文件名的JSON响应
    """
    return JSONResponse({"video_list": video_list})


@app.get("/api/get_lrc/{filename}")
async def route_get_lrc(filename: str):
    """
    提供指定歌曲的歌词文件内容

    Args:
        filename (str): 歌词文件名（与对应的音乐文件同名）

    Returns:
        JSONResponse: 包含歌词内容的 JSON 响应，如果文件不存在则返回空内容
    """
    lrc_path = lyrics / filename
    if not lrc_path.exists():
        return JSONResponse({"lyrics": ""})
    content = lrc_path.read_text(encoding="utf-8")
    return JSONResponse({"lyrics": content})


@app.get("/api/play_state")
async def get_play_state():
    """
    获取保存的播放状态

    Returns:
        JSONResponse: 包含当前播放状态的 JSON 响应
    """
    return JSONResponse(play_state.model_dump_json())


@app.post("/api/play_state")
async def save_play_state(state: PlayState):
    """
    保存播放状态

    Args:
        state (PlayState): 播放状态数据

    Returns:
        JSONResponse: 操作结果
    """
    global play_state
    play_state = state

    # 将状态保存到文件
    try:
        state_file.write_text(play_state.model_dump_json(), encoding="utf-8")
        return JSONResponse({"status": "success", "message": "播放状态保存成功"})
    except Exception as e:
        return JSONResponse(
            {"status": "error", "message": f"播放状态保存失败: {str(e)}"},
            status_code=500,
        )


def start():
    """
    启动 FastAPI 服务器

    使用 Uvicorn 在 localhost:41004 上运行 FastAPI 应用
    """
    uvicorn.run("server:app", host="localhost", port=41004)
