#!/usr/bin/env python3
# coding=utf-8
"""
QriaPlayer 主程序入口

该脚本是QriaPlayer应用的主入口点，负责：
1. 启动后端FastAPI服务器作为守护线程
2. 启动PyWebView前端界面
3. 在前端界面关闭时确保整个应用程序正常退出
"""

import server
import webview
from os import _exit
from threading import Thread

# 启动后端服务器
server_thread = Thread(target=server.start, daemon=True)  # 作为守护线程启动，确保主线程结束时后端自动关闭
server_thread.start()

# 创建并配置前端窗口
main_window = webview.create_window(
    "QriaPlayer",  # 应用标题
    "http://localhost:41004",  # 后端服务器地址
    width=1080,  # 初始窗口宽度
    height=720,  # 初始窗口高度
    resizable=True,  # 允许调整窗口大小
    text_select=False,  # 禁用文本选择
    js_api=server,  # 将后端服务器对象传递给前端，允许前端调用后端API
)

# 启动PyWebView，这将阻塞主线程直到窗口关闭
webview.start(icon="static/favQriaPlayer.ico", http_server=False)

# 当窗口关闭后，强制退出所有线程以确保应用完全关闭
# 使用_exit而不是sys.exit确保所有线程立即终止
_exit(0)

