#!/usr/bin/env python3
# coding=utf-8
"""
QriaPlayer 下载器模块

该模块提供B站视频搜索和下载功能，使用bilibili-api-python库与B站API交互。
主要功能包括：
1. 通过关键词搜索B站视频
2. 通过BV号下载B站视频
3. 处理不同类型的视频流（FLV/MP4）并转换为标准MP4格式

该模块可以独立使用，也可以被QriaPlayer的主程序调用。
"""

import httpx
import asyncio
import bilibili_api as ba
from pathlib import Path
from tomllib import loads
from pyffmpeg import FFmpeg


# 加载API配置文件
apis_toml = Path(__file__).parent / "apis.toml"
apis = loads(apis_toml.read_text(encoding="utf-8"))


async def bilibili_search(keyword: str) -> list[list[str]]:
    """
    搜索B站视频

    通过关键词在B站搜索视频，获取视频标题和BV号

    Args:
        keyword (str): 搜索关键词

    Returns:
        list[list[str]]: 搜索结果列表，每个元素为 [标题, BV号] 格式
    """
    videos = ba.sync(ba.search.search(keyword))["result"][11]["data"]
    result = []
    for v in videos:
        result.append([v["title"], v["bvid"]])
    return result


def bilibili_download(bvid: str, out: Path | str) -> None:
    """
    通过BV号下载B站视频

    该函数会自动处理不同类型的视频流，并将其转换为标准MP4格式。
    支持FLV流和分离的音视频流。

    Args:
        bvid (str): B站视频的BV号
        out (Path | str): 输出文件路径

    Returns:
        None: 下载完成后无返回值
    """
    out = Path(out)  # 确保输出路径是Path对象
    v = ba.video.Video(bvid)  # 创建视频对象

    # 获取视频下载链接
    data = asyncio.run(v.get_download_url(0))  # 获取第一个分P的下载链接

    # 解析视频下载信息
    detecter = ba.video.VideoDownloadURLDataDetecter(data)
    streams = detecter.detect_best_streams()  # 获取最佳质量的流

    # 处理FLV流下载
    if detecter.check_flv_mp4_stream() == True:
        data = httpx.get(streams[0].url).content  # 下载FLV流
        # 使用FFmpeg转换为MP4格式
        ff = FFmpeg()
        ff.options(f"-i {data} -c copy {out}")
    # 处理MP4流下载（通常是分离的音视频流）
    else:
        # 下载视频流
        video_data = httpx.get(streams[0].url).content
        video_tmp = out.with_suffix(".video.tmp")
        video_tmp.write_bytes(video_data)

        # 下载音频流
        audio_data = httpx.get(streams[1].url).content
        audio_tmp = out.with_suffix(".audio.tmp")
        audio_tmp.write_bytes(audio_data)

        # 使用FFmpeg合并音视频流
        ff = FFmpeg()
        ff.options(f"-i {video_tmp} -i {audio_tmp} -vcodec copy -acodec copy {out}")

        # 清理临时文件
        video_tmp.unlink()
        audio_tmp.unlink()


# 当作为独立脚本运行时的示例用法
if __name__ == "__main__":
    # 下载示例：将BV1n24y1V7a6对应的视频下载为"富士山下.mp4"
    bilibili_download("BV1n24y1V7a6", "富士山下.mp4")

