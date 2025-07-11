#!/usr/bin/env python3
# coding=utf-8

import fastapi
import uvicorn
from pathlib import Path


app = fastapi.FastAPI()
# 初始化文件夹
home = Path(__file__).parent
static = home / "static"
musics = home / "musics"
musics.mkdir(exist_ok=True)
music_list = [f.name for f in musics.glob("*.mp3")]
lyrics = home / "lyrics"
lyrics.mkdir(exist_ok=True)
videos = home / "videos"
videos.mkdir(exist_ok=True)
video_list = [f.name for f in videos.glob("*.mp4")]


@app.get("/")
async def route_index():
    return fastapi.responses.FileResponse(static / "index.html")


@app.get("/{filename}")
async def route_favicon(filename):
    return fastapi.responses.FileResponse(static / filename)


@app.get("/icons/{filename}")
async def route_icons(filename):
    return fastapi.responses.FileResponse(static / "icons" / filename)


@app.get("/api/music_list")
async def route_music_list():
    return fastapi.responses.JSONResponse({"music_list": music_list})


@app.get("/api/video_list")
async def route_video_list():
    return fastapi.responses.JSONResponse({"video_list": video_list})


@app.get("/api/get_mp3/{filename}")
async def route_get_mp3(filename: str):
    return fastapi.responses.FileResponse(musics / filename)


@app.get("/api/get_mp4/{filename}")
async def route_get_mp4(filename: str):
    return fastapi.responses.FileResponse(videos / filename)


@app.get("/api/get_lrc/{filename}")
async def route_get_lrc(filename: str):
    lrc_path = lyrics / filename
    if not lrc_path.exists():
        return fastapi.responses.JSONResponse({"lyrics": ""})
    content = lrc_path.read_text(encoding="utf-8")
    return fastapi.responses.JSONResponse({"lyrics": content})


def start():
    uvicorn.run("server:app", host="localhost", port=41004)
