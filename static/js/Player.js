/**
 * Player.js - 播放器核心类
 * 负责音频播放、控制和状态管理
 */

class Player {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
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
    UIController.renderPlaylist(this.playlist, this.currentIndex);
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
      LyricsManager.loadLyrics(item.filename);
    } else if (item.type === "video") {
      // 视频项：这里只做提示，实际可扩展为弹窗或切换video标签
      this.audio.pause();
      this.audio.src = "";
      LyricsManager.clearLyrics();
      alert("当前为视频项，请在支持的视频播放器中播放。");
    }
    UIController.renderPlaylist(this.playlist, this.currentIndex);
    UIController.updateScrollToPlayingButton();

    // 更新返回当前播放歌曲按钮状态
    setTimeout(() => UIController.updateScrollToPlayingButton(), 300); // 延迟一点执行，确保DOM已更新
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
    UIController.updateMuteIcon(this.audio.muted);
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
      LyricsManager.updateLyrics(cur);

      // 定期检查当前播放歌曲是否在可视区域内
      if (cur % 2 < 0.1) { // 每2秒检查一次，避免频繁检查
        UIController.updateScrollToPlayingButton();
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

      UIController.updateMuteIcon(this.audio.muted || this.audio.volume === 0);
    });

    // 初始化音量
    this.audio.volume = 1;
    document.getElementById("volumeSlider").value = 1;
  }
}

// 导出Player类
window.Player = Player;
