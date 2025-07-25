// 播放器核心状态与控制
class Player {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
    this.lyrics = [];
    this.lyricsTimer = null;
    this.loopMode = 2; // 0:无, 1:单曲, 2:列表, 3:随机
    this.isUserScrollingLyrics = false; // 标记用户是否正在滚动歌词
    this.userScrollingTimeout = null; // 用户滚动超时定时器
    this.hasPlayed = false; // 标记用户是否已开始播放
    this.initEvents();
  }

  // 检查并恢复保存的播放状态
  async checkSavedPlayState() {
    try {
      console.log("正在检查保存的播放状态...");
      const res = await fetch("/api/play_state");
      if (!res.ok) {
        console.log("获取播放状态请求失败");
        return;
      }

      const state = await res.json();
      console.log("获取到保存的状态:", state);

      // 如果有保存的文件名，等待播放列表加载完成后恢复
      if (state.filename) {
        console.log(
          "发现保存的文件名:",
          state.filename,
          "将在播放列表加载完成后恢复"
        );
        // 延长等待时间，确保播放列表完全加载
        setTimeout(async () => {
          if (this.playlist.length > 0) {
            console.log("播放列表已加载，准备恢复播放状态");
            await this.restorePlayState(state);
          } else {
            console.log("播放列表尚未加载完成，再次尝试");
            // 如果播放列表仍未加载，再次延迟尝试
            setTimeout(async () => {
              console.log("第二次尝试恢复播放状态");
              await this.restorePlayState(state);
            }, 1000);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("获取播放状态失败:", err);
    }
  }

  // 保存当前播放状态
  async savePlayState() {
    if (this.currentIndex === -1) return;

    const currentItem = this.playlist[this.currentIndex];
    // 保存音乐和视频的播放状态
    if (currentItem) {
      let state = {
        filename: currentItem.filename,
        current_time: 0,
        type: currentItem.type,
      };

      // 根据媒体类型获取当前播放时间
      if (currentItem.type === "music") {
        state.current_time = this.audio.currentTime || 0;
      } else if (currentItem.type === "video") {
        const videoPlayer = document.getElementById("videoPlayer");
        state.current_time = videoPlayer.currentTime || 0;
      }

      try {
        console.log("保存播放状态:", state);
        await fetch("/api/play_state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(state),
        });
      } catch (err) {
        console.error("保存播放状态失败:", err);
      }
    }
  }

  // 从服务器恢复播放状态
  async restorePlayState(state) {
    // 如果播放列表已加载且有保存的文件名
    if (this.playlist.length > 0 && state.filename) {
      // 查找对应的媒体索引
      const idx = this.playlist.findIndex(
        (item) => item.filename === state.filename
      );
      if (idx !== -1) {
        console.log("恢复播放状态:", state);

        // 设置 hasPlayed 为 true，因为我们要恢复之前的播放
        this.hasPlayed = true;

        // 移除欢迎样式
        document.getElementById("welcomeContainer").style.display = "none";

        // 播放对应的媒体
        await this.playAt(idx);

        // 根据媒体类型设置播放进度
        if (state.current_time > 0) {
          const mediaType = state.type || this.playlist[idx].type;

          if (mediaType === "music") {
            // 设置音频播放进度
            this.audio.currentTime = state.current_time;
            // 总是暂停在恢复的位置，不自动播放
            this.audio.pause();
            document.getElementById("playPauseIcon").src =
              "/static/icons/play.svg";
            document.getElementById("playPauseIcon").alt = "播放";
          } else if (mediaType === "video") {
            // 设置视频播放进度
            const videoPlayer = document.getElementById("videoPlayer");
            videoPlayer.currentTime = state.current_time;
            // 总是暂停在恢复的位置，不自动播放
            videoPlayer.pause();
          }
        }
      }
    }
  }

  async loadPlaylist() {
    // 获取播放列表
    const res = await fetch("/api/playlist");
    const { playlist } = await res.json();
    this.playlist = playlist;
    this.renderPlaylist();

    // 播放列表加载完成后，尝试恢复播放状态
    console.log("播放列表加载完成，准备恢复播放状态");
    await this.checkSavedPlayState();
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
        <div class="song-name">${item.title}</div>
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
      if (
        playingRect.top < playlistRect.top ||
        playingRect.bottom > playlistRect.bottom
      ) {
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

    // 如果这是首次播放，需要显示控件
    if (!this.hasPlayed) {
      // 设置标志，表示已经开始播放
      this.hasPlayed = true;
      // 移除欢迎样式
      document.getElementById("welcomeContainer").style.display = "none";
    }

    this.currentIndex = idx;
    const item = this.playlist[idx];

    if (item.type === "music") {
      // 显示歌曲信息
      document.getElementById("songTitle").textContent = item.title;
      document.getElementById("songArtist").textContent = item.artist;
      // 显示控制组件
      document.getElementById("musicPlayerContainer").style.display = "flex";
      // 显示控制组件
      document.getElementById("videoPlayerContainer").style.display = "none";
      // 暂停视频
      document.getElementById("videoPlayer").pause();

      // 音频
      this.audio.src = `/media/music/${item.filename}`;
      this.audio.play();
      // 歌词
      this.loadLyrics(item.filename);
    } else if (item.type === "video") {
      // 显示视频信息
      document.getElementById("videoTitle").textContent = item.title;
      document.getElementById("videoArtist").textContent = item.artist;
      // 显示控制组件
      document.getElementById("musicPlayerContainer").style.display = "none";
      // 显示控制组件
      document.getElementById("videoPlayerContainer").style.display = "block";
      // 暂停音乐
      this.audio.pause();

      player = document.getElementById("videoPlayer");
      player.src = `/media/video/${item.filename}`;
      player.play();
    } else {
      console.error("未知媒体类型:", item.type);
      return;
    }
    this.renderPlaylist(document.getElementById("searchBox").value);

    // 更新返回当前播放歌曲按钮状态
    setTimeout(() => this.updateScrollToPlayingButton(), 300); // 延迟一点执行，确保 DOM 已更新
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
            (m[3] ? parseInt(m[3].padEnd(3, "0")) : 0) / 1000;
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
      document.getElementById("playPauseIcon").src = "/static/icons/pause.svg";
      document.getElementById("playPauseIcon").alt = "暂停";
    } else {
      this.audio.pause();
      document.getElementById("playPauseIcon").src = "/static/icons/play.svg";
      document.getElementById("playPauseIcon").alt = "播放";

      // 暂停时保存播放状态
      this.savePlayState();
    }
  }

  toggleLoopMode() {
    this.loopMode = (this.loopMode + 1) % 4;
    this.audio.loop = this.loopMode === 1;
    const txts = ["关", "单曲", "全部", "随机"];
    const icons = [
      "/static/icons/loop-off.svg",
      "/static/icons/loop-one.svg",
      "/static/icons/loop-list.svg",
      "/static/icons/loop-random.svg",
    ];
    document.getElementById("loopText").textContent = txts[this.loopMode];
    document.getElementById("loopIcon").src = icons[this.loopMode];
    document.getElementById("loopIcon").alt = "循环" + txts[this.loopMode];
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    const muteIcon = document.getElementById("muteIcon");
    if (this.audio.muted) {
      muteIcon.src = "/static/icons/mute.svg";
      muteIcon.alt = "静音";
    } else {
      muteIcon.src = "/static/icons/volume.svg";
      muteIcon.alt = "音量";
    }
  }

  setVolume(val) {
    this.audio.volume = val;
    // 更新滑块颜色
    const volumeSlider = document.getElementById("volumeSlider");
    volumeSlider.style.setProperty("--volume-percent", val * 100 + "%");
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
    // 定期保存播放状态（每 30 秒）
    setInterval(() => {
      if (this.currentIndex !== -1) {
        this.savePlayState();
      }
    }, 30000);

    // 页面关闭时保存状态
    window.addEventListener("beforeunload", () => {
      this.savePlayState();
    });

    // 为视频播放器添加事件监听
    const videoPlayer = document.getElementById("videoPlayer");

    // 视频暂停时保存状态
    videoPlayer.addEventListener("pause", () => {
      if (
        this.currentIndex !== -1 &&
        this.playlist[this.currentIndex].type === "video"
      ) {
        console.log("视频暂停，保存播放状态");
        this.savePlayState();
      }
    });

    // 视频播放结束时保存状态
    videoPlayer.addEventListener("ended", () => {
      if (
        this.currentIndex !== -1 &&
        this.playlist[this.currentIndex].type === "video"
      ) {
        console.log("视频结束，保存播放状态");
        this.savePlayState();
      }
    });

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

      // 设置新的超时器：用户停止滚动 1.5 秒后，恢复自动滚动
      this.userScrollingTimeout = setTimeout(() => {
        this.isUserScrollingLyrics = false;
      }, 1500);
    });

    // 歌词滚动条 mousedown 和 mouseup 事件监听
    lyricsBox.addEventListener("mousedown", () => {
      this.isUserScrollingLyrics = true;
    });

    document.addEventListener("mouseup", () => {
      // 设置超时器：鼠标释放后 0.8 秒恢复自动滚动
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
      scrollToPlayingBtn.style.right =
        window.innerWidth - rect.right + 16 + "px";
      scrollToPlayingBtn.style.bottom =
        window.innerHeight - rect.bottom + 76 + "px"; // 在顶部按钮上方
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
      this.updateScrollToPlayingButton();
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
      volumeSlider.style.setProperty("--volume-percent", value * 100 + "%");
    });
    // 初始设置滑块颜色
    volumeSlider.style.setProperty("--volume-percent", "100%");
    // 控制按钮
    document.getElementById("playBtn").onclick = () => this.togglePlay();
    document.getElementById("prevBtn").onclick = () => this.playPrev();
    document.getElementById("nextBtn").onclick = () => this.playNext();
    document.getElementById("loopBtn").onclick = () => this.toggleLoopMode();
    document.getElementById("muteBtn").onclick = () => this.toggleMute();

    // 功能按钮 - 设置
    document.getElementById("settingsBtn").onclick = () => {
      // todo: 实现设置功能
      document.getElementById("settingsModal").style.display = "flex";
    };

    // 关闭设置模态框
    document.getElementById("closeSettingsBtn").onclick = () => {
      document.getElementById("settingsModal").style.display = "none";
    };

    // 功能按钮 - 导入
    document.getElementById("importBtn").onclick = () => {
      document.getElementById("importModal").style.display = "flex";
    };

    // 关闭导入模态框
    document.getElementById("closeImportBtn").onclick = () => {
      document.getElementById("importModal").style.display = "none";
    };

    // 导入功能的标签页切换
    const importTabs = document.querySelectorAll(".sidebar-item[data-tab]");
    const importContents = document.querySelectorAll(".import-content");

    importTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // 移除所有标签页的活动状态
        importTabs.forEach((t) => t.classList.remove("active"));
        // 隐藏所有内容
        importContents.forEach((content) => {
          content.style.display = "none";
        });

        // 设置当前标签页为活动状态
        tab.classList.add("active");

        // 显示相应的内容
        const tabId = tab.getAttribute("data-tab");
        document.getElementById(tabId).style.display = "block";
      });
    });

    // 本地文件拖放上传功能
    const dropzone = document.getElementById("fileDropzone");
    const fileInput = document.getElementById("fileInput");
    const selectFileBtn = document.getElementById("selectFileBtn");
    const uploadList = document.getElementById("uploadList");

    // 选择文件按钮点击事件
    selectFileBtn.addEventListener("click", () => {
      fileInput.click();
    });

    // 监听文件选择
    fileInput.addEventListener("change", (e) => {
      handleFiles(e.target.files);
    });

    // 拖放区域事件
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 拖放区域高亮
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.add("active");
        },
        false
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.remove("active");
        },
        false
      );
    });

    // 处理拖放文件
    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    });

    // 处理选择的文件
    function handleFiles(files) {
      const validFiles = Array.from(files).filter((file) => {
        const fileType = file.type;
        return (
          fileType === "audio/mpeg" ||
          fileType === "audio/wav" ||
          fileType === "audio/flac"
        );
      });

      if (validFiles.length === 0) {
        alert("请选择有效的音频文件（MP3, WAV, FLAC）");
        return;
      }

      // 显示上传列表
      validFiles.forEach((file) => {
        uploadFile(file);
      });
    }

    // 上传文件到服务器
    async function uploadFile(file) {
      // 创建上传项目
      const uploadItem = document.createElement("div");
      uploadItem.className = "upload-item";
      uploadItem.innerHTML = `
        <div class="upload-item-name">${file.name}</div>
        <div class="upload-item-status">上传中...</div>
      `;
      uploadList.appendChild(uploadItem);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // 发送到服务器
        const response = await fetch("/api/upload_music", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          uploadItem.querySelector(".upload-item-status").textContent =
            "上传成功";
          // 刷新播放列表
          await window.player.loadPlaylist();
        } else {
          throw new Error(result.error || "上传失败");
        }
      } catch (error) {
        console.error("上传失败:", error);
        uploadItem.querySelector(".upload-item-status").textContent =
          "上传失败";
        uploadItem
          .querySelector(".upload-item-status")
          .classList.add("upload-item-error");
      }
    }

    // 链接导入功能
    const importUrlBtn = document.getElementById("importUrlBtn");
    importUrlBtn.addEventListener("click", async () => {
      const url = document.getElementById("musicUrl").value.trim();
      const title =
        document.getElementById("musicTitle").value.trim() || "未命名音乐";
      const artist =
        document.getElementById("musicArtist").value.trim() || "未知艺术家";

      if (!url) {
        alert("请输入音乐链接");
        return;
      }

      importUrlBtn.textContent = "正在导入...";
      importUrlBtn.disabled = true;

      try {
        const response = await fetch("/api/import_url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, title, artist }),
        });

        const result = await response.json();

        if (result.success) {
          alert("导入成功！");
          // 清空输入框
          document.getElementById("musicUrl").value = "";
          document.getElementById("musicTitle").value = "";
          document.getElementById("musicArtist").value = "";
          // 刷新播放列表
          await window.player.loadPlaylist();
        } else {
          throw new Error(result.error || "导入失败");
        }
      } catch (error) {
        console.error("导入失败:", error);
        alert(`导入失败: ${error.message || "未知错误"}`);
      } finally {
        importUrlBtn.textContent = "导入链接";
        importUrlBtn.disabled = false;
      }
    });

    // B站解析功能
    const parseBiliBtn = document.getElementById("parseBiliBtn");
    parseBiliBtn.addEventListener("click", async () => {
      const url = document.getElementById("biliUrl").value.trim();

      if (!url) {
        alert("请输入B站视频链接");
        return;
      }

      parseBiliBtn.textContent = "正在解析...";
      parseBiliBtn.disabled = true;

      try {
        const response = await fetch("/api/parse_bilibili", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (result.success) {
          // 显示视频信息和可选音频
          const biliResult = document.getElementById("biliResult");
          biliResult.style.display = "block";
          biliResult.innerHTML = `
            <div class="bili-video-info">
              <img class="bili-video-cover" src="${result.cover}" alt="${result.title}">
              <div class="bili-video-details">
                <div class="bili-video-title">${result.title}</div>
                <div class="bili-video-uploader">UP主: ${result.uploader}</div>
              </div>
            </div>
            <button class="action-btn" id="importBiliBtn">导入选中音频</button>
          `;

          // 导入选中音频
          document
            .getElementById("importBiliBtn")
            .addEventListener("click", async () => {
              try {
                const importResponse = await fetch("/api/import_bilibili", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: url,
                    title: result.title,
                    artist: result.uploader,
                  }),
                });

                const importResult = await importResponse.json();

                if (importResult.success) {
                  alert("导入成功！");
                  document.getElementById("biliUrl").value = "";
                  biliResult.style.display = "none";
                  // 刷新播放列表
                  await window.player.loadPlaylist();
                } else {
                  throw new Error(importResult.error || "导入失败");
                }
              } catch (error) {
                console.error("导入失败:", error);
                alert(`导入失败: ${error.message || "未知错误"}`);
              }
            });
        } else {
          throw new Error(result.error || "解析失败");
        }
      } catch (error) {
        console.error("解析失败:", error);
        alert(`解析失败: ${error.message || "未知错误"}`);
      } finally {
        parseBiliBtn.textContent = "解析视频";
        parseBiliBtn.disabled = false;
      }
    });

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
      if (cur % 2 < 0.1) {
        // 每 2 秒检查一次，避免频繁检查
        this.updateScrollToPlayingButton();
      }
      // 播放/暂停图标切换
      const playPauseIcon = document.getElementById("playPauseIcon");
      if (this.audio.paused) {
        playPauseIcon.src = "/static/icons/play.svg";
        playPauseIcon.alt = "播放";
      } else {
        playPauseIcon.src = "/static/icons/pause.svg";
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
      volumeSlider.style.setProperty(
        "--volume-percent",
        this.audio.volume * 100 + "%"
      );

      const muteIcon = document.getElementById("muteIcon");
      if (this.audio.muted || this.audio.volume === 0) {
        muteIcon.src = "/static/icons/mute.svg";
        muteIcon.alt = "静音";
      } else {
        muteIcon.src = "/static/icons/volume.svg";
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
