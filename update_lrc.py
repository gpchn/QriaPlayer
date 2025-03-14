from pathlib import Path
from paio import ncm_search, ncm_lyric


musics = Path("musics").glob("*")
for m in musics:
    search_name = m.name.replace(".mp3", "")
    music_id, music_name, music_artist = ncm_search(search_name)[0]
    lyric = ncm_lyric(music_id)
    lyric_path = Path(f"lyrics/{music_name} - {music_artist}.lrc")
    if not lyric_path.exists():
        lyric_path.write_text(lyric, "utf-8")