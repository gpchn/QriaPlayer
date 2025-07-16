#!/usr/bin/env python3
# coding=utf-8
"""
QriaPlayer 后端服务器

该模块实现了基于 Bottle 的 Web 服务器，为 QriaPlayer 前端提供以下功能：
1. 提供静态资源（HTML、CSS、JavaScript、图标等）
2. 提供 RESTful API 接口访问音乐、视频和歌词文件
3. 管理文件系统中的媒体资源

主要接口：
- GET / - 主页
- GET /api/music_list - 获取音乐文件列表
- GET /api/video_list - 获取视频文件列表
- GET /api/get_lrc/{filename} - 获取指定歌词文件
"""

import orjson
from pathlib import Path
from bottle import Bottle, static_file, request, response, run

# 创建Bottle应用
app: Bottle = Bottle()


# 数据模型定义
class PlayState:
    """播放状态数据模型"""

    def __init__(self, filename: str = "", current_time: float = 0.0) -> None:
        self.filename: str = filename
        self.current_time: float = current_time

    def to_dict(self) -> dict:
        return {"filename": self.filename, "current_time": self.current_time}

    def to_json(self) -> str:
        return orjson.dumps(self.to_dict()).decode()

    @classmethod
    def from_dict(cls, data) -> "PlayState":
        return cls(
            filename=data.get("filename", ""),
            current_time=data.get("current_time", 0.0),
        )


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
        play_state = PlayState.from_dict(saved_state)
    except Exception as e:
        print(f"加载播放状态失败: {e}")


# 路由定义
@app.route("/")  # type: ignore
def route_index():
    """提供主页HTML文件"""
    return static_file("index.html", root=str(static))


@app.route("/favicon.ico")  # type: ignore
def route_favicon():
    """提供网站图标"""
    return static_file("favicon.ico", root=str(static))


# 静态文件路由
@app.route("/static/<filepath:path>")  # type: ignore
def serve_static(filepath):
    """提供静态文件"""
    return static_file(filepath, root=str(static))


# 媒体文件路由
@app.route("/media/music/<filepath:path>")  # type: ignore
def serve_music(filepath):
    """提供音乐文件"""
    return static_file(filepath, root=str(musics))


@app.route("/media/video/<filepath:path>")  # type: ignore
def serve_video(filepath):
    """提供视频文件"""
    return static_file(filepath, root=str(videos))


@app.get("/api/music_list")  # type: ignore
def route_music_list() -> str:
    """
    获取音乐文件列表

    Returns:
        dict: 包含所有 MP3 文件名的 JSON 响应
    """
    response.content_type = "application/json"
    return orjson.dumps({"music_list": music_list}).decode()


@app.get("/api/video_list")  # type: ignore
def route_video_list() -> str:
    """
    获取视频文件列表

    Returns:
        dict: 包含所有MP4文件名的JSON响应
    """
    response.content_type = "application/json"
    return orjson.dumps({"video_list": video_list}).decode()


@app.get("/api/get_lrc/<filename>")  # type: ignore
def route_get_lrc(filename: str) -> str:
    """
    提供指定歌曲的歌词文件内容

    Args:
        filename (str): 歌词文件名（与对应的音乐文件同名）

    Returns:
        dict: 包含歌词内容的 JSON 响应，如果文件不存在则返回空内容
    """
    lrc_path = lyrics / filename
    if not lrc_path.exists():
        response.content_type = "application/json"
        return orjson.dumps({"lyrics": ""}).decode()

    content = lrc_path.read_text(encoding="utf-8")
    response.content_type = "application/json"
    return orjson.dumps({"lyrics": content}).decode()


@app.get("/api/play_state")  # type: ignore
def get_play_state() -> str:
    """
    获取保存的播放状态

    Returns:
        dict: 包含当前播放状态的 JSON 响应
    """
    response.content_type = "application/json"
    return play_state.to_json()


@app.post("/api/play_state")  # type: ignore
def save_play_state() -> str:
    """
    保存播放状态

    Returns:
        dict: 操作结果
    """
    global play_state
    try:
        data = request.json
        play_state = PlayState.from_dict(data)

        # 将状态保存到文件
        state_file.write_bytes(orjson.dumps(play_state.to_dict()))
        response.content_type = "application/json"
        return orjson.dumps(
            {"status": "success", "message": "播放状态保存成功"}
        ).decode()
    except Exception as e:
        response.status = 500
        response.content_type = "application/json"
        return orjson.dumps(
            {"status": "error", "message": f"播放状态保存失败: {str(e)}"}
        ).decode()


def start():
    """
    启动 Bottle 服务器

    在 localhost:41004 上运行 Bottle 应用
    """
    run(app, host="localhost", port=41004)
