"""Olah ekspor DesInventar (salinan DIBI BNPB) jadi data per kabupaten/kota.

python -I data/skrip/olah.py <DI_export_idn.xml> <kode_bps.json> <daerah.json> <keluar.json>

Keluaran satu berkas ringkas:
  {"awal", "akhir", "jenis": [...], "daerah": [id...],
   "k": [[i_daerah, tahun-awal, bulan, hari, i_jenis, meninggal+hilang, terdampak, rumah rusak], ...]}
Pencatatan DIBI sebelum ~2008 masih jarang, jadi rentang dibatasi satu dekade yang rapat.
"""
import collections
import json
import os
import sys
import xml.etree.ElementTree as ET

XML, KODE, DAERAH, KELUAR = sys.argv[1:5]
AWAL, AKHIR = 2010, 2019

# Jenis bencana alam yang ditampilkan. Kejadian non-alam (kebakaran gedung, kecelakaan,
# konflik, teror, epidemi, bangunan roboh) tidak dihitung.
JENIS = {
    "BANJIR": "banjir",
    "BANJIR DAN TANAH LONGSOR": "banjir",  # DIBI mencatatnya sebagai satu kejadian gabungan
    "TANAH LONGSOR": "longsor",
    "PUTING BELIUNG": "angin",
    "KEKERINGAN": "kering",
    "KEBAKARAN HUTAN DAN LAHAN": "karhutla",
    "GEMPA BUMI": "gempa",
    "GEMPA BUMI DAN TSUNAMI": "gempa",
    "TSUNAMI": "gempa",
    "GELOMBANG PASANG / ABRASI": "abrasi",
    "LETUSAN GUNUNG API": "erupsi",
}

# Urutan = urutan slot palet kategorikal di gaya.css (tervalidasi untuk pasangan bersebelahan).
URUT = ["banjir", "karhutla", "angin", "kering", "abrasi", "longsor", "gempa", "erupsi"]
kode = json.load(open(KODE, encoding="utf-8"))
daerah = [d["id"] for d in json.load(open(DAERAH, encoding="utf-8"))["daerah"]]
indeks = {d: i for i, d in enumerate(daerah)}
angka = lambda s: max(0, int(float(s or 0)))
kejadian = []
tahunan = collections.defaultdict(collections.Counter)
dilewati = collections.Counter()
for _, el in ET.iterparse(XML, events=("end",)):
    if el.tag != "TR":
        continue
    a = {c.tag: (c.text or "").strip() for c in el}
    el.clear()
    if "fechano" not in a:
        continue
    th = angka(a["fechano"])
    j = JENIS.get(a.get("evento", ""))
    if j is None:
        dilewati["bukan bencana alam"] += 1
        continue
    if not AWAL <= th <= AKHIR:
        dilewati["di luar rentang"] += 1
        continue
    d = kode.get(a.get("level1", ""))
    if d is None:
        dilewati["tanpa kabupaten"] += 1
        continue
    korban = angka(a["muertos"]) + angka(a["desaparece"])
    # DIBI: menderita (damnificados) + mengungsi (evacuados); ambil yang lebih besar supaya tidak dobel.
    terdampak = max(angka(a["damnificados"]), angka(a["evacuados"]))
    rumah = angka(a["vivdest"]) + angka(a["vivafec"])
    kejadian.append([indeks[d], th - AWAL, angka(a["fechames"]), angka(a["fechadia"]), URUT.index(j), korban, terdampak, rumah])
    tahunan[th][j] += 1

kejadian.sort(key=lambda k: (k[1], k[2], k[3]))
os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
keluar = {"awal": AWAL, "akhir": AKHIR, "jenis": URUT, "daerah": daerah, "k": kejadian}
json.dump(keluar, open(KELUAR, "w"), separators=(",", ":"))
print("kejadian:", len(kejadian), "| dilewati:", dict(dilewati))
for th in range(AWAL, AKHIR + 1):
    print(th, sum(tahunan[th].values()), dict(tahunan[th]))
