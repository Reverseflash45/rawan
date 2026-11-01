import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Data, JENIS, cekData, jumlahPerDaerah } from "./inti";
import daerahJson from "./daerah.json";

const data = JSON.parse(readFileSync(new URL("../public/data/kejadian.json", import.meta.url), "utf8")) as Data;
const peta = JSON.parse(readFileSync(new URL("../public/data/peta.json", import.meta.url), "utf8")) as {
  objects: { daerah: { geometries: { properties: { id: string } }[] } };
};

describe("data DIBI", () => {
  it("urutan jenis dan daftar daerah cocok dengan kode", () => {
    expect(() => cekData(data)).not.toThrow();
    expect(data.daerah).toEqual((daerahJson as { daerah: { id: string }[] }).daerah.map((d) => d.id));
    expect(JENIS).toHaveLength(8);
  });

  it("setiap kejadian sah: daerah, tahun, bulan, jenis, angka tidak negatif", () => {
    const tahun = data.akhir - data.awal;
    for (const k of data.k) {
      expect(k).toHaveLength(8);
      expect(k[0]).toBeGreaterThanOrEqual(0);
      expect(k[0]).toBeLessThan(data.daerah.length);
      expect(k[1]).toBeGreaterThanOrEqual(0);
      expect(k[1]).toBeLessThanOrEqual(tahun);
      expect(k[2]).toBeGreaterThanOrEqual(0);
      expect(k[2]).toBeLessThanOrEqual(12);
      expect(k[4]).toBeLessThan(JENIS.length);
      for (const v of k.slice(5)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("jumlah sesuai hasil olah dan peristiwa yang dikenal ada", () => {
    expect(data.k.length).toBe(23453);
    const i = data.daerah.indexOf("kota-palu");
    const palu = data.k.filter((k) => k[0] === i && k[1] === 2018 - data.awal && k[4] === 6);
    expect(Math.max(...palu.map((k) => k[5]))).toBeGreaterThan(4000); // gempa, tsunami, dan likuefaksi Palu 28 September 2018
  });

  it("hampir semua daerah mencatat setidaknya satu bencana", () => {
    expect(jumlahPerDaerah(data, null).filter((n) => n > 0).length).toBe(502);
  });

  it("kalimat pembuka di HTML sama dengan hasil hitung (mencegah teks bergeser saat dimuat)", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const ada = jumlahPerDaerah(data, null).filter((n) => n > 0).length;
    const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
    expect(html).toContain(`${fmt(data.k.length)} bencana alam tercatat di ${ada} dari ${fmt(data.daerah.length)} kabupaten/kota, ${data.awal}–${data.akhir}.`);
  });

  it("tombol pintasan di HTML menunjuk daerah yang ada", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const ids = [...html.matchAll(/data-pilih="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(data.daerah).toContain(id);
  });

  it("setiap id peta ada di daftar daerah", () => {
    for (const g of peta.objects.daerah.geometries) expect(data.daerah).toContain(g.properties.id);
  });
});
