// 播放器核心状态与控制
class Player {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
    this.lyrics = [];
    this.lyricsTimer = null;
    this.loopMode = 2; // 0:无, 1:单曲, 2:列表, 3:随机
    this.isUserScrollingLyrics = false; // 新增：标记用户是否正在滚动歌词
    this.userScrollingTimeout = null; // 新增：用户滚动超时定时器
    this.initEvents();
  }

  async loadPlaylist() {
    // 获取歌曲列表
    const musicRes = await fetch("/api/music_list");
    const { music_list } = await musicRes.json();
    // 获取视频列表
    const videoRes = await fetch("/api/video_list");
    const { video_list } = await videoRes.json();

    // 歌曲格式化
    const musicItems = music_list.map((item) => {
      // item: "[歌名] - [歌手]"
      const [title, artist] = item.replace(".mp3", "").split(" - ");
      return {
        type: "music",
        filename: item,
        title: title || item.replace(".mp3", ""),
        artist: artist || "未知艺术家",
      };
    });

    // 视频格式化
    const videoItems = video_list.map((item) => {
      // item: "[视频名] - [作者]"
      const [title, artist] = item
        .replace(/\.(mp4|webm|ogg)$/i, "")
        .split(" - ");
      return {
        type: "video",
        filename: item,
        title: title || item,
        artist: artist || "未知作者",
      };
    });

    // 合并播放列表
    this.playlist = [...musicItems, ...videoItems];
    this.renderPlaylist();
  }

  renderPlaylist(filter = "") {
    const list = filter
      ? this.playlist.filter(
          (s) =>
            s.title.toLowerCase().includes(filter.toLowerCase()) ||
            s.artist.toLowerCase().includes(filter.toLowerCase())
        )
      : this.playlist;
    const ul = document.getElementById("playlist");
    ul.innerHTML = "";
    list.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = idx === this.currentIndex ? "playing" : "";
      // 区分视频和音频
      if (item.type === "video") {
        li.classList.add("video-item");
      }
      li.innerHTML = `
        <div class="song-name">${item.title}${
        item.type === "video" ? ' <span class="video-tag">[视频]</span>' : ""
      }</div>
        <div class="song-artist">${item.artist}</div>
      `;
      li.onclick = () => this.playAt(this.playlist.indexOf(item));
      ul.appendChild(li);
    });

    // 触发检查当前播放歌曲是否在可视区域内
    this.updateScrollToPlayingButton();
  }

  updateScrollToPlayingButton() {
    const playlistContainer = document.querySelector(".playlist-container");
    const scrollToPlayingBtn = document.getElementById("scrollToPlayingBtn");
    if (!playlistContainer || !scrollToPlayingBtn) return;

    const playingElement = document.querySelector("#playlist li.playing");
    if (playingElement && this.currentIndex >= 0) {
      const playlistRect = playlistContainer.getBoundingClientRect();
      const playingRect = playingElement.getBoundingClientRect();

      // 当前播放歌曲不在可视区域内时显示按钮
      if (playingRect.top < playlistRect.top || playingRect.bottom > playlistRect.bottom) {
        scrollToPlayingBtn.classList.add("show");
      } else {
        scrollToPlayingBtn.classList.remove("show");
      }
    } else {
      scrollToPlayingBtn.classList.remove("show");
    }
  }

  async playByName(filename) {
    const idx = this.playlist.findIndex((item) => item.filename === filename);
    if (idx !== -1) await this.playAt(idx);
  }

  async playAt(idx) {
    if (idx < 0 || idx >= this.playlist.length) return;
    this.currentIndex = idx;
    const item = this.playlist[idx];

    document.getElementById("songTitle").textContent = item.title;
    document.getElementById("songArtist").textContent = item.artist;

    if (item.type === "music") {
      // 音频
      this.audio.src = `/api/get_mp3/${item.filename}`;
      this.audio.play();
      // 歌词
      this.loadLyrics(item.filename);
    } else if (item.type === "video") {
      // 视频项：这里只做提示，实际可扩展为弹窗或切换video标签
      this.audio.pause();
      this.audio.src = "";
      this.lyrics = [];
      this.updateLyrics(0);
      alert("当前为视频项，请在支持的视频播放器中播放。");
    }
    this.renderPlaylist(document.getElementById("searchBox").value);

    // 更新返回当前播放歌曲按钮状态
    setTimeout(() => this.updateScrollToPlayingButton(), 300); // 延迟一点执行，确保DOM已更新
  }

  async loadLyrics(filename) {
    // 仅音频加载歌词
    if (!filename.endsWith(".mp3")) {
      this.lyrics = [];
      this.updateLyrics(0);
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

  playPrev() {
    if (this.loopMode === 3) {
      this.playAt(Math.floor(Math.random() * this.playlist.length));
    } else {
      let idx = this.currentIndex - 1;
      if (idx < 0) idx = this.playlist.length - 1;
      this.playAt(idx);
    }
  }

  playNext() {
    if (this.loopMode === 3) {
      this.playAt(Math.floor(Math.random() * this.playlist.length));
    } else {
      let idx = (this.currentIndex + 1) % this.playlist.length;
      this.playAt(idx);
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play();
      document.getElementById("playPauseIcon").src = "icons/pause.svg";
      document.getElementById("playPauseIcon").alt = "暂停";
    } else {
      this.audio.pause();
      document.getElementById("playPauseIcon").src = "icons/play.svg";
      document.getElementById("playPauseIcon").alt = "播放";
    }
  }

  toggleLoopMode() {
    this.loopMode = (this.loopMode + 1) % 4;
    this.audio.loop = this.loopMode === 1;
    const txts = ["关", "单曲", "全部", "随机"];
    const icons = [
      "icons/loop-off.svg",
      "icons/loop-one.svg",
      "icons/loop-list.svg",
      "icons/loop-random.svg",
    ];
    document.getElementById("loopText").textContent = txts[this.loopMode];
    document.getElementById("loopIcon").src = icons[this.loopMode];
    document.getElementById("loopIcon").alt = "循环" + txts[this.loopMode];
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    const muteIcon = document.getElementById("muteIcon");
    if (this.audio.muted) {
      muteIcon.src = "icons/mute.svg";
      muteIcon.alt = "静音";
    } else {
      muteIcon.src = "icons/volume.svg";
      muteIcon.alt = "音量";
    }
  }

  setVolume(val) {
    this.audio.volume = val;
    // 更新滑块颜色
    const volumeSlider = document.getElementById("volumeSlider");
    volumeSlider.style.setProperty('--volume-percent', val * 100 + '%');
  }

  seek(val) {
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = this.audio.duration * (val / 100);
    }
  }

  formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  initEvents() {
    // 搜索
    document.getElementById("searchBox").addEventListener("input", (e) => {
      this.renderPlaylist(e.target.value);
    });

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

    // 回到顶部按钮和返回当前播放歌曲按钮逻辑
    const playlistContainer = document.querySelector(".playlist-container");
    const scrollTopBtn = document.getElementById("scrollTopBtn");
    const scrollToPlayingBtn = document.getElementById("scrollToPlayingBtn");

    function updateScrollButtonsPos() {
      const rect = playlistContainer.getBoundingClientRect();
      scrollTopBtn.style.right = window.innerWidth - rect.right + 16 + "px";
      scrollTopBtn.style.bottom = window.innerHeight - rect.bottom + 24 + "px";
      scrollToPlayingBtn.style.right = window.innerWidth - rect.right + 16 + "px";
      scrollToPlayingBtn.style.bottom = window.innerHeight - rect.bottom + 76 + "px"; // 在顶部按钮上方
    }

    window.addEventListener("resize", updateScrollButtonsPos);
    window.addEventListener("scroll", updateScrollButtonsPos);
    updateScrollButtonsPos();

    playlistContainer.addEventListener("scroll", () => {
      // 回到顶部按钮显示逻辑
      if (playlistContainer.scrollTop > 120) {
        scrollTopBtn.classList.add("show");
      } else {
        scrollTopBtn.classList.remove("show");
      }

      // 返回到当前播放歌曲按钮显示逻辑
      player.updateScrollToPlayingButton();
    });

    scrollTopBtn.onclick = () => {
      playlistContainer.scrollTo({ top: 0, behavior: "smooth" });
    };

    scrollToPlayingBtn.onclick = () => {
      const playingElement = document.querySelector("#playlist li.playing");
      if (playingElement) {
        playingElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    // 进度条
    document.getElementById("progressBar").addEventListener("input", (e) => {
      this.seek(e.target.value);
    });
    // 音量
    const volumeSlider = document.getElementById("volumeSlider");
    volumeSlider.addEventListener("input", (e) => {
      const value = e.target.value;
      this.setVolume(value);
      // 更新滑块颜色
      volumeSlider.style.setProperty('--volume-percent', value * 100 + '%');
    });
    // 初始设置滑块颜色
    volumeSlider.style.setProperty('--volume-percent', '100%');
    // 控制按钮
    document.getElementById("playBtn").onclick = () => this.togglePlay();
    document.getElementById("prevBtn").onclick = () => this.playPrev();
    document.getElementById("nextBtn").onclick = () => this.playNext();
    document.getElementById("loopBtn").onclick = () => this.toggleLoopMode();
    document.getElementById("muteBtn").onclick = () => this.toggleMute();

    // 音频事件
    this.audio.addEventListener("timeupdate", () => {
      const cur = this.audio.currentTime,
        dur = this.audio.duration;
      const bar = document.getElementById("progressBar");
      bar.value = (cur / dur) * 100 || 0;
      bar.style.background = `linear-gradient(to right, #2e7d32 0%, #2e7d32 ${bar.value}%, #555 ${bar.value}%, #555 100%)`;
      document.getElementById("currentTime").textContent = this.formatTime(cur);
      document.getElementById("duration").textContent = this.formatTime(dur);
      this.updateLyrics(cur);
      // 定期检查当前播放歌曲是否在可视区域内
      if (cur % 2 < 0.1) { // 每2秒检查一次，避免频繁检查
        this.updateScrollToPlayingButton();
      }
      // 播放/暂停图标切换
      const playPauseIcon = document.getElementById("playPauseIcon");
      if (this.audio.paused) {
        playPauseIcon.src = "icons/play.svg";
        playPauseIcon.alt = "播放";
      } else {
        playPauseIcon.src = "icons/pause.svg";
        playPauseIcon.alt = "暂停";
      }
    });
    this.audio.addEventListener("ended", () => {
      if (this.loopMode === 1) this.audio.play();
      else if (this.loopMode === 2) this.playNext();
      else if (this.loopMode === 3)
        this.playAt(Math.floor(Math.random() * this.playlist.length));
    });
    this.audio.addEventListener("volumechange", () => {
      const volumeSlider = document.getElementById("volumeSlider");
      volumeSlider.value = this.audio.volume;
      // 更新滑块颜色
      volumeSlider.style.setProperty('--volume-percent', this.audio.volume * 100 + '%');

      const muteIcon = document.getElementById("muteIcon");
      if (this.audio.muted || this.audio.volume === 0) {
        muteIcon.src = "icons/mute.svg";
        muteIcon.alt = "静音";
      } else {
        muteIcon.src = "icons/volume.svg";
        muteIcon.alt = "音量";
      }
    });
    // 初始化音量
    this.audio.volume = 1;
    document.getElementById("volumeSlider").value = 1;
  }
}

// 初始化播放器
window.player = new Player();
window.addEventListener("load", () => player.loadPlaylist());
