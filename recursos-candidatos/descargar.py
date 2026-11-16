"""Descarga los videos del manifiesto y registra procedencia.

Uso: python descargar.py <manifiesto.json> <yt-dlp.exe> <carpeta_destino>
"""
import json
import os
import re
import subprocess
import sys
import unicodedata
from datetime import date

manifiesto, ytdlp, destino = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(destino, "videos"), exist_ok=True)
items = json.load(open(manifiesto, encoding="utf-8"))
FORMATO = "bv*[vcodec^=avc1][height<=1280][width<=1280][ext=mp4]/b[ext=mp4]/18"


def slug(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()[:40]


fallos = []
for i, it in enumerate(items, 1):
    pref = "IZT" if it["fuente"].startswith("Izt") else "IND"
    nombre = f"{pref}_{slug(it['senaEnSitio'])}_{it['youtubeId']}.mp4"
    ruta = os.path.join(destino, "videos", nombre)
    it["archivo"] = "videos/" + nombre
    if os.path.exists(ruta) and os.path.getsize(ruta) > 0:
        print(f"[{i}/{len(items)}] ya existe {nombre}")
    else:
        r = subprocess.run([ytdlp, "--js-runtimes", "node", "-q", "--no-warnings", "--no-playlist", "--sleep-requests", "1",
                            "-f", FORMATO, "-o", ruta, it["urlVideo"]], capture_output=True, text=True)
        ok = r.returncode == 0 and os.path.exists(ruta)
        print(f"[{i}/{len(items)}] {'OK ' if ok else 'ERR'} {nombre}")
        if not ok:
            fallos.append((nombre, r.stderr.strip()[-300:]))
            it["archivo"] = None
            continue
    it["bytes"] = os.path.getsize(ruta)
    it["fechaDescarga"] = date.today().isoformat()

json.dump(items, open(os.path.join(destino, "procedencia.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("fallos:", len(fallos))
for f in fallos:
    print(" ", f)
