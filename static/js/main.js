const audio = new Audio();
let currentSong = null;
let lyricsData = [];
let loopMode = "none";

// 初始化
window.addEventListener("load", async () => {
  await loadPlaylist();
  initEventListeners();
});

function initEventListeners() {
  // 搜索功能
  document.getElementById("searchBox").addEventListener("input", function (e) {
    filterPlaylist(e.target.value);
  });

  // 进度条拖动
  document
    .getElementById("progressBar")
    .addEventListener("input", function (e) {
      const seekTime = audio.duration * (e.target.value / 100);
      if (!isNaN(seekTime)) audio.currentTime = seekTime;
    });

  // 播放结束处理
  audio.addEventListener("ended", handlePlayEnd);
}

async function loadPlaylist() {
  const res = await fetch("/api/music");
  const { music_list } = await res.json();
  const playlist = document.getElementById("playlist");
  playlist.dataset.originalList = JSON.stringify(music_list);
  renderPlaylist(music_list);
}

function renderPlaylist(list) {
  const playlist = document.getElementById("playlist");
  playlist.innerHTML = list
    .map((song) => {
      // 新增文件名解析
      const [songName, artist] = song.replace(".mp3", "").split(" - ");
      return `
        <li onclick="loadSong('${song}')">
            <div class="song-name">${songName}</div>
            <div class="song-artist">${artist || "未知艺术家"}</div>
        </li>
    `;
    })
    .join("");
}

function filterPlaylist(keyword) {
  const originalList = JSON.parse(
    document.getElementById("playlist").dataset.originalList
  );
  const filtered = originalList.filter((song) =>
    song.toLowerCase().includes(keyword.toLowerCase())
  );
  renderPlaylist(filtered);
}

async function loadSong(filename) {
  try {
    currentSong = filename;

    // 获取元数据
    const res = await fetch(`/api/music/${filename}`);
    const data = await res.json();

    // 更新界面
    document.getElementById("songTitle").textContent =
      data.title || filename.replace(".mp3", "");
    document.getElementById("songArtist").textContent =
      data.artist || "未知艺术家";

    // 加载音频
    audio.src = `/musics/${filename}`;
    audio.play();

    // 加载歌词
    const lrcRes = await fetch(
      `/api/lyrics/${filename.replace(".mp3", ".lrc")}`
    );
    const { lyrics } = await lrcRes.json();
    lyricsData = parseLyrics(lyrics);
  } catch (error) {
    console.error("加载歌曲失败:", error);
  }
}

function parseLyrics(lyrics) {
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
    .filter((item) => item && item.text);
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
  // 找到第一个超过当前时间的行，然后取前一索引
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) {
      activeIndex = i;
    } else {
      break; // 后续行时间更大，无需继续遍历
    }
  }

  lyricsBox.innerHTML = lyricsData
    .map(
      (line, index) =>
        `<div class="${index === activeIndex ? "lyrics-highlight" : ""}">${
          line.text
        }</div>`
    )
    .join("");

  // 滚动居中逻辑
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
  audio.paused ? audio.play() : audio.pause();
}

function toggleLoopMode() {
  const modes = ["none", "single", "all"];
  loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
  audio.loop = loopMode === "single";
  document.getElementById("loopBtn").textContent = `循环：${
    ["关", "单曲", "全部"][modes.indexOf(loopMode)]
  }`;
}

function toggleMute() {
  audio.muted = !audio.muted;
}

function handlePlayEnd() {
  if (loopMode === "single") {
    audio.play();
  } else if (loopMode === "all") {
    const playlist = JSON.parse(
      document.getElementById("playlist").dataset.originalList
    );
    const currentIndex = playlist.indexOf(currentSong);
    const nextIndex = (currentIndex + 1) % playlist.length;
    loadSong(playlist[nextIndex]);
  }
}

// 实时更新
audio.addEventListener("timeupdate", () => {
  document.getElementById("progressBar").value =
    (audio.currentTime / audio.duration) * 100 || 0;

  document.getElementById("currentTime").textContent = formatTime(
    audio.currentTime
  );
  document.getElementById("duration").textContent = formatTime(audio.duration);

  updateLyrics(audio.currentTime);
});

audio.addEventListener("volumechange", () => {
  document.getElementById("muteBtn").textContent = audio.muted ? "🔇" : "🔊";
});

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
