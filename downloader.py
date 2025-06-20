#!/usr/bin/env python3
# coding=utf-8

import httpx
import asyncio
import bilibili_api as ba
from pathlib import Path
from tomllib import loads
from pyffmpeg import FFmpeg


apis_toml = Path(__file__).parent / "apis.toml"
apis = loads(apis_toml.read_text(encoding="utf-8"))


async def bilibili_search(keyword: str) -> list[list[str]]:
    """
    搜索视频

    Args:
        keyword (str): 搜索关键词

    Returns:
        list[list[str]]: [[标题, BV 号], [标题, BV 号], ...]
    """
    videos = ba.sync(ba.search.search(keyword))["result"][11]["data"]
    result = []
    for v in videos:
        result.append([v["title"], v["bvid"]])
    return result


def bilibili_download(bvid: str, out: Path | str) -> None:
    """
    通过 BV 号下载视频

    Args:
        bvid (str): BV 号

    Returns:
        bool: 是否为 FLV 流
        str: 视频流下载链接（MP4 第一个是视频流，第二个是音频流）
    """
    out = Path(out)
    v = ba.video.Video(bvid)
    # 获取视频下载链接
    data = asyncio.run(v.get_download_url(0))
    # 解析视频下载信息
    detecter = ba.video.VideoDownloadURLDataDetecter(data)
    streams = detecter.detect_best_streams()
    # FLV 流下载
    if detecter.check_flv_mp4_stream() == True:
        data = httpx.get(streams[0].url).content
        # 转为 MP4
        ff = FFmpeg()
        ff.options(f"-i {data} -c copy {out}")
    # MP4 流下载
    else:
        video_data = httpx.get(streams[0].url).content  # 视频流
        video_tmp = out.with_suffix(".video.tmp")
        video_tmp.write_bytes(video_data)
        audio_data = httpx.get(streams[1].url).content  # 音频流
        audio_tmp = out.with_suffix(".audio.tmp")
        audio_tmp.write_bytes(audio_data)
        # 合并
        ff = FFmpeg()
        ff.options(f"-i {video_tmp} -i {audio_tmp} -vcodec copy -acodec copy {out}")
        # 删除临时文件
        video_tmp.unlink()
        audio_tmp.unlink()


if __name__ == "__main__":
    bilibili_download("BV1n24y1V7a6", "富士山下.mp4")
