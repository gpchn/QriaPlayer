/**
 * UIController.js - 界面控制器
 * 负责UI渲染、交互和界面状态管理
 */

class UIController {
  constructor() {
    this.initEvents();
  }

  renderPlaylist(playlist, currentIndex, filter = "") {
    const list = filter
      ? playlist.filter(
          (s) =>
            s.title.toLowerCase().includes(filter.toLowerCase()) ||
            s.artist.toLowerCase().includes(filter.toLowerCase())
        )
      : playlist;

    const ul = document.getElementById("playlist");
    ul.innerHTML = "";

    list.forEach((item, idx) => {
      const li = document.createElement("li");
      const actualIndex = playlist.indexOf(item);
      li.className = actualIndex === currentIndex ? "playing" : "";

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

      li.onclick = () => window.player.playAt(actualIndex);
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
    if (playingElement && window.player.currentIndex >= 0) {
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

  updateMuteIcon(isMuted) {
    const muteIcon = document.getElementById("muteIcon");
    if (isMuted) {
      muteIcon.src = "icons/mute.svg";
      muteIcon.alt = "静音";
    } else {
      muteIcon.src = "icons/volume.svg";
      muteIcon.alt = "音量";
    }
  }

  initEvents() {
    // 搜索
    document.getElementById("searchBox").addEventListener("input", (e) => {
      this.renderPlaylist(window.player.playlist, window.player.currentIndex, e.target.value);
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
  }
}

// 创建单例实例并导出
window.UIController = new UIController();
