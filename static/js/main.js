const audio = new Audio();
let currentSong = null;
let lyricsData = [];
let loopMode = "none";

// 初始化页面加载事件
window.addEventListener("load", async () => {
  await loadPlaylist(); // 加载播放列表
  initEventListeners(); // 初始化事件监听器
});

function initEventListeners() {
  // 搜索框输入事件，用于过滤播放列表
  document.getElementById("searchBox").addEventListener("input", function (e) {
    filterPlaylist(e.target.value);
  });

  // 进度条拖动事件，用于调整播放进度
  document
    .getElementById("progressBar")
    .addEventListener("input", function (e) {
      const seekTime = audio.duration * (e.target.value / 100);
      if (!isNaN(seekTime)) audio.currentTime = seekTime;
    });

  // 播放结束事件处理
  audio.addEventListener("ended", handlePlayEnd);
}

async function loadPlaylist() {
  // 从服务器获取音乐列表
  const res = await fetch("/api/music");
  const { music_list } = await res.json();
  const playlist = document.getElementById("playlist");
  playlist.dataset.originalList = JSON.stringify(music_list); // 保存原始列表数据
  renderPlaylist(music_list); // 渲染播放列表
}

function renderPlaylist(list) {
  const playlist = document.getElementById("playlist");
  playlist.innerHTML = list
    .map((song) => {
      // 解析文件名为歌曲名和艺术家
      const [songName, artist] = song.replace(".mp3", "").split(" - ");
      return `
        <li onclick="loadSong('${song.replace(/'/g, "\\'")}')">
            <div class="song-name">${songName}</div>
            <div class="song-artist">${artist || "未知艺术家"}</div>
        </li>
    `;
    })
    .join("");
}

function filterPlaylist(keyword) {
  // 根据关键字过滤播放列表
  const originalList = JSON.parse(
    document.getElementById("playlist").dataset.originalList
  );
  const filtered = originalList.filter((song) =>
    song.toLowerCase().includes(keyword.toLowerCase())
  );
  renderPlaylist(filtered); // 渲染过滤后的列表
}

async function loadSong(filename) {
  try {
    currentSong = filename;

    // 获取歌曲元数据
    const res = await fetch(`/api/music/${filename}`);
    const data = await res.json();

    // 更新界面显示的歌曲信息
    document.getElementById("songTitle").textContent =
      data.title || filename.replace(".mp3", "");
    document.getElementById("songArtist").textContent =
      data.artist || "未知艺术家";

    // 加载音频文件
    audio.src = `/musics/${filename}`;
    audio.play();

    // 加载歌词文件
    const lrcRes = await fetch(
      `/api/lyrics/${filename.replace(".mp3", ".lrc")}`
    );
    const { lyrics } = await lrcRes.json();
    lyricsData = parseLyrics(lyrics); // 解析歌词
  } catch (error) {
    console.error("加载歌曲失败:", error);
  }
}

function parseLyrics(lyrics) {
  // 解析歌词为时间和文本的对象数组
  return lyrics
    .split("\n")
    .map((line) => {
      const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)/);
      if (match) {
        const minutes = parseFloat(match[1]);
        const seconds = parseFloat(match[2]);
        return {
          time: minutes * 60 + seconds,
          text: match[4].trim(),
        };
      }
      return null;
    })
    .filter((item) => item && item.text); // 过滤无效行
}

function updateLyrics(currentTime) {
  const lyricsBox = document.getElementById("lyricsBox");
  if (!lyricsData.length) {
    lyricsBox.innerHTML = "<div>暂无歌词</div>";
    return;
  }

  // 确保歌词数据按时间升序排列
  lyricsData.sort((a, b) => a.time - b.time);

  let activeIndex = -1;
  // 找到当前时间对应的歌词行
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) {
      activeIndex = i;
    } else {
      break; // 后续行时间更大，无需继续遍历
    }
  }

  // 渲染歌词并高亮当前行
  lyricsBox.innerHTML = lyricsData
    .map(
      (line, index) =>
        `<div class="${index === activeIndex ? "lyrics-highlight" : ""}">${
          line.text
        }</div>`
    )
    .join("");

  // 滚动歌词到视图中央
  if (activeIndex !== -1) {
    const activeLine = lyricsBox.children[activeIndex];
    if (activeLine) {
      const containerHeight = lyricsBox.clientHeight;
      const lineTop = activeLine.offsetTop;
      const lineHeight = activeLine.offsetHeight;
      const scrollTop = lineTop - (containerHeight - lineHeight) / 2;
      lyricsBox.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }
}

function togglePlay() {
  // 切换播放/暂停状态
  audio.paused ? audio.play() : audio.pause();
}

function toggleLoopMode() {
  // 切换循环模式：无循环、单曲循环、列表循环
  const modes = ["none", "single", "all"];
  loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
  audio.loop = loopMode === "single";
  document.getElementById("loopBtn").textContent = `循环：${
    ["关", "单曲", "全部"][modes.indexOf(loopMode)]
  }`;
}

function toggleMute() {
  // 切换静音状态
  audio.muted = !audio.muted;
}

function handlePlayEnd() {
  // 播放结束后的处理逻辑
  if (loopMode === "single") {
    audio.play(); // 单曲循环
  } else if (loopMode === "all") {
    const playlist = JSON.parse(
      document.getElementById("playlist").dataset.originalList
    );
    const currentIndex = playlist.indexOf(currentSong);
    const nextIndex = (currentIndex + 1) % playlist.length;
    loadSong(playlist[nextIndex]); // 播放下一首
  }
}

// 实时更新播放进度和歌词
audio.addEventListener("timeupdate", () => {
  document.getElementById("progressBar").value =
    (audio.currentTime / audio.duration) * 100 || 0;

  document.getElementById("currentTime").textContent = formatTime(
    audio.currentTime
  );
  document.getElementById("duration").textContent = formatTime(audio.duration);

  updateLyrics(audio.currentTime); // 更新歌词显示
});

audio.addEventListener("volumechange", () => {
  // 更新静音按钮图标
  document.getElementById("muteBtn").textContent = audio.muted ? "🔇" : "🔊";
});

function formatTime(seconds) {
  // 格式化时间为 mm:ss 格式
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
