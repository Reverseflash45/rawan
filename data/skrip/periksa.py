"""Periksa isi ekspor DesInventar Indonesia: kolom, rentang tahun, jenis kejadian, kelengkapan kode wilayah."""
import collections
import sys
import xml.etree.ElementTree as ET

BERKAS = sys.argv[1]

kolom = collections.Counter()
per_tahun = collections.Counter()
per_jenis = collections.Counter()
ada_l2 = 0
n = 0
contoh = []
for _, el in ET.iterparse(BERKAS, events=("end",)):
    if el.tag != "TR":
        continue
    anak = {c.tag: (c.text or "").strip() for c in el}
    if "fechano" in anak:
        n += 1
        for k, v in anak.items():
            if v:
                kolom[k] += 1
        per_tahun[anak["fechano"][:4]] += 1
        per_jenis[anak.get("evento", "")] += 1
        if anak.get("level2"):
            ada_l2 += 1
        if len(contoh) < 2:
            contoh.append(anak)
    el.clear()

print("baris kejadian:", n, "| dengan level2:", ada_l2)
print("kolom terisi:", kolom.most_common(60))
print("tahun:", sorted(per_tahun.items())[:5], "...", sorted(per_tahun.items())[-12:])
print("jenis:", per_jenis.most_common(40))
for c in contoh:
    print(c)
