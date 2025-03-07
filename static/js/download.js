async function searchMusic() {
  const name = document.getElementById("searchName").value;
  try {
    const res = await fetch(`/api/search?name=${name}`);
    const data = await res.json();
    const searchResults = document.getElementById("searchResults");
    searchResults.innerHTML = data.songs
      .map(
        (song, index) => `
        <li>
          <span>${index + 1}. ${song.name} - ${song.artist}</span>
          <button onclick="downloadMusic('${name}', ${index + 1})">下载</button>
        </li>`
      )
      .join("");
  } catch (error) {
    console.error("搜索失败:", error);
  }
}

async function downloadMusic(name, index) {
  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, index }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
    } else {
      alert(`下载失败: ${data.error}`);
    }
  } catch (error) {
    console.error("下载失败:", error);
  }
}
