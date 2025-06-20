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
    const res = await fetch("/api/music");
    const { music_list } = await res.json();
    this.playlist = music_list;
    this.renderPlaylist();
  }

  renderPlaylist(filter = "") {
    const list = filter
      ? this.playlist.filter((s) => s.toLowerCase().includes(filter.toLowerCase()))
      : this.playlist;
    const ul = document.getElementById("playlist");
    ul.innerHTML = "";
    list.forEach((song, idx) => {
      const [name, artist] = song.replace(".mp3", "").split(" - ");
      const li = document.createElement("li");
      li.className = idx === this.currentIndex ? "playing" : "";
      li.innerHTML = `
        <div class="song-name">${name}</div>
        <div class="song-artist">${artist || "未知艺术家"}</div>
      `;
      li.onclick = () => this.playByName(song);
      ul.appendChild(li);
    });
  }

  async playByName(filename) {
    const idx = this.playlist.indexOf(filename);
    if (idx !== -1) await this.playAt(idx);
  }

  async playAt(idx) {
    if (idx < 0 || idx >= this.playlist.length) return;
    this.currentIndex = idx;
    const filename = this.playlist[idx];
    // 歌曲元数据
    let meta = { title: filename.replace(".mp3", ""), artist: "未知艺术家" };
    try {
      const res = await fetch(`/api/music/${filename}`);
      meta = await res.json();
    } catch {}
    document.getElementById("songTitle").textContent = meta.title || filename.replace(".mp3", "");
    document.getElementById("songArtist").textContent = meta.artist || "未知艺术家";
    // 音频
    this.audio.src = `/musics/${filename}`;
    this.audio.play();
    // 歌词
    this.loadLyrics(filename);
    this.renderPlaylist(document.getElementById("searchBox").value);
  }

  async loadLyrics(filename) {
    this.lyrics = [];
    try {
      const lrcRes = await fetch(`/api/lyrics/${filename.replace(".mp3", ".lrc")}`);
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
    // 歌词滚动
    if (idx !== -1) {
      const active = box.children[idx];
      if (active) {
        const cH = box.clientHeight, lT = active.offsetTop, lH = active.offsetHeight;
        box.scrollTo({ top: lT - (cH - lH) / 2, behavior: "smooth" });
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
    if (this.audio.paused) this.audio.play();
    else this.audio.pause();
  }

  toggleLoopMode() {
    this.loopMode = (this.loopMode + 1) % 4;
    this.audio.loop = this.loopMode === 1;
    const txt = ["关", "单曲", "全部", "随机"][this.loopMode];
    document.getElementById("loopBtn").textContent = `循环：${txt}`;
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
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
      document.getElementById("playBtn").textContent = this.audio.paused ? "▶" : "⏸";
    });
    this.audio.addEventListener("ended", () => {
      if (this.loopMode === 1) this.audio.play();
      else if (this.loopMode === 2) this.playNext();
      else if (this.loopMode === 3) this.playAt(Math.floor(Math.random() * this.playlist.length));
    });
    this.audio.addEventListener("volumechange", () => {
      document.getElementById("muteBtn").textContent = this.audio.muted ? "🔇" : "🔊";
      document.getElementById("volumeSlider").value = this.audio.volume;
    });
    // 初始化音量
    this.audio.volume = 1;
    document.getElementById("volumeSlider").value = 1;
  }
}

// 初始化播放器
window.player = new Player();
window.addEventListener("load", () => player.loadPlaylist());
