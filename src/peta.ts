/* Peta 514 kabupaten/kota (SVG, d3-geo), diwarnai menurut kelas jumlah kejadian. */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { sembunyikanTip, tampilkanTip } from "./grafik";

type Prop = { id: string };

export type Peta = {
  warnai: (warna: (id: string) => string) => void;
  pilih: (id: string | null) => void;
};

export function buatPeta(wadah: HTMLElement, topo: Topology, isiTip: (id: string) => [string, string], saatKlik: (id: string) => void): Peta {
  const fc = feature(topo, topo.objects.daerah) as unknown as FeatureCollection<Geometry, Prop>;
  const W = 1000;
  const H = 420;
  const proyeksi = geoMercator().fitExtent(
    [
      [4, 4],
      [W - 4, H - 4],
    ],
    fc,
  );
  const jalur = geoPath(proyeksi);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "peta");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Peta jumlah kejadian bencana per kabupaten/kota. Daftar daerah terbanyak ada di samping peta.");
  const elemen = new Map<string, SVGPathElement>();
  for (const f of fc.features as Feature<Geometry, Prop>[]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", jalur(f) ?? "");
    p.dataset.id = f.properties.id;
    svg.append(p);
    elemen.set(f.properties.id, p);
  }
  wadah.replaceChildren(svg);

  let terpilih: string | null = null;
  svg.addEventListener("pointermove", (e) => {
    const id = (e.target as SVGElement).dataset?.id;
    if (!id) return sembunyikanTip();
    const [kuat, lemah] = isiTip(id);
    tampilkanTip(e.clientX, e.clientY, kuat, lemah);
  });
  svg.addEventListener("pointerleave", sembunyikanTip);
  svg.addEventListener("click", (e) => {
    const id = (e.target as SVGElement).dataset?.id;
    if (id) saatKlik(id);
  });

  return {
    warnai(warna) {
      for (const [id, p] of elemen) p.setAttribute("fill", warna(id));
    },
    pilih(id) {
      if (terpilih) elemen.get(terpilih)?.classList.remove("pilih");
      terpilih = id;
      const p = id ? elemen.get(id) : undefined;
      if (p) {
        p.classList.add("pilih");
        p.parentNode?.append(p); // naikkan ke atas supaya garis tepinya tidak tertutup tetangga
      }
    },
  };
}
