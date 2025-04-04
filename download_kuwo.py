#!/usr/bin/env python3
# coding=utf-8
from pathlib import Path
from orjson import loads as loads_json
from tomllib import loads as loads_toml
from colorama import init, Fore
from httpx import get
from html import unescape

init()

CONFIG_PATH = Path("config.toml")
CONFIG = loads_toml(CONFIG_PATH.read_text())
SEARCH_API = CONFIG["api"]["kuwo"]["search"]
DLINK_API = CONFIG["api"]["kuwo"]["direct_link"]
LYRIC_API = CONFIG["api"]["kuwo"]["lyric"]


def main():
    while True:
        # 搜索歌曲
        name = input(f"请输入歌曲名：")
        songs = search(name)

        # 指定序号
        choosed_inedx = input("请输入序号（1~20）：")
        try:
            choosed_inedx = int(choosed_inedx)
            assert 1 <= choosed_inedx <= 20
        except:
            print("输入错误！")
            continue

        # 获取指定歌曲 tuple
        print("正在获取歌曲 ID……")
        choosed_song = songs[choosed_inedx - 1]
        music_id = choosed_song[0]

        # 解析直链
        print("正在下载歌曲……")
        mp3_data = get_dlink(music_id)

        # 创建文件的 Path 对象
        music_name = f"{choosed_song[1]} - {choosed_song[2]}"
        save_path = Path(f"./musics/kuwo/{music_name}.mp3")
        # 检查文件是否已经存在，如存在，则删除
        if save_path.exists():
            save_path.unlink()

        # 写入数据
        save_path.write_bytes(mp3_data)
        print("下载完成！")

# 酷我音乐搜索
def search(name: str, num: int = 10) -> list:
    resp_search = get(SEARCH_API % (name, 1, num))
    search_result = loads_json(resp_search.text.replace("'", '"'))

    songs = []
    for index, song in enumerate(search_result["abslist"], 11):
        mid = unescape(song["MUSICRID"])
        name = unescape(song["NAME"])
        artist = unescape(song["ARTIST"])
        songs.append((mid, name, artist))
        print(f"[{index}] {Fore.YELLOW}{name} - {artist}{Fore.RESET}")

    return songs


# 酷我音乐直链解析
def get_dlink(mid: str) -> bytes:
    resp_analyze = get(DLINK_API % mid)
    resp_mp3 = get(resp_analyze.text)

    return resp_mp3.content


if __name__ == "__main__":
    main()
