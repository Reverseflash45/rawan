# Rawan

Bencana alam apa saja yang pernah melanda daerahmu? Rawan memetakan 23.453 kejadian bencana alam di 514 kabupaten/kota
Indonesia, 2010–2019: banjir, tanah longsor, puting beliung, kekeringan, kebakaran hutan dan lahan, gelombang pasang dan
abrasi, gempa dan tsunami, serta letusan gunung api.

**https://rawan.raffstw.my.id**

## Fitur

- Cari kabupaten/kota: jumlah kejadian, komposisi jenis, korban jiwa, warga terdampak, rumah rusak, kejadian terparah,
  dan bulan-bulan rawan. Setiap daerah punya tautan sendiri (`#daerah=kab-bogor`).
- Peta yang bisa dipilih per jenis bencana, lengkap dengan sepuluh daerah yang paling sering mencatatnya
  (`#jenis=longsor`).
- Perbandingan bagian kejadian dengan bagian korban jiwa: yang paling sering belum tentu yang paling mematikan.
- Musim tiap jenis bencana, per bulan.

## Data

Data Informasi Bencana Indonesia (DIBI) milik BNPB, lewat salinan yang dibagikan terbuka di
[DesInventar](https://www.desinventar.net/DesInventar/profiletab.jsp?countrycode=idn) (UNDRR). Batas wilayah dari
geoBoundaries (BPS, OCHA).

```
curl -L -o data/mentah/desinventar/DI_export_idn.zip https://www.desinventar.net/DesInventar/download/DI_export_idn.zip
# ekstrak, lalu:
python -I data/skrip/cocok.py data/mentah/desinventar/DI_export_idn.xml data/daerah.json data/kode_bps.json
npm run data
python -I data/skrip/fakta.py public/data/kejadian.json data/daerah.json   # ringkasan untuk teks halaman
```

- `cocok.py` mencocokkan kode kabupaten/kota BPS di data (507 kode) ke 514 daerah saat ini. Kode 71 ke atas berarti kota;
  nama yang ejaannya berubah dipetakan langsung per kode.
- `olah.py` menyimpan setiap kejadian 2010–2019 sebagai deret angka ringkas (sekitar 105 KB setelah gzip). Semua
  agregasi dihitung di peramban supaya bisa dipilah per jenis.
- Pencatatan sebelum sekitar 2008 masih jarang, dan salinan terbuka berhenti di 2019, jadi rentangnya satu dekade.
- Yang dihitung hanya bencana alam. Korban jiwa = meninggal + hilang; terdampak = nilai terbesar dari menderita atau
  mengungsi supaya tidak dihitung ganda.

Angka ini adalah jumlah kejadian yang **dilaporkan**, bukan ukuran besarnya bencana. Daerah yang rajin melapor tampak
lebih sering terkena.

## Warna

Delapan jenis bencana memakai palet kategorikal tervalidasi dengan urutan tetap, selalu disertai label. Peta memakai satu
rona dongker (5 kelas kuantil, divalidasi ordinal terhadap latar putih). Tampilan rompi relawan: pita oranye high-vis
bergaris reflektif.

## Menjalankan

```
npm install
npm run dev
npm test
npm run build
```

Vite + TypeScript, tanpa framework UI; peta dengan d3-geo dan topojson-client.
