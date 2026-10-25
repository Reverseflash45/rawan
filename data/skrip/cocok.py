"""Cocokkan kode kabupaten/kota BPS di DesInventar ke id 514 daerah (dari proyek Napas).

Kode BPS: 2 digit provinsi + 2 digit daerah; 71 ke atas = kota. Nama di DesInventar tanpa
awalan Kab./Kota, jadi awalan ditentukan dari kode. Kode lama yang sudah dimekarkan tetap
menunjuk induknya (nama induk masih sama).
"""
import json
import re
import sys
import xml.etree.ElementTree as ET

XML, DAERAH, KELUAR = sys.argv[1], sys.argv[2], sys.argv[3]


def slug(s: str) -> str:
    s = s.lower().replace("’", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# Kode yang namanya di DIBI dieja beda dengan nama resmi sekarang: langsung ke id.
PER_KODE = {
    "1206": "kab-toba",
    "1222": "kab-labuhanbatu-selatan",
    "1223": "kab-labuhanbatu-utara",
    "1272": "kota-tanjungbalai",
    "1273": "kota-pematangsiantar",
    "1277": "kota-padangsidimpuan",
    "1278": "kota-gunungsitoli",
    "1504": "kab-batang-hari",
    "1971": "kota-pangkal-pinang",
    "2172": "kota-tanjungpinang",
    "6271": "kota-palangka-raya",
    "6372": "kota-banjar-baru",
    "6411": "kab-mahakam-ulu",
    "7108": "kab-kepulauan-sitaro",
    "7309": "kab-pangkajene-dan-kepulauan",
    "7372": "kota-parepare",
    "7472": "kota-baubau",
    "8101": "kab-kepulauan-tanimbar",  # Maluku Tenggara Barat berganti nama pada 2019
    "7206": "kab-tolitoli",
    "9101": "kab-fakfak",
}

ids = {d["id"] for d in json.load(open(DAERAH, encoding="utf-8"))["daerah"]}
kode = {}
for _, el in ET.iterparse(XML, events=("end",)):
    if el.tag == "TR":
        a = {c.tag: (c.text or "").strip() for c in el}
        if "fechano" in a and a.get("level1"):
            kode.setdefault(a["level1"], (a["name0"], a["name1"]))
        el.clear()

peta, gagal = {}, []
for k, (prov, nama) in sorted(kode.items()):
    awalan = "kota" if len(k) == 4 and int(k[2:]) >= 71 else "kab"
    n = re.sub(r"^(KABUPATEN|KAB\.?|KOTA)\s+", "", nama.strip(), flags=re.I)
    calon = PER_KODE.get(k, f"{awalan}-{slug(n)}")
    if calon in ids:
        peta[k] = calon
    else:
        gagal.append((k, prov, nama, calon))

json.dump(peta, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"kode: {len(kode)} | cocok: {len(peta)} | gagal: {len(gagal)} | daerah tanpa kode: {len(ids - set(peta.values()))}")
for g in gagal:
    print("  ", g)
