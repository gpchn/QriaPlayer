/**
 * LyricsManager.js - 歌词管理模块
 * 负责歌词加载、解析、显示和同步
 */

class LyricsManager {
  constructor() {
    this.lyrics = [];
    this.lyricsTimer = null;
    this.isUserScrollingLyrics = false; // 标记用户是否正在滚动歌词
    this.userScrollingTimeout = null; // 用户滚动超时定时器
    this.initEvents();
  }

  async loadLyrics(filename) {
    // 仅音频加载歌词
    if (!filename.endsWith(".mp3")) {
      this.clearLyrics();
      return;
    }

    this.lyrics = [];
    try {
      const lrcRes = await fetch(
        `/api/get_lrc/${filename.replace(".mp3", ".lrc")}`
      );
      const { lyrics } = await lrcRes.json();
      this.lyrics = this.parseLyrics(lyrics);
    } catch {
      this.lyrics = [];
    }
    this.updateLyrics(0);
  }

  parseLyrics(lrc) {
    return lrc
      .split("\n")
      .map((line) => {
        const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
        if (m) {
          const t =
            parseInt(m[1]) * 60 +
            parseInt(m[2]) +
            ((m[3] ? parseInt(m[3].padEnd(3, '0')) : 0) / 1000);
          return { time: t, text: m[4].trim() };
        }
        return null;
      })
      .filter((x) => x && x.text);
  }

  updateLyrics(currentTime) {
    const box = document.getElementById("lyricsBox");
    if (!this.lyrics.length) {
      box.innerHTML = "<div>暂无歌词</div>";
      return;
    }

    let idx = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (currentTime < this.lyrics[i].time) {
        idx = i - 1;
        break;
      }
    }
    if (idx === -1 && currentTime >= this.lyrics[this.lyrics.length - 1].time) {
      idx = this.lyrics.length - 1;
    }

    box.innerHTML = this.lyrics
      .map(
        (l, i) =>
          `<div class="${i === idx ? "lyrics-highlight" : ""}">${l.text}</div>`
      )
      .join("");

    // 歌词垂直居中：将当前歌词的中心与歌词框的中心对齐
    // 只有当用户没有正在滚动歌词时才自动滚动
    if (idx !== -1 && !this.isUserScrollingLyrics) {
      const active = box.children[idx];
      if (active) {
        const boxRect = box.getBoundingClientRect();
        const boxScrollTop = box.scrollTop;
        const boxCenter = boxRect.height / 2;
        const activeRect = active.getBoundingClientRect();
        const activeOffset = activeRect.top - boxRect.top + boxScrollTop;
        const activeCenter = activeOffset + active.offsetHeight / 2;
        const targetScroll = activeCenter - boxCenter;
        box.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  }

  clearLyrics() {
    this.lyrics = [];
    this.updateLyrics(0);
  }

  initEvents() {
    // 歌词滚动检测
    const lyricsBox = document.getElementById("lyricsBox");
    lyricsBox.addEventListener("scroll", () => {
      // 用户开始滚动歌词
      this.isUserScrollingLyrics = true;

      // 清除之前的超时器
      if (this.userScrollingTimeout) {
        clearTimeout(this.userScrollingTimeout);
      }

      // 设置新的超时器：用户停止滚动1.5秒后，恢复自动滚动
      this.userScrollingTimeout = setTimeout(() => {
        this.isUserScrollingLyrics = false;
      }, 1500);
    });

    // 歌词滚动条mousedown和mouseup事件监听
    lyricsBox.addEventListener("mousedown", () => {
      this.isUserScrollingLyrics = true;
    });

    document.addEventListener("mouseup", () => {
      // 设置超时器：鼠标释放后0.8秒恢复自动滚动
      if (this.userScrollingTimeout) {
        clearTimeout(this.userScrollingTimeout);
      }
      this.userScrollingTimeout = setTimeout(() => {
        this.isUserScrollingLyrics = false;
      }, 800);
    });
  }
}

// 创建单例实例并导出
window.LyricsManager = new LyricsManager();
