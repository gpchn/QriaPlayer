// 播放器核心状态与控制
class Player {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
    this.lyrics = [];
    this.lyricsTimer = null;
    this.loopMode = 2; // 0:无, 1:单曲, 2:列表, 3:随机
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
      const [title, artist] = item.replace(/\.(mp4|webm|ogg)$/i, "").split(" - ");
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
        <div class="song-name">${item.title}${item.type === "video" ? ' <span class="video-tag">[视频]</span>' : ""}</div>
        <div class="song-artist">${item.artist}</div>
      `;
      li.onclick = () => this.playAt(this.playlist.indexOf(item));
      ul.appendChild(li);
    });
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
      const lrcRes = await fetch(`/api/get_lrc/${filename.replace(".mp3", ".lrc")}`);
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
          const t = parseInt(m[1]) * 60 + parseInt(m[2]) + (parseInt(m[3]) || 0) / 100;
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
      if (currentTime >= this.lyrics[i].time) idx = i;
      else break;
    }
    box.innerHTML = this.lyrics
      .map(
        (l, i) =>
          `<div class="${i === idx ? "lyrics-highlight" : ""}">${l.text}</div>`
      )
      .join("");
    // 歌词垂直居中：将当前歌词的中心与歌词框的中心对齐
    if (idx !== -1) {
      const active = box.children[idx];
      if (active) {
        // 歌词框可视区域的中心
        const boxRect = box.getBoundingClientRect();
        const boxScrollTop = box.scrollTop;
        const boxCenter = boxRect.height / 2;
        // 当前歌词元素相对于歌词框顶部的距离
        const activeRect = active.getBoundingClientRect();
        const activeOffset = activeRect.top - boxRect.top + boxScrollTop;
        const activeCenter = activeOffset + active.offsetHeight / 2;
        // 滚动到让当前歌词居中
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
      "icons/loop-off.svg",  // ! 需要补全图标
      "icons/loop-one.svg",
      "icons/loop-list.svg",
      "icons/loop-random.svg"
    ];
    document.getElementById("loopText").textContent = txts[this.loopMode];
    document.getElementById("loopIcon").src = icons[this.loopMode];
    document.getElementById("loopIcon").alt = "循环" + txts[this.loopMode];
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    const muteIcon = document.getElementById("muteIcon");
    if (this.audio.muted) {
      muteIcon.src = "icons/mute.svg"; // ! 需要补全图标
      muteIcon.alt = "静音";
    } else {
      muteIcon.src = "icons/volume.svg";
      muteIcon.alt = "音量";
    }
  }

  setVolume(val) {
    this.audio.volume = val;
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
    // 进度条
    document.getElementById("progressBar").addEventListener("input", (e) => {
      this.seek(e.target.value);
    });
    // 音量
    document.getElementById("volumeSlider").addEventListener("input", (e) => {
      this.setVolume(e.target.value);
    });
    // 控制按钮
    document.getElementById("playBtn").onclick = () => this.togglePlay();
    document.getElementById("prevBtn").onclick = () => this.playPrev();
    document.getElementById("nextBtn").onclick = () => this.playNext();
    document.getElementById("loopBtn").onclick = () => this.toggleLoopMode();
    document.getElementById("muteBtn").onclick = () => this.toggleMute();

    // 音频事件
    this.audio.addEventListener("timeupdate", () => {
      const cur = this.audio.currentTime, dur = this.audio.duration;
      const bar = document.getElementById("progressBar");
      bar.value = ((cur / dur) * 100) || 0;
      bar.style.background = `linear-gradient(to right, #2e7d32 0%, #2e7d32 ${bar.value}%, #555 ${bar.value}%, #555 100%)`;
      document.getElementById("currentTime").textContent = this.formatTime(cur);
      document.getElementById("duration").textContent = this.formatTime(dur);
      this.updateLyrics(cur);
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
      else if (this.loopMode === 3) this.playAt(Math.floor(Math.random() * this.playlist.length));
    });
    this.audio.addEventListener("volumechange", () => {
      document.getElementById("muteBtn").textContent = this.audio.muted ? "🔇" : "🔊";
      document.getElementById("volumeSlider").value = this.audio.volume;
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
