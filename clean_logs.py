#!/usr/bin/env python3
# coding=utf-8

from pathlib import Path
from time import time
from colorama import init, Fore

init()
cwd = Path(__file__).parent
log_path = cwd / "log"
logs = list(log_path.glob("*.log"))

R = Fore.RED
RES = Fore.RESET

clean_mode = input(
    f"""[1] 删除所有日志
[2] 删除超过一个月的日志
[3] 仅保留最近的 10MG 日志
请选择："""
)

def remove(path: Path):
    try:
        path.unlink()
    except Exception as e:
        print(f"{R}删除 {path} 失败：{RES}{e}")

# 删除所有日志
if clean_mode == "1":
    for log in logs:
        remove(log)
# 删除超过一个月的日志
elif clean_mode == "2":
    for log in logs:
        if time() - log.stat().st_mtime > 30 * 24 * 60 * 60:
            remove(log)
# 仅保留最近的 10MG 日志
elif clean_mode == "3":
    logs.sort(key=lambda x: x.stat().st_mtime)
    logs = logs[:-10]
    for log in logs:
        remove(log)
else:
    print(f"{R}选项无效，未进行任何操作。{RES}")

input(f"\n清理结束，请按 Enter 退出...")