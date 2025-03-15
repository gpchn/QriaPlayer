#!/usr/bin/env python3
# coding=utf-8
from pathlib import Path
from orjson import loads as loads_json
from tomllib import loads as loads_toml
from colorama import init, Fore
from httpx import get

init()

CONFIG_PATH = Path("config.toml")
CONFIG = loads_toml(CONFIG_PATH.read_text())
# 网易云音乐
NCM_SEARCH_API = CONFIG["api"]["ncm"]["search"]
NCM_DLINK_API = CONFIG["api"]["ncm"]["direct_link"]
NCM_LYRIC_API = CONFIG["api"]["ncm"]["lyric"]
# 酷狗音乐
KUGOU_SEARCH_API = CONFIG["api"]["kugou"]["search"]
KUGOU_DLINK_API = CONFIG["api"]["kugou"]["direct_link"]
KUGOU_LYRIC_API = CONFIG["api"]["kugou"]["lyric"]


def main():
    while True:
        # 搜索歌曲
        name = input(f"请输入歌曲名：")
        # 请求各平台搜索接口
        ncm_songs = ncm_search(name)
        kugou_songs = kugou_search(name)
        songs = ncm_songs +  kugou_songs

        # 指定序号
        choosed_inedx = input("请输入序号（1~20）：")
        if not choosed_inedx.isdigit():
            input("输入有误，操作取消")
            exit(1)
        choosed_inedx = int(choosed_inedx)
        if choosed_inedx < 1 or choosed_inedx > 20:
            input("输入有误，操作取消")
            exit(1)

        # 获取指定歌曲 tuple
        print("正在获取歌曲 ID……")
        choosed_song = songs[choosed_inedx - 1]
        music_id = choosed_song[0]

        # 解析直链
        print("正在下载歌曲……")
        if choosed_inedx <= 10:
            mp3_data = ncm_analyze(music_id)
            lrc_data = ncm_lyric(music_id)
        elif choosed_inedx <= 20:
            mp3_data = kugou_analyze(music_id)
            lrc_data = kugou_lyric(music_id)

        # 创建文件的 Path 对象
        music_name = f"{choosed_song[1]} - {choosed_song[2]}"
        save_path = Path(f"./musics/{music_name}.mp3")
        lrc_path = Path(f"./lyrics/{music_name}.lrc")
        # 检查文件是否已经存在，如存在，则删除
        if save_path.exists():
            save_path.unlink()
        if lrc_path.exists():
            lrc_path.unlink()

        # 写入数据
        save_path.write_bytes(mp3_data)
        lrc_path.write_text(lrc_data, encoding="utf-8")
        print("下载完成！")


# 网易云音乐搜索
def ncm_search(name: str, num: int = 10) -> list:
    # 通过 name 搜索匹配度最高的前 5 个
    resq_search = get(NCM_SEARCH_API % (name, num))

    print("正在搜索匹配歌曲……")
    # 获取每首音乐的信息
    search_result = loads_json(resq_search.text).get("result").get("songs")
    songs = []

    # 遍历每一首歌，获取 id、名字、歌手信息
    for index, song in enumerate(search_result, 1):
        song_id = song.get("id")
        song_name = song.get("name")
        song_artist = song.get("artists")[0].get("name")
        # 一首歌提取成一个元组推到 songs 列表里
        songs.append((song_id, song_name, song_artist))
        # 输出信息供选择
        print(f"[{index}] {Fore.RED}{song_name} - {song_artist}{Fore.RESET}")

    return songs


# 网易云音乐直链解析
def ncm_analyze(id: int) -> bytes:
    # 获取 id 对应的音乐直链
    resq_analyze = get(NCM_DLINK_API % id)
    # 下载 mp3 二进制数据
    resq_mp3 = get(resq_analyze.text)

    return resq_mp3.content


# 网易云音乐歌词解析
def ncm_lyric(id: int) -> str:
    resq_lrc = get(NCM_LYRIC_API % id)
    lrc = loads_json(resq_lrc.text).get("lrc").get("lyric")

    return lrc


# 酷狗音乐搜索
def kugou_search(name: str, num: int = 10) -> list:
    resq_search = get(KUGOU_SEARCH_API % (name, num))
    search_result = loads_json(resq_search.text).get("data").get("lists")
    songs = []

    for index, song in enumerate(search_result, 11):
        song_id = song.get("FileHash")
        song_name = song.get("SongName")
        song_artist = song.get("SingerName")
        # 一首歌提取成一个元组推到 songs 列表里
        songs.append((song_id, song_name, song_artist))
        # 输出信息供选择
        print(f"[{index}] {Fore.BLUE}{song_name} - {song_artist}{Fore.RESET}")

    return songs


# 酷狗音乐直链解析
def kugou_analyze(music_id: str) -> bytes:
    resq_analyze = get(KUGOU_DLINK_API % music_id)
    input(resq_analyze.json())
    input(resq_analyze.text)
    dlink = loads_json(resq_analyze.text).get("url")
    # 下载 mp3 二进制数据
    resq_mp3 = get(dlink)

    return resq_mp3.content


# 酷狗音乐歌词解析
def kugou_lyric(music_id: str) -> str:
    resq_lrc = get(KUGOU_LYRIC_API % music_id)
    lrc = loads_json(resq_lrc.text).get("data").get("lyrics")

    return lrc


if __name__ == "__main__":
    main()
