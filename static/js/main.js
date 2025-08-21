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
      const state = await $.ajax({
        url: "/api/play_state",
        method: "GET",
        dataType: "json"
      });

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
        const $videoPlayer = $("#videoPlayer");
        state.current_time = $videoPlayer[0].currentTime || 0;
      }

      try {
        console.log("保存播放状态:", state);
        await $.ajax({
          url: "/api/play_state",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(state)
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
        $("#welcomeContainer").hide();

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
            $("#playPauseIcon").attr({
              "src": "/static/icons/play.svg",
              "alt": "播放"
            });
          } else if (mediaType === "video") {
            // 设置视频播放进度
            const $videoPlayer = $("#videoPlayer");
            $videoPlayer[0].currentTime = state.current_time;
            // 总是暂停在恢复的位置，不自动播放
            $videoPlayer[0].pause();
          }
        }
      }
    }
  }

  async loadPlaylist() {
    // 获取播放列表
    const data = await $.ajax({
      url: "/api/playlist",
      method: "GET",
      dataType: "json"
    });
    this.playlist = data.playlist;
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
    const $ul = $("#playlist");
    $ul.empty();
    list.forEach((item, idx) => {
      const $li = $("<li></li>")
        .addClass(idx === this.currentIndex ? "playing" : "")
        // 区分视频和音频
        .toggleClass("video-item", item.type === "video")
        .html(`
          <div class="song-name">${item.title}</div>
          <div class="song-artist">${item.artist}</div>
        `)
        .on("click", () => this.playAt(this.playlist.indexOf(item)));
      $ul.append($li);
    });

    // 触发检查当前播放歌曲是否在可视区域内
    this.updateScrollToPlayingButton();
  }

  updateScrollToPlayingButton() {
    const $playlistContainer = $(".playlist-container");
    const $scrollToPlayingBtn = $("#scrollToPlayingBtn");
    if (!$playlistContainer.length || !$scrollToPlayingBtn.length) return;

    const $playingElement = $("#playlist li.playing");
    if ($playingElement.length && this.currentIndex >= 0) {
      const playlistRect = $playlistContainer[0].getBoundingClientRect();
      const playingRect = $playingElement[0].getBoundingClientRect();

      // 当前播放歌曲不在可视区域内时显示按钮
      if (
        playingRect.top < playlistRect.top ||
        playingRect.bottom > playlistRect.bottom
      ) {
        $scrollToPlayingBtn.addClass("show");
      } else {
        $scrollToPlayingBtn.removeClass("show");
      }
    } else {
      $scrollToPlayingBtn.removeClass("show");
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
      $("#welcomeContainer").hide();
    }

    this.currentIndex = idx;
    const item = this.playlist[idx];

    if (item.type === "music") {
      // 显示歌曲信息
      $("#songTitle").text(item.title);
      $("#songArtist").text(item.artist);
      // 显示控制组件
      $("#musicPlayerContainer").css("display", "flex");
      // 隐藏视频组件
      $("#videoPlayerContainer").hide();
      // 暂停视频
      $("#videoPlayer")[0].pause();

      // 音频
      this.audio.src = `/media/music/${item.filename}`;
      this.audio.play();
      // 歌词
      this.loadLyrics(item.filename);
    } else if (item.type === "video") {
      // 显示视频信息
      $("#videoTitle").text(item.title);
      $("#videoArtist").text(item.artist);
      // 隐藏音乐控制组件
      $("#musicPlayerContainer").hide();
      // 显示视频控制组件
      $("#videoPlayerContainer").show();
      // 暂停音乐
      this.audio.pause();

      const $player = $("#videoPlayer");
      $player.attr("src", `/media/video/${item.filename}`);
      $player[0].play();
    } else {
      console.error("未知媒体类型:", item.type);
      return;
    }
    this.renderPlaylist($("#searchBox").val());

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
      const data = await $.ajax({
        url: `/api/get_lrc/${filename.replace(".mp3", ".lrc")}`,
        method: "GET",
        dataType: "json"
      });
      this.lyrics = this.parseLyrics(data.lyrics);
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
    const $box = $("#lyricsBox");
    if (!this.lyrics.length) {
      $box.html("<div>暂无歌词</div>");
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
    $box.html(this.lyrics
      .map(
        (l, i) =>
          `<div class="${i === idx ? "lyrics-highlight" : ""}">${l.text}</div>`
      )
      .join(""));
    // 歌词垂直居中：将当前歌词的中心与歌词框的中心对齐
    // 只有当用户没有正在滚动歌词时才自动滚动
    if (idx !== -1 && !this.isUserScrollingLyrics) {
      const $active = $box.children().eq(idx);
      if ($active.length) {
        const boxRect = $box[0].getBoundingClientRect();
        const boxScrollTop = $box.scrollTop();
        const boxCenter = boxRect.height / 2;
        const activeRect = $active[0].getBoundingClientRect();
        const activeOffset = activeRect.top - boxRect.top + boxScrollTop;
        const activeCenter = activeOffset + $active.outerHeight() / 2;
        const targetScroll = activeCenter - boxCenter;
        $box.stop().animate({ scrollTop: targetScroll }, 300);
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
      $("#playPauseIcon").attr({
        src: "/static/icons/pause.svg",
        alt: "暂停"
      });
    } else {
      this.audio.pause();
      $("#playPauseIcon").attr({
        src: "/static/icons/play.svg",
        alt: "播放"
      });

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
    $("#loopText").text(txts[this.loopMode]);
    $("#loopIcon").attr({
      src: icons[this.loopMode],
      alt: "循环" + txts[this.loopMode]
    });
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    const $muteIcon = $("#muteIcon");
    if (this.audio.muted) {
      $muteIcon.attr({
        src: "/static/icons/mute.svg",
        alt: "静音"
      });
    } else {
      $muteIcon.attr({
        src: "/static/icons/volume.svg",
        alt: "音量"
      });
    }
  }

  setVolume(val) {
    this.audio.volume = val;
    // 更新滑块颜色
    $("#volumeSlider").css("--volume-percent", val * 100 + "%");
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
    $(window).on("beforeunload", () => {
      this.savePlayState();
    });

    // 为视频播放器添加事件监听
    const $videoPlayer = $("#videoPlayer");

    // 视频暂停时保存状态
    $videoPlayer.on("pause", () => {
      if (
        this.currentIndex !== -1 &&
        this.playlist[this.currentIndex].type === "video"
      ) {
        console.log("视频暂停，保存播放状态");
        this.savePlayState();
      }
    });

    // 视频播放结束时保存状态
    $videoPlayer.on("ended", () => {
      if (
        this.currentIndex !== -1 &&
        this.playlist[this.currentIndex].type === "video"
      ) {
        console.log("视频结束，保存播放状态");
        this.savePlayState();
      }
    });

    // 搜索
    $("#searchBox").on("input", (e) => {
      this.renderPlaylist($(e.target).val());
    });

    // 歌词滚动检测
    const $lyricsBox = $("#lyricsBox");
    $lyricsBox.on("scroll", () => {
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
    $lyricsBox.on("mousedown", () => {
      this.isUserScrollingLyrics = true;
    });

    $(document).on("mouseup", () => {
      // 设置超时器：鼠标释放后 0.8 秒恢复自动滚动
      if (this.userScrollingTimeout) {
        clearTimeout(this.userScrollingTimeout);
      }
      this.userScrollingTimeout = setTimeout(() => {
        this.isUserScrollingLyrics = false;
      }, 800);
    });

    // 回到顶部按钮和返回当前播放歌曲按钮逻辑
    const $playlistContainer = $(".playlist-container");
    const $scrollTopBtn = $("#scrollTopBtn");
    const $scrollToPlayingBtn = $("#scrollToPlayingBtn");

    function updateScrollButtonsPos() {
      const rect = $playlistContainer[0].getBoundingClientRect();
      $scrollTopBtn.css({
        right: $(window).width() - rect.right + 16 + "px",
        bottom: $(window).height() - rect.bottom + 24 + "px"
      });
      $scrollToPlayingBtn.css({
        right: $(window).width() - rect.right + 16 + "px",
        bottom: $(window).height() - rect.bottom + 76 + "px" // 在顶部按钮上方
      });
    }

    $(window).on("resize", updateScrollButtonsPos);
    $(window).on("scroll", updateScrollButtonsPos);
    updateScrollButtonsPos();

    $playlistContainer.on("scroll", () => {
      // 回到顶部按钮显示逻辑
      if ($playlistContainer.scrollTop() > 120) {
        $scrollTopBtn.addClass("show");
      } else {
        $scrollTopBtn.removeClass("show");
      }

      // 返回到当前播放歌曲按钮显示逻辑
      this.updateScrollToPlayingButton();
    });

    $scrollTopBtn.on("click", () => {
      $playlistContainer.animate({ scrollTop: 0 }, 300);
    });

    $scrollToPlayingBtn.on("click", () => {
      const $playingElement = $("#playlist li.playing");
      if ($playingElement.length) {
        $playlistContainer.animate({
          scrollTop: $playingElement.offset().top - $playlistContainer.offset().top + $playlistContainer.scrollTop() - ($playlistContainer.height() / 2) + ($playingElement.height() / 2)
        }, 300);
      }
    });
    // 进度条
    $("#progressBar").on("input", (e) => {
      this.seek($(e.target).val());
    });
    // 音量
    const $volumeSlider = $("#volumeSlider");
    $volumeSlider.on("input", (e) => {
      const value = $(e.target).val();
      this.setVolume(value);
      // 更新滑块颜色
      $volumeSlider.css("--volume-percent", value * 100 + "%");
    });
    // 初始设置滑块颜色
    $volumeSlider.css("--volume-percent", "100%");
    // 控制按钮
    $("#playBtn").on("click", () => this.togglePlay());
    $("#prevBtn").on("click", () => this.playPrev());
    $("#nextBtn").on("click", () => this.playNext());
    $("#loopBtn").on("click", () => this.toggleLoopMode());
    $("#muteBtn").on("click", () => this.toggleMute());

    // 功能按钮 - 设置
    $("#settingsBtn").on("click", () => {
      // todo: 实现设置功能
      $("#settingsModal").css("display", "flex");
    });

    // 关闭设置模态框
    $("#closeSettingsBtn").on("click", () => {
      $("#settingsModal").hide();
    });

    // 功能按钮 - 导入
    $("#importBtn").on("click", () => {
      $("#importModal").css("display", "flex");
    });

    // 关闭导入模态框
    $("#closeImportBtn").on("click", () => {
      $("#importModal").hide();
    });

    // 导入功能的标签页切换
    const $importTabs = $(".sidebar-item[data-tab]");
    const $importContents = $(".import-content");

    $importTabs.on("click", function() {
      // 移除所有标签页的活动状态
      $importTabs.removeClass("active");
      // 隐藏所有内容
      $importContents.hide();

      // 设置当前标签页为活动状态
      $(this).addClass("active");

      // 显示相应的内容
      const tabId = $(this).data("tab");
      $("#" + tabId).show();
    });

    // 本地文件拖放上传功能
    const $dropzone = $("#fileDropzone");
    const $fileInput = $("#fileInput");
    const $selectFileBtn = $("#selectFileBtn");
    const $uploadList = $("#uploadList");

    // 选择文件按钮点击事件
    $selectFileBtn.on("click", () => {
      $fileInput.trigger("click");
    });

    // 监听文件选择
    $fileInput.on("change", (e) => {
      handleFiles(e.target.files);
    });

    // 拖放区域事件
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    $dropzone.on("dragenter dragover dragleave drop", preventDefaults);

    // 拖放区域高亮
    $dropzone.on("dragenter dragover", function() {
      $(this).addClass("active");
    });

    $dropzone.on("dragleave drop", function() {
      $(this).removeClass("active");
    });

    // 处理拖放文件
    $dropzone.on("drop", (e) => {
      const dt = e.originalEvent.dataTransfer;
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
      const $uploadItem = $("<div>").addClass("upload-item").html(`
        <div class="upload-item-name">${file.name}</div>
        <div class="upload-item-status">上传中...</div>
      `);
      $uploadList.append($uploadItem);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // 发送到服务器
        const response = await $.ajax({
          url: "/api/upload_music",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false
        });

        if (response.success) {
          $uploadItem.find(".upload-item-status").text("上传成功");
          // 刷新播放列表
          await window.player.loadPlaylist();
        } else {
          throw new Error(response.error || "上传失败");
        }
      } catch (error) {
        console.error("上传失败:", error);
        $uploadItem.find(".upload-item-status")
          .text("上传失败")
          .addClass("upload-item-error");
      }
    }

    // 链接导入功能
    const $importUrlBtn = $("#importUrlBtn");
    $importUrlBtn.on("click", async () => {
      const url = $("#musicUrl").val().trim();
      const title = $("#musicTitle").val().trim() || "未命名音乐";
      const artist = $("#musicArtist").val().trim() || "未知艺术家";

      if (!url) {
        alert("请输入音乐链接");
        return;
      }

      $importUrlBtn.text("正在导入...").prop("disabled", true);

      try {
        const result = await $.ajax({
          url: "/api/import_url",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ url, title, artist })
        });

        if (result.success) {
          alert("导入成功！");
          // 清空输入框
          $("#musicUrl, #musicTitle, #musicArtist").val("");
          // 刷新播放列表
          await window.player.loadPlaylist();
        } else {
          throw new Error(result.error || "导入失败");
        }
      } catch (error) {
        console.error("导入失败:", error);
        alert(`导入失败: ${error.message || "未知错误"}`);
      } finally {
        $importUrlBtn.text("导入链接").prop("disabled", false);
      }
    });

    // B站解析功能
    const $parseBiliBtn = $("#parseBiliBtn");
    $parseBiliBtn.on("click", async () => {
      const url = $("#biliUrl").val().trim();

      if (!url) {
        alert("请输入B站视频链接");
        return;
      }

      $parseBiliBtn.text("正在解析...").prop("disabled", true);

      try {
        const result = await $.ajax({
          url: "/api/parse_bilibili",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ url })
        });

        if (result.success) {
          // 显示视频信息和可选音频
          const $biliResult = $("#biliResult");
          $biliResult.show().html(`
            <div class="bili-video-info">
              <img class="bili-video-cover" src="${result.cover}" alt="${result.title}">
              <div class="bili-video-details">
                <div class="bili-video-title">${result.title}</div>
                <div class="bili-video-uploader">UP主: ${result.uploader}</div>
              </div>
            </div>
            <button class="action-btn" id="importBiliBtn">导入选中音频</button>
          `);

          // 导入选中音频
          $("#importBiliBtn").on("click", async () => {
            try {
              const importResult = await $.ajax({
                url: "/api/import_bilibili",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                  url: url,
                  title: result.title,
                  artist: result.uploader,
                })
              });

              if (importResult.success) {
                alert("导入成功！");
                $("#biliUrl").val("");
                $biliResult.hide();
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
        $parseBiliBtn.text("解析视频").prop("disabled", false);
      }
    });

    // 音频事件
    $(this.audio).on("timeupdate", () => {
      const cur = this.audio.currentTime,
        dur = this.audio.duration;
      const $bar = $("#progressBar");
      $bar.val((cur / dur) * 100 || 0);
      $bar.css("background", `linear-gradient(to right, #2e7d32 0%, #2e7d32 ${$bar.val()}%, #555 ${$bar.val()}%, #555 100%)`);
      $("#currentTime").text(this.formatTime(cur));
      $("#duration").text(this.formatTime(dur));
      this.updateLyrics(cur);
      // 定期检查当前播放歌曲是否在可视区域内
      if (cur % 2 < 0.1) {
        // 每 2 秒检查一次，避免频繁检查
        this.updateScrollToPlayingButton();
      }
      // 播放/暂停图标切换
      const $playPauseIcon = $("#playPauseIcon");
      if (this.audio.paused) {
        $playPauseIcon.attr({
          src: "/static/icons/play.svg",
          alt: "播放"
        });
      } else {
        $playPauseIcon.attr({
          src: "/static/icons/pause.svg",
          alt: "暂停"
        });
      }
    });
    $(this.audio).on("ended", () => {
      if (this.loopMode === 1) this.audio.play();
      else if (this.loopMode === 2) this.playNext();
      else if (this.loopMode === 3)
        this.playAt(Math.floor(Math.random() * this.playlist.length));
    });
    $(this.audio).on("volumechange", () => {
      const $volumeSlider = $("#volumeSlider");
      $volumeSlider.val(this.audio.volume);
      // 更新滑块颜色
      $volumeSlider.css("--volume-percent", this.audio.volume * 100 + "%");

      const $muteIcon = $("#muteIcon");
      if (this.audio.muted || this.audio.volume === 0) {
        $muteIcon.attr({
          src: "/static/icons/mute.svg",
          alt: "静音"
        });
      } else {
        $muteIcon.attr({
          src: "/static/icons/volume.svg",
          alt: "音量"
        });
      }
    });
    // 初始化音量
    this.audio.volume = 1;
    $("#volumeSlider").val(1);
  }
}

// 初始化播放器
window.player = new Player();
$(window).on("load", () => player.loadPlaylist());
