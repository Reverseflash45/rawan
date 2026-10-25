"""Cetak fakta ringkas dari public/data/kejadian.json untuk bahan teks halaman."""
import collections
import json
import sys

d = json.load(open(sys.argv[1]))
J, D, K = d["jenis"], d["daerah"], d["k"]
nama = {x["id"]: x["nama"] for x in json.load(open(sys.argv[2], encoding="utf-8"))["daerah"]}

per_jenis = collections.Counter(J[k[4]] for k in K)
korban_jenis = collections.Counter()
rumah_jenis = collections.Counter()
for k in K:
    korban_jenis[J[k[4]]] += k[5]
    rumah_jenis[J[k[4]]] += k[7]
print("total", len(K), "korban", sum(k[5] for k in K))
for j in J:
    print(f"  {j:9} kejadian {per_jenis[j]:6} ({per_jenis[j]/len(K):5.1%}) | korban {korban_jenis[j]:6} ({korban_jenis[j]/max(1,sum(korban_jenis.values())):5.1%}) | rumah {rumah_jenis[j]}")

daerah_jenis = collections.defaultdict(set)
for k in K:
    daerah_jenis[J[k[4]]].add(k[0])
semua = {k[0] for k in K}
print("daerah dengan >=1 kejadian:", len(semua), "dari", len(D))
for j in J:
    print(f"  daerah pernah {j}: {len(daerah_jenis[j])}")

per_daerah = collections.Counter(k[0] for k in K)
print("terbanyak:", [(nama[D[i]], n) for i, n in per_daerah.most_common(12)])
for j in ["banjir", "longsor", "angin", "karhutla", "kering"]:
    c = collections.Counter(k[0] for k in K if J[k[4]] == j)
    print(f"  {j} terbanyak:", [(nama[D[i]], n) for i, n in c.most_common(5)])

bulan = {j: [0] * 12 for j in J}
for k in K:
    if 1 <= k[2] <= 12:
        bulan[J[k[4]]][k[2] - 1] += 1
for j in J:
    b = bulan[j]
    puncak = max(range(12), key=lambda i: b[i]) + 1
    print(f"  bulan {j}: puncak {puncak} | {b}")

mematikan = sorted(K, key=lambda k: -k[5])[:12]
print("paling mematikan:", [(nama[D[k[0]]], d['awal'] + k[1], k[2], J[k[4]], k[5]) for k in mematikan])
jumlah_jenis = collections.Counter(len({J[k[4]] for k in K if k[0] == i}) for i in semua)
print("sebaran jumlah jenis per daerah:", sorted(jumlah_jenis.items()))
