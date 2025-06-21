#!/usr/bin/env python3
# coding=utf-8

import server
import webview
from os import _exit
from threading import Thread

# 启动后端
server_thread = Thread(target=server.start) # type: ignore
server_thread.start()
# 启动前端
main_window = webview.create_window(
    "Paio",
    "http://localhost:41004",
    width=1080,
    height=720,
    resizable=True,
    text_select=False,
)
webview.start(icon="assets/icon.ico", http_server=False)
# 如果前端退出，则后端强制退出
_exit(0)
