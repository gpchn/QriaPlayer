from PIL import Image
from pathlib import Path
from colorama import init
from threading import Thread
from datetime import datetime
from pystray import MenuItem, Icon
from sys import platform as PLATFORM
from os import startfile, system, _exit
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

try:
    from tomllib import loads  # type: ignore
except ModuleNotFoundError:
    from toml import loads  # type: ignore

# 读取配置文件
cfg_path = Path("config.toml")
cfg = loads(cfg_path.read_text())
HOST = cfg.get("server").get("host")  # 从配置文件中读取服务器主机地址
PORT = cfg.get("server").get("port")  # 从配置文件中读取服务器端口号

init()

app = FastAPI()

# 挂载静态资源
app.mount("/static", StaticFiles(directory="static"), name="static")  # 静态文件目录
app.mount("/musics", StaticFiles(directory="musics"), name="musics")  # 音乐文件目录

# 音乐和歌词文件夹路径
music_dir = Path("musics")
lyrics_dir = Path("lyrics")


@app.get("/", response_class=FileResponse)
async def index():
    """返回主页 HTML 文件"""
    return FileResponse("static/index.html")


@app.get("/favicon.ico")
def favicon():
    """返回网站图标"""
    return FileResponse("static/favicon.ico")


@app.get("/api/music")
async def get_music_list():
    """获取音乐文件列表"""
    try:
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
    """获取指定音乐文件的信息"""
    filepath = Path("musics") / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="音乐文件未找到")

    # 解析音乐文件名，格式为 "标题 - 艺术家.mp3"
    filename_parts = Path(filename).stem.split(" - ", 1)
    title = filename_parts[0]
    artist = filename_parts[1] if len(filename_parts) > 1 else "未知艺术家"

    return {
        "title": title,
        "artist": artist,
    }


@app.get("/api/lyrics/{filename}")
async def get_lyrics(filename: str):
    """获取歌词内容"""
    lrc_path = lyrics_dir / filename
    if not lrc_path.exists():
        raise HTTPException(status_code=404, detail="歌词文件未找到")

    try:
        return JSONResponse(content={"lyrics": lrc_path.read_text("utf-8")})
    except Exception as e:
        return JSONResponse(status_code=500, content={"lyrics": "", "error": str(e)})


# 系统托盘模块
class SysTray:
    def __init__(self, log_dir: Path):
        """初始化系统托盘"""
        self.log_dir = log_dir
        self.icon = None
        self._init_icon()

    def _init_icon(self):
        """初始化托盘图标和菜单"""
        image = Image.open("paio.ico")  # 加载托盘图标文件

        menu = (
            MenuItem("打开页面", self._open_in_browser),
            MenuItem("查看日志", self._open_log),
            MenuItem("重启", self._restart),  # 新增重启选项
            MenuItem("退出", self._on_exit),
        )

        self.icon = Icon("Paio", image, "Paio", menu)

    def _open_log(self, *args):
        """打开最新日志文件"""
        latest_log = self._get_latest_log()
        if latest_log:
            if PLATFORM == "win32":
                startfile(latest_log)
            elif PLATFORM == "darwin":
                system(f"open '{latest_log}'")
            else:
                system(f"xdg-open '{latest_log}'")

    def _on_exit(self, *args):
        """退出程序"""
        self.icon.stop()
        _exit(0)

    def _restart(self, *args):
        """重启程序"""
        from os import execl
        from sys import argv, executable

        self.icon.stop()
        python = executable
        execl(python, python, *argv)

    def _get_latest_log(self):
        """获取最新的日志文件"""
        log_files = list(self.log_dir.glob("*.log"))
        if log_files:
            return max(log_files, key=lambda x: x.stat().st_birthtime)
        return None

    def _open_in_browser(self, *args):
        """在默认浏览器中打开主页"""
        from webbrowser import open

        open(f"http://{HOST}:{PORT}")

    def run(self):
        """在独立线程运行托盘图标"""
        Thread(target=self.icon.run, daemon=True).start()


def configure_logging():
    """配置日志系统"""
    log_dir = Path("log")
    log_dir.mkdir(parents=True, exist_ok=True)

    current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = log_dir / f"{current_time}.log"

    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {
            "file": {
                "class": "logging.FileHandler",
                "filename": str(log_filename),
                "level": "INFO",
                "formatter": "default",
            },
        },
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(asctime)s - %(message)s",
                "use_colors": False,
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["file"], "level": "INFO", "propagate": False},
            "uvicorn.error": {
                "handlers": ["file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["file"],
                "level": "INFO",
                "propagate": False,
                "formatter": "default",
            },
        },
    }
    return log_config, log_dir


def start_server():
    """启动服务器和系统托盘"""
    from uvicorn import run

    # 配置日志
    log_config, log_dir = configure_logging()

    # 启动系统托盘
    tray = SysTray(log_dir)
    tray.run()

    # 启动FastAPI服务
    run(
        app=app,
        host=HOST,
        port=PORT,
        log_config=log_config,
        # 以下参数防止uvicorn占用主线程
        reload=False,
        workers=1,
    )


if __name__ == "__main__":
    start_server()

# todo：修复歌词显示偏移 bug
# todo：将 paio.py 基于命令行的交互挪到网页上
