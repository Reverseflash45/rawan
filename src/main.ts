import "./gaya.css";
import type { Topology } from "topojson-specification";
import daerahJson from "./daerah.json";
import { bulanBertumpuk, duaBatang, kolomBulan, komposisi, warnaJenis } from "./grafik";
import {
  BULAN_PANJANG,
  type Daerah,
  type Data,
  JENIS,
  angka,
  bagianJenis,
  batasKelas,
  bulanPuncak,
  cari,
  cekData,
  jumlahPerDaerah,
  jumlahPerDaerahJenis,
  kelasDari,
  labelKelas,
  perBulan,
  persen,
  peringkat,
  ringkasDaerah,
} from "./inti";
import { buatPeta } from "./peta";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const DAERAH = (daerahJson as { daerah: Daerah[] }).daerah;
const daerahDari = new Map(DAERAH.map((d) => [d.id, d]));

const [data, topo] = await Promise.all([
  fetch("/data/kejadian.json").then((r) => r.json() as Promise<Data>),
  fetch("/data/peta.json").then((r) => r.json() as Promise<Topology>),
]);
cekData(data);
const indeks = new Map(data.daerah.map((id, i) => [id, i]));
const perJenisDaerah = jumlahPerDaerahJenis(data);
const semuaDaerah = jumlahPerDaerah(data, null);
const RENTANG = `${data.awal}–${data.akhir}`;
const bagian = bagianJenis(data);

/* ---------- pembuka ---------- */
{
  const ada = semuaDaerah.filter((n) => n > 0).length;
  $("lead").textContent =
    `${angka(data.k.length)} bencana alam tercatat di ${ada} dari ${angka(DAERAH.length)} kabupaten/kota, ${RENTANG}. ` +
    "Cek apa saja yang pernah melanda daerahmu.";
}

{
  const urut = [...bagian].sort((a, b) => b.kejadian - a.kejadian);
  $("papan-jenis").replaceChildren(
    ...urut.map((d) => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.style.background = warnaJenis(d.jenis);
      li.append(i, Object.assign(document.createElement("span"), { textContent: JENIS[d.jenis].nama }), Object.assign(document.createElement("b"), { textContent: angka(d.kejadian) }));
      return li;
    }),
  );
}

/* ---------- peta per jenis ---------- */
let jenisPeta: number | null = null;
let batas: number[] = [];
let nilaiPeta: number[] = semuaDaerah;
const kalimatJenis = () => (jenisPeta === null ? "bencana alam" : JENIS[jenisPeta].kalimat);

const peta = buatPeta(
  $("wadah-peta"),
  topo,
  (id) => {
    const i = indeks.get(id);
    const n = i === undefined ? 0 : nilaiPeta[i];
    return [n ? `${angka(n)} kejadian` : "Tidak tercatat", ` ${daerahDari.get(id)?.nama ?? id}, ${kalimatJenis()} ${RENTANG}`];
  },
  (id) => pilihDaerah(id, true),
);

function gambarPilihJenis() {
  const wadah = $("pilih-jenis");
  const tombol = (j: number | null, nama: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(j === jenisPeta));
    b.tabIndex = j === jenisPeta ? 0 : -1;
    b.dataset.jenis = j === null ? "semua" : String(j);
    if (j !== null) {
      const i = document.createElement("i");
      i.style.setProperty("--warna", warnaJenis(j));
      b.append(i);
    }
    b.append(document.createTextNode(nama));
    return b;
  };
  wadah.replaceChildren(tombol(null, "Semua jenis"), ...JENIS.map((j, i) => tombol(i, j.nama)));
}
$("pilih-jenis").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (b) gantiJenis(b.dataset.jenis === "semua" ? null : Number(b.dataset.jenis), true);
});
$("pilih-jenis").addEventListener("keydown", (e) => {
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
  e.preventDefault();
  const urut = [null, ...JENIS.map((_, i) => i)];
  const i = urut.indexOf(jenisPeta);
  const maju = e.key === "ArrowRight" || e.key === "ArrowDown";
  gantiJenis(urut[(i + (maju ? 1 : urut.length - 1)) % urut.length], true);
  $("pilih-jenis").querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
});

function gantiJenis(j: number | null, simpan: boolean) {
  jenisPeta = j;
  nilaiPeta = j === null ? semuaDaerah : perJenisDaerah[j];
  batas = batasKelas(nilaiPeta);
  peta.warnai((id) => {
    const i = indeks.get(id);
    const k = kelasDari(i === undefined ? 0 : nilaiPeta[i], batas);
    return k < 0 ? "var(--kosong)" : `var(--p${k})`;
  });
  gambarPilihJenis();
  const label = labelKelas(batas);
  $("legenda").replaceChildren(
    ...label.map((t, k) => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.style.background = `var(--p${k})`;
      li.append(i, document.createTextNode(t));
      return li;
    }),
    (() => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.style.background = "var(--kosong)";
      li.append(i, document.createTextNode("tidak tercatat"));
      return li;
    })(),
  );
  const ada = nilaiPeta.filter((n) => n > 0).length;
  const total = nilaiPeta.reduce((a, b) => a + b, 0);
  const atas = peringkat(data, j, 1)[0];
  const r = $("ringkas-peta");
  r.innerHTML = "";
  const b = (t: string) => Object.assign(document.createElement("b"), { textContent: t });
  r.append(
    b(`${angka(total)} kejadian ${kalimatJenis()}`),
    ` tercatat di ${ada} dari ${DAERAH.length} kabupaten/kota, ${RENTANG}. `,
    ...(atas ? ["Paling sering di ", b(daerahDari.get(data.daerah[atas.i])!.nama), ` (${angka(atas.jumlah)} kali).`] : []),
  );
  gambarPeringkat();
  if (simpan) simpanHash();
}

function gambarPeringkat() {
  const daftar = peringkat(data, jenisPeta, 10);
  const maks = daftar[0]?.jumlah ?? 1;
  $("judul-peringkat").textContent = `Paling sering: ${jenisPeta === null ? "semua jenis" : JENIS[jenisPeta].nama.toLowerCase()}`;
  $("peringkat").replaceChildren(
    ...daftar.map(({ i, jumlah }) => {
      const li = document.createElement("li");
      li.dataset.id = data.daerah[i];
      li.tabIndex = 0;
      const nm = Object.assign(document.createElement("span"), { className: "nm", textContent: daerahDari.get(data.daerah[i])!.nama });
      const jml = Object.assign(document.createElement("span"), { className: "jml", textContent: angka(jumlah) });
      const bt = Object.assign(document.createElement("span"), { className: "batang" });
      bt.style.width = `${(jumlah / maks) * 100}%`;
      bt.style.setProperty("--warna", jenisPeta === null ? "var(--dongker)" : warnaJenis(jenisPeta));
      li.append(nm, jml, bt);
      return li;
    }),
  );
}
const pilihDariPeringkat = (e: Event) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("li")?.dataset.id;
  if (id) pilihDaerah(id, true);
};
$("peringkat").addEventListener("click", pilihDariPeringkat);
$("peringkat").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    pilihDariPeringkat(e);
  }
});

/* ---------- sering vs mematikan ---------- */
function gambarMematikan() {
  const g = bagian[6];
  const tiga = [0, 2, 5].map((j) => bagian[j]);
  const sering = tiga.reduce((a, d) => a + d.bagianKejadian, 0);
  $("teks-mematikan").textContent =
    `Banjir, puting beliung, dan tanah longsor mencakup ${persen(sering)} dari semua kejadian. ` +
    `Gempa dan tsunami hanya ${persen(g.bagianKejadian)} kejadian, tetapi menyumbang ${persen(g.bagianKorban)} korban jiwa. ` +
    "Sebagian besar dari satu hari: gempa, tsunami, dan likuefaksi Palu dan sekitarnya pada 28 September 2018.";
  duaBatang($("dua-batang"), bagian);
}

/* ---------- musim ---------- */
function gambarMusim() {
  const kisi = $("kisi-musim");
  kisi.replaceChildren();
  const bulanSemua = JENIS.map((_, j) => perBulan(data, j));
  JENIS.forEach((jn, j) => {
    const b = bulanSemua[j];
    const puncak = bulanPuncak(b);
    const kartu = document.createElement("div");
    kartu.className = "musim-kartu";
    const h3 = document.createElement("h3");
    const i = document.createElement("i");
    i.style.background = warnaJenis(j);
    h3.append(i, document.createTextNode(jn.nama));
    const p = Object.assign(document.createElement("p"), { textContent: `Puncak ${BULAN_PANJANG[puncak]}, ${angka(b.reduce((a, x) => a + x, 0))} kejadian` });
    const g = document.createElement("div");
    kartu.append(h3, p, g);
    kisi.append(kartu);
    kolomBulan(g, b, j);
  });
  const p = (j: number) => BULAN_PANJANG[bulanPuncak(bulanSemua[j])];
  $("teks-musim").textContent =
    `Banjir dan puting beliung paling sering di ${p(0)}, tanah longsor di ${p(5)}, saat hujan sedang deras-derasnya. ` +
    `Separuh tahun kemudian giliran kemarau: kekeringan memuncak di ${p(3)} dan kebakaran hutan dan lahan di ${p(1)}. ` +
    "Gempa dan letusan gunung api tidak mengenal musim. Tiap kartu punya skala sendiri; bandingkan bentuknya, bukan tingginya.";
}

/* ---------- pencarian ---------- */
const kotak = $<HTMLInputElement>("kotak-cari");
const saran = $<HTMLUListElement>("saran");
let hasilCari: Daerah[] = [];
let aktif = -1;

function gambarSaran() {
  hasilCari = cari(DAERAH, kotak.value);
  aktif = hasilCari.length ? 0 : -1;
  saran.hidden = !hasilCari.length;
  kotak.setAttribute("aria-expanded", String(!saran.hidden));
  saran.replaceChildren(
    ...hasilCari.map((d, i) => {
      const li = document.createElement("li");
      li.id = `saran-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === aktif));
      li.dataset.id = d.id;
      const nama = Object.assign(document.createElement("span"), { textContent: d.nama });
      const prov = Object.assign(document.createElement("small"), { textContent: d.prov });
      li.append(nama, prov);
      return li;
    }),
  );
  kotak.setAttribute("aria-activedescendant", aktif >= 0 ? `saran-${aktif}` : "");
}
function tandaiAktif() {
  saran.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", String(i === aktif)));
  kotak.setAttribute("aria-activedescendant", aktif >= 0 ? `saran-${aktif}` : "");
}
kotak.addEventListener("input", gambarSaran);
kotak.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" && hasilCari.length) {
    e.preventDefault();
    aktif = (aktif + 1) % hasilCari.length;
    tandaiAktif();
  } else if (e.key === "ArrowUp" && hasilCari.length) {
    e.preventDefault();
    aktif = (aktif - 1 + hasilCari.length) % hasilCari.length;
    tandaiAktif();
  } else if (e.key === "Enter" && aktif >= 0) {
    e.preventDefault();
    pilihDaerah(hasilCari[aktif].id, true);
  } else if (e.key === "Escape") {
    saran.hidden = true;
    kotak.setAttribute("aria-expanded", "false");
  }
});
saran.addEventListener("pointerdown", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("li")?.dataset.id;
  if (id) {
    e.preventDefault();
    pilihDaerah(id, true);
  }
});
kotak.addEventListener("blur", () => {
  saran.hidden = true;
  kotak.setAttribute("aria-expanded", "false");
});

const PINTASAN = ["kab-bogor", "kota-semarang", "kab-bandung", "kota-palu", "kab-banjarnegara", "kab-ogan-komering-ilir"];
$("pintasan").replaceChildren(
  ...PINTASAN.filter((id) => daerahDari.has(id)).map((id) => {
    const li = document.createElement("li");
    const b = Object.assign(document.createElement("button"), { type: "button", textContent: daerahDari.get(id)!.nama });
    b.dataset.pilih = id;
    li.append(b);
    return li;
  }),
);
$("pintasan").addEventListener("click", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("[data-pilih]")?.dataset.pilih;
  if (id) pilihDaerah(id, true);
});

/* ---------- kartu daerah ---------- */
let terpilih: string | null = null;
const kartu = $("daerah");

function pilihDaerah(id: string, gulir: boolean) {
  if (!daerahDari.has(id)) return;
  terpilih = id;
  kotak.value = daerahDari.get(id)!.nama;
  saran.hidden = true;
  kotak.setAttribute("aria-expanded", "false");
  peta.pilih(id);
  gambarKartu();
  simpanHash();
  if (gulir) kartu.scrollIntoView({ block: "start" });
}

function tanggal(k: [number, number, number, number, ...number[]]) {
  const th = data.awal + k[1];
  if (k[2] < 1) return String(th);
  return k[3] >= 1 ? `${k[3]} ${BULAN_PANJANG[k[2] - 1]} ${th}` : `${BULAN_PANJANG[k[2] - 1]} ${th}`;
}

function gambarKartu() {
  if (!terpilih) return;
  const d = daerahDari.get(terpilih)!;
  const i = indeks.get(terpilih)!;
  const r = ringkasDaerah(data, i);
  kartu.hidden = false;
  kartu.replaceChildren();

  const kepala = Object.assign(document.createElement("div"), { className: "daerah-kepala" });
  const judul = document.createElement("div");
  judul.append(
    Object.assign(document.createElement("h2"), { className: "nama", textContent: d.nama }),
    Object.assign(document.createElement("p"), { className: "prov", textContent: d.prov }),
  );
  const aksi = Object.assign(document.createElement("div"), { className: "aksi" });
  const salin = Object.assign(document.createElement("button"), { type: "button", textContent: "Salin tautan" });
  salin.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      salin.textContent = "Tautan disalin";
    } catch {
      salin.textContent = "Salin dari bilah alamat";
    }
    setTimeout(() => (salin.textContent = "Salin tautan"), 2200);
  });
  const lihat = Object.assign(document.createElement("button"), { type: "button", textContent: "Lihat di peta" });
  lihat.addEventListener("click", () => $("peta").scrollIntoView({ block: "start" }));
  aksi.append(salin, lihat);
  kepala.append(judul, aksi);
  kartu.append(kepala);

  if (!r.total) {
    kartu.append(
      Object.assign(document.createElement("p"), {
        className: "kosong-daerah",
        textContent: `Tidak ada bencana alam yang tercatat untuk ${d.nama} di DIBI selama ${RENTANG}. Bisa jadi memang aman, bisa juga laporannya belum masuk, terutama untuk daerah yang baru dimekarkan.`,
      }),
    );
    return;
  }

  const isi = Object.assign(document.createElement("div"), { className: "daerah-isi" });
  const kiri = document.createElement("div");
  const kanan = document.createElement("div");
  isi.append(kiri, kanan);
  kartu.append(isi);

  const besar = Object.assign(document.createElement("p"), { className: "angka-besar", textContent: angka(r.total) });
  besar.append(Object.assign(document.createElement("small"), { textContent: `bencana alam tercatat, ${RENTANG}` }));
  const urutJenis = r.perJenis.map((n, j) => ({ n, j })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const utama = urutJenis[0];
  const nasional = semuaDaerah.filter((n) => n > r.total).length + 1;
  const kalimat = document.createElement("p");
  kalimat.className = "kalimat";
  const b = (t: string) => Object.assign(document.createElement("b"), { textContent: t });
  kalimat.append(
    "Paling sering ",
    b(JENIS[utama.j].kalimat),
    `, ${angka(utama.n)} kali (${persen(utama.n / r.total)}). `,
    `Ada ${urutJenis.length} dari ${JENIS.length} jenis bencana yang pernah tercatat di sini. `,
    `Peringkat ${nasional} dari ${DAERAH.length} daerah untuk jumlah kejadian.`,
  );
  const komp = document.createElement("div");
  komp.style.marginTop = "18px";
  const fakta = document.createElement("dl");
  fakta.className = "fakta";
  for (const [t, v] of [
    ["meninggal & hilang", r.korban],
    ["terdampak & mengungsi", r.terdampak],
    ["rumah rusak", r.rumah],
  ] as const) {
    const div = document.createElement("div");
    div.append(Object.assign(document.createElement("dd"), { textContent: angka(v) }), Object.assign(document.createElement("dt"), { textContent: t }));
    div.style.display = "flex";
    div.style.flexDirection = "column";
    fakta.append(div);
  }
  kiri.append(besar, kalimat, komp, fakta);
  komposisi(komp, r.perJenis);

  kanan.append(
    Object.assign(document.createElement("p"), { className: "judul-grafik", textContent: "Kapan biasanya terjadi" }),
    Object.assign(document.createElement("p"), { className: "ket-grafik", textContent: `Jumlah kejadian per bulan, ${RENTANG}` }),
  );
  const grafikBulan = document.createElement("div");
  kanan.append(grafikBulan);
  bulanBertumpuk(
    grafikBulan,
    JENIS.map((_, j) => perBulan(data, j, i)),
    d.nama,
  );
  if (r.terparah.length) {
    kanan.append(Object.assign(document.createElement("p"), { className: "judul-grafik", textContent: "Kejadian terparah" }));
    kanan.lastElementChild!.setAttribute("style", "margin-top:20px");
    const ol = document.createElement("ol");
    ol.className = "terparah";
    for (const k of r.terparah) {
      const li = document.createElement("li");
      const i2 = document.createElement("i");
      i2.style.background = warnaJenis(k[4]);
      const teks = document.createElement("span");
      teks.append(document.createTextNode(JENIS[k[4]].nama + " "), Object.assign(document.createElement("span"), { className: "tgl", textContent: tanggal(k) }));
      const n = Object.assign(document.createElement("span"), {
        className: "angka",
        textContent: k[5] > 0 ? `${angka(k[5])} jiwa` : `${angka(k[7])} rumah`,
      });
      li.append(i2, teks, n);
      ol.append(li);
    }
    kanan.append(ol);
  }
}

/* ---------- tautan ---------- */
function simpanHash() {
  const p = new URLSearchParams();
  if (terpilih) p.set("daerah", terpilih);
  if (jenisPeta !== null) p.set("jenis", JENIS[jenisPeta].kode);
  const h = p.toString();
  history.replaceState(null, "", h ? `#${h}` : location.pathname);
}

/* ---------- mulai ---------- */
const awal = new URLSearchParams(location.hash.slice(1));
const jenisAwal = JENIS.findIndex((j) => j.kode === awal.get("jenis"));
gantiJenis(jenisAwal >= 0 ? jenisAwal : null, false);
gambarMematikan();
gambarMusim();
const daerahAwal = awal.get("daerah");
if (daerahAwal && daerahDari.has(daerahAwal)) pilihDaerah(daerahAwal, false);

let lebarLalu = window.innerWidth;
let jedaUkur = 0;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lebarLalu) < 40) return;
  lebarLalu = window.innerWidth;
  clearTimeout(jedaUkur);
  jedaUkur = window.setTimeout(() => {
    gambarMusim();
    gambarMematikan();
    gambarKartu();
  }, 150);
});
