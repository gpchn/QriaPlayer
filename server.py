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

import json
import bottle
from pathlib import Path
from waitress import serve

# 创建Bottle应用
app: bottle.Bottle = bottle.Bottle()


# 数据模型定义
class PlayState:
    """播放状态数据模型"""

    def __init__(self, filename: str = "", current_time: float = 0.0) -> None:
        self.filename: str = filename
        self.current_time: float = current_time

    def to_dict(self) -> dict:
        return {"filename": self.filename, "current_time": self.current_time}

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

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
        saved_state = json.loads(state_file.read_text(encoding="utf-8"))
        play_state = PlayState.from_dict(saved_state)
    except Exception as e:
        print(f"加载播放状态失败: {e}")


# 路由定义
@app.route("/")  # type: ignore
def route_index():
    """提供主页HTML文件"""
    return bottle.static_file("index.html", root=str(static))


@app.route("/favicon.ico")  # type: ignore
def route_favicon():
    """提供网站图标"""
    return bottle.static_file("favicon.ico", root=str(static))


# 静态文件路由
@app.route("/static/<filepath:path>")  # type: ignore
def serve_static(filepath):
    """提供静态文件"""
    return bottle.static_file(filepath, root=str(static))


# 媒体文件路由
@app.route("/media/music/<filepath:path>")  # type: ignore
def serve_music(filepath):
    """提供音乐文件"""
    return bottle.static_file(filepath, root=str(musics))


@app.route("/media/video/<filepath:path>")  # type: ignore
def serve_video(filepath):
    """提供视频文件"""
    return bottle.static_file(filepath, root=str(videos))


@app.get("/api/playlist")  # type: ignore
def route_playlist() -> str:
    """
    获取统一播放列表（包含音乐和视频）

    Returns:
        dict: 包含混合媒体条目的 JSON 响应
    """

    def _parse_media(filename: str, media_type: str):
        """解析媒体文件名公共方法"""
        if media_type == "music":
            base_name = filename.replace(".mp3", "")
        else:  # video
            base_name = filename.replace(".mp4", "")
        parts = base_name.split(" - ")
        return {
            "type": media_type,
            "filename": filename,
            "title": parts[0] if len(parts) > 1 else base_name,
            "artist": (
                parts[1]
                if len(parts) > 1
                else "未知艺术家" if media_type == "music" else "未知作者"
            ),
        }

    # 合并并解析媒体列表
    media_list = [_parse_media(f.name, "music") for f in musics.glob("*.mp3")] + [
        _parse_media(f.name, "video") for f in videos.glob("*.mp4")
    ]

    # 按标题排序（可选）
    media_list.sort(key=lambda x: x["title"])

    bottle.response.content_type = "application/json"
    return json.dumps({"playlist": media_list})


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
        bottle.response.content_type = "application/json"
        return json.dumps({"lyrics": ""})

    content = lrc_path.read_text(encoding="utf-8")
    bottle.response.content_type = "application/json"
    return json.dumps({"lyrics": content})


@app.get("/api/play_state")  # type: ignore
def get_play_state() -> str:
    """
    获取保存的播放状态

    Returns:
        dict: 包含当前播放状态的 JSON 响应
    """
    bottle.response.content_type = "application/json"
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
        data = bottle.request.json
        play_state = PlayState.from_dict(data)

        # 将状态保存到文件
        state_file.write_text(json.dumps(play_state.to_dict()), "utf-8")
        bottle.response.content_type = "application/json"
        return json.dumps({"status": "success", "message": "播放状态保存成功"})
    except Exception as e:
        bottle.response.status = 500
        bottle.response.content_type = "application/json"
        return json.dumps({"status": "error", "message": f"播放状态保存失败: {str(e)}"})


def start():
    """
    启动 Bottle 服务器

    在 localhost:41004 上运行 Bottle 应用
    """
    serve(app, host="localhost", port=41004)
