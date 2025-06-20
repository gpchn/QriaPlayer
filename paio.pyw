#!/usr/bin/env python3
# coding=utf-8

import player
import webview
from os import _exit
from threading import Thread

# 启动后端
player_thread = Thread(target=player.start)
player_thread.start()
# 启动前端
main_window = webview.create_window("Paio", "http://localhost:41004")
webview.start()
# 如果前端退出，则后端强制退出
_exit(0)

