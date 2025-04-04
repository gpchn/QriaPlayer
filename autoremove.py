from pathlib import Path

musics = Path("musics").glob("*")
lyrics = Path("lyrics").glob("*")
music_stems = {music.stem for music in musics}

for lyric in lyrics:
    if lyric.stem not in music_stems:
        input(lyric.stem)
        lyric.unlink()