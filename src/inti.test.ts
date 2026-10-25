import { describe, expect, it } from "vitest";
import { type Data, type Kejadian, batasKelas, bagianJenis, bulanPuncak, cari, kelasDari, labelKelas, peringkat, perBulan, perTahun, ringkasDaerah } from "./inti";
import daerahJson from "./daerah.json";
import type { Daerah } from "./inti";

const k = (d: number, th: number, bln: number, j: number, korban = 0, rumah = 0): Kejadian => [d, th, bln, 1, j, korban, 0, rumah];
const contoh: Data = {
  awal: 2010,
  akhir: 2012,
  jenis: ["banjir", "karhutla", "angin", "kering", "abrasi", "longsor", "gempa", "erupsi"],
  daerah: ["a", "b", "c"],
  k: [k(0, 0, 1, 0), k(0, 0, 1, 0), k(0, 1, 2, 5, 3, 4), k(1, 2, 9, 1), k(1, 2, 0, 6, 100, 50)],
};

describe("hitungan", () => {
  it("per bulan melewati bulan yang tidak tercatat", () => {
    expect(perBulan(contoh, null)).toEqual([2, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
    expect(perBulan(contoh, 0)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it("per tahun dan per daerah", () => {
    expect(perTahun(contoh, null)).toEqual([2, 1, 2]);
    expect(perTahun(contoh, null, 1)).toEqual([0, 0, 2]);
  });
  it("ringkas daerah mengurutkan kejadian terparah dari korban jiwa", () => {
    const r = ringkasDaerah(contoh, 1);
    expect(r.total).toBe(2);
    expect(r.korban).toBe(100);
    expect(r.terparah[0][4]).toBe(6);
    expect(r.terparah).toHaveLength(1); // karhutla tanpa korban/rumah tidak masuk
    expect(ringkasDaerah(contoh, 2).total).toBe(0);
  });
  it("bagian kejadian vs korban", () => {
    const b = bagianJenis(contoh);
    expect(b[0].bagianKejadian).toBeCloseTo(0.4);
    expect(b[6].bagianKorban).toBeCloseTo(100 / 103);
  });
  it("peringkat membuang daerah tanpa kejadian", () => {
    expect(peringkat(contoh, null).map((x) => x.i)).toEqual([0, 1]);
    expect(peringkat(contoh, 7)).toEqual([]);
  });
  it("bulan puncak", () => expect(bulanPuncak([1, 5, 5, 2])).toBe(1));
});

describe("kelas peta", () => {
  it("batas unik, naik, dan mencakup nilai terbesar", () => {
    const b = batasKelas([0, 1, 1, 1, 2, 3, 5, 8, 13, 40]);
    expect(b.at(-1)).toBe(40);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]);
  });
  it("nol = tidak tercatat, sisanya masuk kelas", () => {
    const b = [2, 5, 10];
    expect(kelasDari(0, b)).toBe(-1);
    expect(kelasDari(1, b)).toBe(0);
    expect(kelasDari(6, b)).toBe(2);
    expect(kelasDari(99, b)).toBe(2);
  });
  it("label rentang", () => expect(labelKelas([1, 3, 10])).toEqual(["1", "2–3", "4–10"]));
  it("semua nol menghasilkan tanpa kelas", () => expect(batasKelas([0, 0])).toEqual([]));
});

describe("cari", () => {
  const daftar = (daerahJson as { daerah: Daerah[] }).daerah;
  it("Kota vs Kab. mengikuti awalan yang diketik", () => {
    expect(cari(daftar, "kota kediri")[0].id).toBe("kota-kediri");
    expect(cari(daftar, "kab kediri")[0].id).toBe("kab-kediri");
  });
});
