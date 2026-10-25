/* Logika murni (tanpa DOM) supaya bisa diuji. */

/** Satu kejadian: [i_daerah, tahun-awal, bulan 1–12 (0 = tak tercatat), hari, i_jenis, meninggal+hilang, terdampak, rumah rusak]. */
export type Kejadian = [number, number, number, number, number, number, number, number];
export type Data = { awal: number; akhir: number; jenis: string[]; daerah: string[]; k: Kejadian[] };
export type Daerah = { id: string; nama: string; prov: string; pulau: string; titik: [number, number] };

/** Urutan sama dengan slot palet kategorikal (--j0 … --j7) di gaya.css. */
export const JENIS: { kode: string; nama: string; kalimat: string }[] = [
  { kode: "banjir", nama: "Banjir", kalimat: "banjir" },
  { kode: "karhutla", nama: "Kebakaran hutan & lahan", kalimat: "kebakaran hutan dan lahan" },
  { kode: "angin", nama: "Puting beliung", kalimat: "puting beliung" },
  { kode: "kering", nama: "Kekeringan", kalimat: "kekeringan" },
  { kode: "abrasi", nama: "Gelombang pasang & abrasi", kalimat: "gelombang pasang dan abrasi" },
  { kode: "longsor", nama: "Tanah longsor", kalimat: "tanah longsor" },
  { kode: "gempa", nama: "Gempa & tsunami", kalimat: "gempa dan tsunami" },
  { kode: "erupsi", nama: "Letusan gunung api", kalimat: "letusan gunung api" },
];
export const NJENIS = JENIS.length;

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const fmt = new Intl.NumberFormat("id-ID");
export const angka = (x: number) => fmt.format(Math.round(x));
export const persen = (x: number) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: x < 0.1 ? 1 : 0 }).format(x * 100)}%`;

/** Pastikan data yang dimuat sesuai urutan jenis di kode. */
export function cekData(d: Data) {
  if (d.jenis.join() !== JENIS.map((j) => j.kode).join()) throw new Error("Urutan jenis di data tidak cocok");
}

/** Jumlah kejadian per daerah (indeks daerah), untuk satu jenis atau semua jenis (null). */
export function jumlahPerDaerah(d: Data, jenis: number | null): number[] {
  const n = new Array(d.daerah.length).fill(0);
  for (const k of d.k) if (jenis === null || k[4] === jenis) n[k[0]]++;
  return n;
}

/** Jumlah kejadian per jenis untuk semua daerah sekaligus: hasil[jenis][i_daerah]. */
export function jumlahPerDaerahJenis(d: Data): number[][] {
  const h = JENIS.map(() => new Array(d.daerah.length).fill(0));
  for (const k of d.k) h[k[4]][k[0]]++;
  return h;
}

/** Batas atas tiap kelas peta (5 kelas) dari kuantil daerah yang punya kejadian; dibulatkan dan unik. */
export function batasKelas(nilai: number[], kelas = 5): number[] {
  const a = nilai.filter((x) => x > 0).sort((p, q) => p - q);
  if (!a.length) return [];
  const batas: number[] = [];
  for (let i = 1; i < kelas; i++) {
    const v = a[Math.min(a.length - 1, Math.floor((a.length * i) / kelas))];
    if (!batas.length || v > batas.at(-1)!) batas.push(v);
  }
  if (a.at(-1)! > (batas.at(-1) ?? 0)) batas.push(a.at(-1)!);
  return batas;
}

/** Kelas 0..n-1 untuk nilai > 0; -1 untuk nol (tidak tercatat). */
export function kelasDari(nilai: number, batas: number[]): number {
  if (nilai <= 0) return -1;
  for (let i = 0; i < batas.length; i++) if (nilai <= batas[i]) return i;
  return batas.length - 1;
}

/** Label rentang tiap kelas, mis. "1–3", "4–9", "10–24". */
export function labelKelas(batas: number[]): string[] {
  return batas.map((b, i) => {
    const bawah = i === 0 ? 1 : batas[i - 1] + 1;
    return bawah === b ? angka(b) : `${angka(bawah)}–${angka(b)}`;
  });
}

/** Kejadian nasional per bulan untuk satu jenis (null = semua). Bulan tak tercatat dilewati. */
export function perBulan(d: Data, jenis: number | null, iDaerah: number | null = null): number[] {
  const b = new Array(12).fill(0);
  for (const k of d.k) {
    if (jenis !== null && k[4] !== jenis) continue;
    if (iDaerah !== null && k[0] !== iDaerah) continue;
    if (k[2] >= 1 && k[2] <= 12) b[k[2] - 1]++;
  }
  return b;
}

/** Kejadian per tahun untuk satu jenis (null = semua). */
export function perTahun(d: Data, jenis: number | null, iDaerah: number | null = null): number[] {
  const t = new Array(d.akhir - d.awal + 1).fill(0);
  for (const k of d.k) {
    if (jenis !== null && k[4] !== jenis) continue;
    if (iDaerah !== null && k[0] !== iDaerah) continue;
    t[k[1]]++;
  }
  return t;
}

export type Ringkas = {
  total: number;
  perJenis: number[];
  korban: number;
  terdampak: number;
  rumah: number;
  /** Kejadian dengan korban jiwa atau rumah rusak terbanyak, maksimal 5. */
  terparah: Kejadian[];
};

export function ringkasDaerah(d: Data, iDaerah: number): Ringkas {
  const perJenis = new Array(NJENIS).fill(0);
  let korban = 0;
  let terdampak = 0;
  let rumah = 0;
  const milik: Kejadian[] = [];
  for (const k of d.k) {
    if (k[0] !== iDaerah) continue;
    perJenis[k[4]]++;
    korban += k[5];
    terdampak += k[6];
    rumah += k[7];
    milik.push(k);
  }
  const terparah = milik
    .filter((k) => k[5] > 0 || k[7] > 0)
    .sort((a, b) => b[5] - a[5] || b[7] - a[7])
    .slice(0, 5);
  return { total: milik.length, perJenis, korban, terdampak, rumah, terparah };
}

/** Bagian tiap jenis dari seluruh kejadian dan seluruh korban jiwa. */
export function bagianJenis(d: Data) {
  const kej = new Array(NJENIS).fill(0);
  const korban = new Array(NJENIS).fill(0);
  for (const k of d.k) {
    kej[k[4]]++;
    korban[k[4]] += k[5];
  }
  const tk = kej.reduce((a, b) => a + b, 0) || 1;
  const tkb = korban.reduce((a, b) => a + b, 0) || 1;
  return JENIS.map((_, j) => ({ jenis: j, kejadian: kej[j], korban: korban[j], bagianKejadian: kej[j] / tk, bagianKorban: korban[j] / tkb }));
}

/** Daerah dengan kejadian terbanyak untuk satu jenis (null = semua). */
export function peringkat(d: Data, jenis: number | null, n = 10) {
  return jumlahPerDaerah(d, jenis)
    .map((jumlah, i) => ({ i, jumlah }))
    .filter((x) => x.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah || a.i - b.i)
    .slice(0, n);
}

/** Indeks bulan (0–11) dengan kejadian terbanyak. */
export const bulanPuncak = (b: number[]) => b.reduce((m, x, i) => (x > b[m] ? i : m), 0);

/** Huruf kecil, tanpa tanda baca/awalan "Kab."/"Kota", untuk pencarian. */
export function normal(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(kab|kabupaten|kota|adm|administrasi)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cari daerah: awalan kata lebih dulu, lalu yang memuat. */
export function cari(daftar: Daerah[], kueri: string, batas = 8): Daerah[] {
  const q = normal(kueri);
  if (!q) return [];
  // "Kota Kediri" vs "Kab. Kediri": awalan yang diketik menentukan mana yang didahulukan
  const mau = /^\s*kota\b/i.test(kueri) ? "Kota" : /^\s*kab/i.test(kueri) ? "Kab." : null;
  const skor = (d: Daerah) => {
    const n = normal(d.nama);
    const beda = mau && !d.nama.startsWith(mau) ? 0.5 : 0;
    if (n === q) return 0 + beda;
    if (n.startsWith(q)) return 1 + beda;
    if (n.split(" ").some((k) => k.startsWith(q))) return 2 + beda;
    if (n.includes(q)) return 3 + beda;
    if (normal(d.prov).startsWith(q)) return 4;
    return 9;
  };
  return daftar
    .map((d) => ({ d, s: skor(d) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s || a.d.nama.localeCompare(b.d.nama, "id"))
    .slice(0, batas)
    .map((x) => x.d);
}
