from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from uvicorn import run as uvicorn_run
from colorama import init

init()

app = FastAPI()

# 挂载静态资源
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/musics", StaticFiles(directory="musics"), name="musics")


@app.get("/", response_class=FileResponse)
async def index():
    return FileResponse("static/index.html")


@app.get("/favicon.ico")
def favicon():
    return FileResponse("static/favicon.ico")


@app.get("/api/music")
async def get_music_list():
    # 读取音乐文件列表
    try:
        music_dir = Path("musics")
        music_files = [
            f.name for f in music_dir.iterdir() if f.suffix.lower() == ".mp3"
        ]
        return JSONResponse(content={"music_list": music_files})
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"读取音乐列表失败: {str(e)}"}
        )


@app.get("/api/music/{filename}")
async def get_music_info(filename: str):
    # 检查音乐文件是否存在
    filepath = Path("musics") / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="音乐文件未找到")

    # 解析音乐文件
    filename_parts = Path(filename).stem.split(" - ", 1)
    title = filename_parts[0]
    artist = filename_parts[1] if len(filename_parts) > 1 else "未知艺术家"

    return {
        "title": title,
        "artist": artist,
    }


@app.get("/api/lyrics/{filename}")
async def get_lyrics(filename: str):
    # 读取歌词文件
    lrc_path = Path("lyrics") / filename
    if not lrc_path.exists():
        raise HTTPException(status_code=404, detail="歌词文件未找到")

    # 返回歌词内容
    try:
        return JSONResponse(content={"lyrics": lrc_path.read_text("utf-8")})
    except Exception as e:
        return JSONResponse(status_code=500, content={"lyrics": "", "error": str(e)})


if __name__ == "__main__":
    uvicorn_run(app, host="localhost", port=41004)

# todo：修复歌词显示偏移 bug
# todo：将 paio.py 基于命令行的交互挪到网页上
