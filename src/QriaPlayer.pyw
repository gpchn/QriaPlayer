#!/usr/bin/env python3
# coding=utf-8
"""
QriaPlayer 主程序入口

该脚本是QriaPlayer应用的主入口点，负责：
1. 启动后端 Bottle + Waitress 服务器作为守护线程
2. 启动 PyWebView 前端界面
3. 创建系统托盘图标和菜单
4. 在前端界面关闭时确保整个应用程序正常退出
"""

import server
import webview
import pystray
from PIL import Image
from os import _exit
from threading import Thread


# 全局变量，用于跟踪窗口状态
window_visible = True
main_window = None
tray_icon = None


# 显示窗口函数
def show_window():
    global window_visible
    if not window_visible and main_window:
        main_window.show()
        window_visible = True


# 隐藏窗口函数
def hide_window():
    global window_visible
    if window_visible and main_window:
        main_window.hide()
        window_visible = False


# 创建系统托盘图标
def setup_tray():
    global tray_icon, main_window

    # 退出应用函数
    def quit_application():
        global tray_icon
        if tray_icon:
            tray_icon.stop()
        _exit(0)

    def click_menu(icon, item):
        if window_visible:
            hide_window()
            icon.notify("QriaPlayer", "窗口已隐藏")
        else:
            show_window()
            icon.notify("QriaPlayer", "窗口已显示")

    # 加载图标
    icon_image = Image.open("QriaPlayer.ico")

    # 创建菜单
    menu = (
        pystray.MenuItem("显示", show_window),
        pystray.MenuItem("隐藏", hide_window),
        pystray.MenuItem("退出", quit_application),
        pystray.MenuItem("", click_menu, default=True, visible=False),
    )

    # 创建系统托盘图标
    tray_icon = pystray.Icon("QriaPlayer", icon_image, "QriaPlayer", menu)

    # 启动系统托盘
    tray_icon.run()


# 窗口关闭事件处理（最小化到系统托盘而不是退出）
def on_closed():
    hide_window()
    return True  # 返回 True 表示已处理此事件，阻止窗口真正关闭


# 启动后端服务器
server_thread = Thread(
    target=server.start, daemon=True
)  # 作为守护线程启动，确保主线程结束时后端自动关闭
server_thread.start()

# 创建并配置前端窗口
main_window = webview.create_window(
    "QriaPlayer",  # 应用标题
    "http://localhost:41004",  # 后端服务器地址
    width=1080,  # 初始窗口宽度
    height=720,  # 初始窗口高度
    resizable=True,  # 允许调整窗口大小
    text_select=False,  # 禁用文本选择
)

# 设置窗口关闭事件处理器
main_window.events.closed += on_closed
# 设置系统托盘
Thread(target=setup_tray, daemon=True).start()

# 启动 PyWebView，这将阻塞主线程直到窗口关闭
webview.start(icon="QriaPlayer.ico", http_server=False)

# 当窗口关闭后，强制退出所有线程以确保应用完全关闭
# 使用_exit而不是sys.exit确保所有线程立即终止
_exit(0)
