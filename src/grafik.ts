/* Grafik SVG/HTML kecil. Spesifikasi tanda mengikuti panduan dataviz:
   celah 2px antarsegmen, ujung data membulat 4px, label langsung, kisi rambut. */
import { BULAN, BULAN_PANJANG, JENIS, angka, bulanPuncak, persen } from "./inti";

const NS = "http://www.w3.org/2000/svg";
export const warnaJenis = (j: number) => `var(--j${j})`;

/* ---------- tooltip bersama ---------- */
const tip = document.createElement("div");
tip.className = "tooltip";
tip.hidden = true;
tip.setAttribute("role", "status");
document.body.append(tip);

/** Isi tooltip lewat textContent (nama daerah dsb. diperlakukan sebagai data). */
export function tampilkanTip(x: number, y: number, kuat: string, lemah: string) {
  tip.replaceChildren();
  const b = document.createElement("b");
  b.textContent = kuat;
  tip.append(b, document.createTextNode(lemah));
  tip.hidden = false;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const kiri = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
  const atas = y - h - 12 < 8 ? y + 16 : y - h - 12;
  tip.style.left = `${kiri}px`;
  tip.style.top = `${atas}px`;
}
export const sembunyikanTip = () => {
  tip.hidden = true;
};

function el<K extends keyof SVGElementTagNameMap>(nama: K, attr: Record<string, string | number> = {}, teks?: string) {
  const e = document.createElementNS(NS, nama);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function h<K extends keyof HTMLElementTagNameMap>(nama: K, kelas?: string, teks?: string) {
  const e = document.createElement(nama);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

/** Jalur batang dengan ujung atas membulat dan pangkal rata. */
function batangAtas(x: number, y: number, w: number, tinggi: number, r = 3) {
  const rr = Math.min(r, w / 2, tinggi);
  const dasar = y + tinggi;
  return `M${x},${dasar}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${dasar}Z`;
}

/* ---------- komposisi jenis di satu daerah ---------- */
export function komposisi(wadah: HTMLElement, perJenis: number[]) {
  const total = perJenis.reduce((a, b) => a + b, 0);
  const batang = h("div", "komposisi");
  batang.setAttribute("role", "img");
  batang.setAttribute(
    "aria-label",
    "Komposisi jenis: " +
      perJenis
        .map((n, j) => (n ? `${JENIS[j].nama} ${n}` : ""))
        .filter(Boolean)
        .join(", "),
  );
  const label = h("ul", "komposisi-label");
  perJenis.forEach((n, j) => {
    if (!n) return;
    const s = h("span");
    s.style.flex = String(n);
    s.style.background = warnaJenis(j);
    s.addEventListener("pointermove", (e) => tampilkanTip(e.clientX, e.clientY, `${angka(n)} ${JENIS[j].kalimat}`, ` ${persen(n / total)} dari semua kejadian`));
    s.addEventListener("pointerleave", sembunyikanTip);
    batang.append(s);
    const li = h("li");
    const i = h("i");
    i.style.background = warnaJenis(j);
    li.append(i, h("span", "", JENIS[j].nama), h("b", "", angka(n)));
    label.append(li);
  });
  wadah.replaceChildren(batang, label);
}

/* ---------- 100%: bagian kejadian vs bagian korban ---------- */
export function duaBatang(wadah: HTMLElement, data: { jenis: number; kejadian: number; korban: number; bagianKejadian: number; bagianKorban: number }[]) {
  const lebar = Math.max(280, wadah.clientWidth);
  const baris = (judul: string, ket: string, nilai: (d: (typeof data)[number]) => number, mentah: (d: (typeof data)[number]) => number, satuan: string) => {
    const b = h("div", "baris-batang");
    const p = h("p", "", judul);
    p.append(h("span", "", ` ${ket}`));
    const bt = h("div", "batang-100");
    bt.setAttribute("role", "img");
    bt.setAttribute("aria-label", `${judul}: ` + data.map((d) => `${JENIS[d.jenis].nama} ${persen(nilai(d))}`).join(", "));
    for (const d of data) {
      const v = nilai(d);
      if (v <= 0) continue;
      const s = h("span");
      s.style.flex = String(v);
      s.style.background = warnaJenis(d.jenis);
      // label hanya bila segmennya cukup lebar untuk angkanya
      if (v * lebar >= 54) s.append(h("em", "", persen(v)));
      s.addEventListener("pointermove", (e) => tampilkanTip(e.clientX, e.clientY, JENIS[d.jenis].nama, ` ${persen(v)}, ${angka(mentah(d))} ${satuan}`));
      s.addEventListener("pointerleave", sembunyikanTip);
      bt.append(s);
    }
    b.append(p, bt);
    return b;
  };
  const legenda = h("ul", "legenda-jenis");
  for (const d of data) {
    const li = h("li");
    const i = h("i");
    i.style.background = warnaJenis(d.jenis);
    li.append(i, document.createTextNode(JENIS[d.jenis].nama));
    legenda.append(li);
  }
  wadah.replaceChildren(
    legenda,
    baris("Kejadian", `${angka(data.reduce((a, d) => a + d.kejadian, 0))} kejadian`, (d) => d.bagianKejadian, (d) => d.kejadian, "kejadian"),
    baris("Korban jiwa", `${angka(data.reduce((a, d) => a + d.korban, 0))} meninggal dan hilang`, (d) => d.bagianKorban, (d) => d.korban, "jiwa"),
  );
}

/* ---------- kolom 12 bulan untuk satu jenis ---------- */
export function kolomBulan(wadah: HTMLElement, bulan: number[], jenis: number, tinggiTarget = 110) {
  const W = Math.max(200, wadah.clientWidth);
  const H = tinggiTarget;
  const m = { t: 16, r: 2, b: 18, l: 2 };
  const maks = Math.max(1, ...bulan);
  const lebar = (W - m.l - m.r) / 12;
  const w = Math.max(4, lebar - 3);
  const puncak = bulanPuncak(bulan);
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${JENIS[jenis].nama} per bulan, puncak ${BULAN_PANJANG[puncak]}` });
  svg.append(el("line", { class: "sumbu-garis", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
  bulan.forEach((n, i) => {
    const x = m.l + i * lebar + (lebar - w) / 2;
    const t = (n / maks) * (H - m.t - m.b);
    if (n > 0)
      svg.append(el("path", { d: batangAtas(x, H - m.b - t, w, t), fill: warnaJenis(jenis), "fill-opacity": i === puncak ? 1 : 0.55 }));
    // hanya bulan ganjil yang diberi label supaya tidak berdesakan di kartu sempit
    if (i % 2 === 0 || W > 320) svg.append(el("text", { x: x + w / 2, y: H - 4, "text-anchor": "middle" }, BULAN[i].slice(0, W > 320 ? 3 : 1)));
    if (i === puncak) svg.append(el("text", { x: x + w / 2, y: H - m.b - t - 4, "text-anchor": "middle", style: "fill:var(--tinta);font-weight:700" }, angka(n)));
    const hit = el("rect", { x: m.l + i * lebar, y: m.t - 10, width: lebar, height: H - m.t - m.b + 10, fill: "transparent" });
    hit.addEventListener("pointermove", (e) => tampilkanTip((e as PointerEvent).clientX, (e as PointerEvent).clientY, `${angka(n)} kejadian`, ` ${BULAN_PANJANG[i]}`));
    hit.addEventListener("pointerleave", sembunyikanTip);
    svg.append(hit);
  });
  wadah.replaceChildren(svg);
}

/* ---------- 12 bulan bertumpuk per jenis (kartu daerah) ---------- */
export function bulanBertumpuk(wadah: HTMLElement, perBulanJenis: number[][], nama: string) {
  const W = Math.max(260, wadah.clientWidth);
  const H = 150;
  const m = { t: 10, r: 2, b: 18, l: 2 };
  const total = Array.from({ length: 12 }, (_, b) => perBulanJenis.reduce((a, j) => a + j[b], 0));
  const maks = Math.max(1, ...total);
  const lebar = (W - m.l - m.r) / 12;
  const w = Math.max(6, lebar - 4);
  const skala = (H - m.t - m.b) / maks;
  const svg = el("svg", { class: "grafik", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Kejadian per bulan di ${nama}, 2010–2019` });
  svg.append(el("line", { class: "sumbu-garis", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
  for (let b = 0; b < 12; b++) {
    const x = m.l + b * lebar + (lebar - w) / 2;
    let y = H - m.b;
    const isi = perBulanJenis.map((j, i) => ({ i, n: j[b] })).filter((s) => s.n > 0);
    isi.forEach((s, k) => {
      const t = s.n * skala;
      const atas = k === isi.length - 1;
      // segmen dipisah celah 2px; hanya segmen teratas yang ujungnya membulat
      const tinggi = Math.max(1, t - (atas ? 0 : 2));
      svg.append(atas ? el("path", { d: batangAtas(x, y - t, w, tinggi), fill: warnaJenis(s.i) }) : el("rect", { x, y: y - t + 2, width: w, height: tinggi, fill: warnaJenis(s.i) }));
      y -= t;
    });
    svg.append(el("text", { x: x + w / 2, y: H - 4, "text-anchor": "middle" }, BULAN[b].slice(0, W > 360 ? 3 : 1)));
    const hit = el("rect", { x: m.l + b * lebar, y: m.t, width: lebar, height: H - m.t - m.b, fill: "transparent" });
    hit.addEventListener("pointermove", (e) => {
      const rinci = isi.map((s) => `${JENIS[s.i].nama} ${s.n}`).join(", ");
      tampilkanTip((e as PointerEvent).clientX, (e as PointerEvent).clientY, `${BULAN_PANJANG[b]}: ${angka(total[b])} kejadian`, rinci ? ` ${rinci}` : "");
    });
    hit.addEventListener("pointerleave", sembunyikanTip);
    svg.append(hit);
  }
  wadah.replaceChildren(svg);
}
