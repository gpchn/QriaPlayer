#!/usr/bin/env python3
# coding=utf-8
from pathlib import Path
from orjson import loads as loads_json
from tomllib import loads as loads_toml
from colorama import init, Fore

init()

CONFIG_PATH = Path("config.toml")
CONFIG = loads_toml(CONFIG_PATH.read_text())
SEARCH_API = CONFIG["api"]["ncm"]["search"]
DLINK_API = CONFIG["api"]["ncm"]["direct_link"]
LYRIC_API = CONFIG["api"]["ncm"]["lyric"]


def get(url: str):
    from httpx import get as httpx_get

    try:
        resp = httpx_get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
            },
            timeout=10
        )
        resp.raise_for_status()
        return resp
    except Exception as e:
        print("网络错误！")
        print(e)
        exit(1)


def main():
    while True:
        # 搜索歌曲
        name = input(f"请输入歌曲名：")
        # 请求各平台搜索接口
        songs = search(name)

        # 指定序号
        choosed_index = input("请输入序号（1~20）：")
        try:
            choosed_index = int(choosed_index)
            assert 1 <= choosed_index <= 20
        except:
            print("输入错误！")
            continue

        # 获取指定歌曲 tuple
        print("正在获取歌曲 ID……")
        choosed_song = songs[choosed_index - 1]
        music_id = choosed_song[0]

        # 解析直链
        print(f"正在下载歌曲（ID：{music_id}）……")
        mp3_data = get_dlink(music_id)
        print(f"正在下载歌词……")
        lrc_data = get_lyric(music_id)

        print("下载完成，保存中……")
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
def search(name: str, num: int = 10) -> list:
    # 通过 name 搜索匹配度最高的前 5 个
    resp_search = get(SEARCH_API % (name, num))

    print("正在搜索匹配歌曲……")
    # 获取每首音乐的信息
    search_result = loads_json(resp_search.text).get("result").get("songs")
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
def get_dlink(id: int) -> bytes:
    # 获取 id 对应的音乐直链
    resp_analyze = get(DLINK_API % id)
    # 下载 mp3 二进制数据
    resp_mp3 = get(resp_analyze.text)

    return resp_mp3.content


# 网易云音乐歌词解析
def get_lyric(id: int) -> str:
    resp_lrc = get(LYRIC_API % id)
    lrc = loads_json(resp_lrc.text).get("lrc").get("lyric")

    return lrc


if __name__ == "__main__":
    main()
