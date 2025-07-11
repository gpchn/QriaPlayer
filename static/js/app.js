/**
 * app.js - 应用入口文件
 * 初始化播放器并启动应用
 */

// 初始化播放器
window.player = new Player();

// 当DOM加载完成后启动应用
window.addEventListener("load", () => {
  player.loadPlaylist();
});
