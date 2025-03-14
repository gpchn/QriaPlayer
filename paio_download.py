#!/usr/bin/env python3
# coding=utf-8
from pathlib import Path
from orjson import loads as loads_json
from tomllib import loads as loads_toml
from colorama import init, Fore
from httpx import get

init()

config_path = Path("config.toml")
config = loads_toml(config_path.read_text())
NCM_DLINK_API = config.get("ncm").get("direct_link")
NCM_SEARCH_API = config.get("ncm").get("search")
NCM_LYRIC_API = config.get("ncm").get("lyric")
QQ_DLINK_API = config.get("qq").get("direct_link")
QQ_SEARCH_API = config.get("qq").get("search")
KUGOU_DLINK_API = config.get("kugou").get("direct_link")
KUGOU_SEARCH_API = config.get("kugou").get("search")


def main():
    while True:
        # 搜索歌曲
        name = input(f"请输入歌曲名：")
        """
        ncm_songs = ncm_search(name)
        qq_songs  = qq_search(name)
        songs = ncm_songs + qq_songs
        """
        songs = ncm_search(name)

        # 指定序号
        choosed_inedx = input("请输入序号（1~10）：")
        if not choosed_inedx.isdigit():
            input("输入有误，操作取消")
            exit(1)
        choosed_inedx = int(choosed_inedx)
        if choosed_inedx > 10:
            input("输入有误，操作取消")
            exit(1)

        # 获取指定歌曲 tuple
        print("正在获取歌曲 ID……")
        choosed_song = songs[choosed_inedx - 1]
        music_id = choosed_song[0]

        # 解析直链
        print("正在下载歌曲……")
        """
        if choosed_inedx <= 5:
            mp3_data = ncm_analyze(music_id)
            lrc_data = ncm_lyric(music_id)
        elif choosed_inedx <= 10:
            mp3_data = qq_analyze(music_id)
        elif choosed_inedx <= 15:
            mp3_data = kugou_analyze(music_id)
        """
        mp3_data = ncm_analyze(music_id)
        lrc_data = ncm_lyric(music_id)

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


# QQ 音乐搜索
def qq_search(name: str, num: int = 5) -> list:
    resq_search = get(QQ_SEARCH_API % (name, num))
    search_result = loads_json(resq_search.text).get("data").get("song").get("list")
    songs = []

    for index, song in enumerate(search_result, 6):
        formatted_data = song.get("f").split("|")
        song_id = formatted_data[0]
        song_name = formatted_data[1].split("(")[0].rstrip()
        song_artist = formatted_data[3]
        # 一首歌提取成一个元组推到 songs 列表里
        songs.append((song_id, song_name, song_artist))
        # 输出信息供选择
        print(f"[{index}] {Fore.GREEN}{song_name} - {song_artist}{Fore.RESET}")

    return songs


# QQ 音乐直链解析
def qq_analyze(id: int) -> bytes:
    # 获取 id 对应的音乐直链
    resq_analyze = get(QQ_DLINK_API % id)
    dlink = loads_json(resq_analyze.text)[0]
    input(dlink)
    # 下载 mp3 二进制数据
    resq_mp3 = get(resq_analyze)

    return resq_mp3.content


def kugou_search(): ...


def kugou_analyze(): ...


if __name__ == "__main__":
    main()