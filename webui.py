from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os
from os import system
from pathlib import Path
import uvicorn
from mutagen.mp3 import MP3
from mutagen.id3 import ID3
from pathlib import Path

app = FastAPI()

# 挂载静态资源
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/musics", StaticFiles(directory="musics"), name="musics")
app.mount("/covers", StaticFiles(directory="covers"), name="covers")

class MusicItem(BaseModel):
    filename: str
    title: str
    artist: str
    duration: float
    cover_url: str

def find_related_files(filename: str):
    base_name = Path(filename).stem
    cover_exists = Path(f"covers/{base_name}.jpg").exists()
    return {
        'cover': f"covers/{base_name}.jpg" if cover_exists else 
                f"covers/{base_name}.png" if cover_exists else 
                "/static/default_cover.jpg",
        'lyrics': f"lyrics/{base_name}.lrc"
    }

@app.get("/", response_class=FileResponse)
async def index():
    return "static/index.html"

@app.get("/api/music")
async def get_music_list():
    music_files = []
    for f in os.listdir("musics"):
        if f.lower().endswith('.mp3'):
            music_files.append(f)
    return JSONResponse(content={"music_list": music_files})

@app.get("/api/music/{filename}")
async def get_music_info(filename: str):
    if not os.path.exists(f"musics/{filename}"):
        raise HTTPException(status_code=404, detail="Music not found")
    
    try:
        audio = MP3(f"musics/{filename}", ID3=ID3)
        files = find_related_files(filename)
        
        return {
            "title": audio.tags.get("TIT2", [Path(filename).stem])[0],
            "artist": audio.tags.get("TPE1", ["Unknown Artist"])[0],
            "duration": audio.info.length,
            "cover_url": files['cover'],
            "lyrics_file": files['lyrics']
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/lyrics/{filename}")
async def get_lyrics(filename: str):
    lrc_path = f"lyrics/{filename}"
    if not os.path.exists(lrc_path):
        return {"lyrics": []}
    
    with open(lrc_path, 'r', encoding='utf-8') as f:
        return {"lyrics": [line.strip() for line in f.readlines() if line.strip()]}

@app.websocket("/ws/control")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        # 处理播放控制逻辑
        print("Received command:", data)

if __name__ == "__main__":
    os.system("start http://localhost:41004")
    uvicorn.run(app, host="0.0.0.0", port=41004)