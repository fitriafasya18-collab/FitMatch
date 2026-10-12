/* =========================================================
   ai.js — "OTAK" AI (masih simulasi)
   Isi file ini:
   1. Match outfit: memberi skor tiap baju lalu memilih 3 kombinasi terbaik
   2. Scan foto: mengecilkan foto, membaca warna dominan, menebak jenis baju
   Butuh data.js (COLORS, NEUTRAL, S, daysSince) sudah dimuat lebih dulu.
   ========================================================= */

/* ---------- 1. Match outfit ---------- */

/* Angka acak yang selalu sama untuk id + seed yang sama.
   Dipakai agar tombol "Match ulang" memberi variasi baru. */
function jitter(id, seed) {
  let h = (seed + 1) * 2654435761 >>> 0;
  for (let k = 0; k < id.length; k++) h = Math.imul(h ^ id.charCodeAt(k), 16777619) >>> 0;
  return (h % 1000) / 1000 * 1.4;
}

/* Skor satu baju berdasarkan preferensi pemilik.
   Mengembalikan { s: skor, r: daftar alasan } */
function itemScore(i) {
  const p = S.prefs[i.type];
  let s = 0;
  const r = [];

  // (a) gaya cocok dengan preferensi jenis baju ini
  const sm = i.styles.filter(function (x) { return p.styles.indexOf(x) >= 0; });
  if (sm.length) {
    s += 2 + 0.5 * (sm.length - 1);
    r.push({ w: 2, t: "Gaya " + sm[0] + " sesuai preferensi " + i.type.toLowerCase() + "-mu" });
  }

  // (b) warna termasuk warna favorit
  if (p.colors.indexOf(i.color) >= 0) {
    s += 1.5;
    r.push({ w: 1.5, t: i.color + " termasuk warna favorit " + i.type.toLowerCase() + "-mu" });
  }

  // (c) bonus untuk baju yang jarang dipakai (jika opsi aktif)
  if (S.rare) {
    const d = daysSince(i.lastWorn);
    if (!i.wear || d === null) {
      s += 3;
      r.push({ w: 3.2, t: i.name + " belum pernah dipakai" });
    } else if (d >= 14) {
      const b = Math.min(d / 15, 3);
      s += b;
      r.push({ w: b + 0.2, t: i.name + " terakhir dipakai " + d + " hari lalu" });
    }
  }
  return { s: s, r: r };
}

/* Paduan warna: maksimal satu warna aksen, sisanya netral */
function harmony(list) {
  const accents = [];
  list.forEach(function (i) {
    if (!NEUTRAL.has(i.color) && accents.indexOf(i.color) < 0) accents.push(i.color);
  });
  if (accents.length >= 2) return { v: -2, t: null };
  if (accents.length === 1) return { v: 0.5, t: "Satu warna aksen (" + accents[0].toLowerCase() + ") dipadukan dengan warna netral" };
  return { v: 0.3, t: "Palet netral, aman dan mudah dipadukan" };
}

/* Menyusun maksimal 3 outfit dari baju Ready yang cocok untuk aktivitas */
function buildOutfits(act, seed) {
  const pool = S.items.filter(function (i) { return i.status === "ready" && i.occ.indexOf(act) >= 0; });
  const by = function (t) { return pool.filter(function (i) { return i.type === t; }); };
  const sc = new Map(pool.map(function (i) { return [i.id, itemScore(i)]; }));
  const val = function (i) { return sc.get(i.id).s + jitter(i.id, seed); };

  // Dasar outfit: atasan + bawahan, atau dress
  const bases = [];
  by("Atasan").forEach(function (t) { by("Bawahan").forEach(function (b) { bases.push([t, b]); }); });
  by("Dress").forEach(function (d) { bases.push([d]); });

  const combos = bases.map(function (base) {
    const items = base.slice();

    // Outer ditambah untuk kerja/acara, atau jika skornya tinggi
    const outers = by("Outer").slice().sort(function (a, b) { return val(b) - val(a); });
    if (outers.length && (act === "Kerja" || act === "Acara" || val(outers[0]) >= 3.5)) items.push(outers[0]);

    // Sepatu: pilih yang paling cocok dengan warna outfit
    const shoes = by("Sepatu")
      .map(function (sh) { return { sh: sh, v: val(sh) + harmony(items.concat([sh])).v }; })
      .sort(function (a, b) { return b.v - a.v; });
    if (shoes.length) items.push(shoes[0].sh);

    const h = harmony(items);
    const avg = items.reduce(function (a, i) { return a + val(i); }, 0) / items.length;
    return { items: items, score: avg + h.v, h: h };
  }).sort(function (a, b) { return b.score - a.score; });

  // Ambil 3 terbaik, dengan atasan/dress yang berbeda-beda
  const chosen = [];
  const anchors = new Set();
  for (const c of combos) {
    if (anchors.has(c.items[0].id)) continue;
    anchors.add(c.items[0].id);
    chosen.push(c);
    if (chosen.length === 3) break;
  }

  // Alasan yang ditampilkan: 2 alasan terkuat + alasan warna
  chosen.forEach(function (c) {
    const rs = [];
    c.items.forEach(function (i) { sc.get(i.id).r.forEach(function (x) { rs.push(x); }); });
    rs.sort(function (a, b) { return b.w - a.w; });
    const seen = new Set();
    c.reasons = [];
    rs.forEach(function (x) {
      if (c.reasons.length < 2 && !seen.has(x.t)) { seen.add(x.t); c.reasons.push(x.t); }
    });
    if (c.h.t) c.reasons.push(c.h.t);
  });

  return { outfits: chosen, pool: pool };
}

/* ---------- 2. Scan foto ---------- */

/* Mencari nama warna di COLORS yang paling dekat dengan nilai RGB */
function nearestColor(r, g, b) {
  let best = "Abu", bd = Infinity;
  Object.keys(COLORS).forEach(function (n) {
    const h = COLORS[n];
    const cr = parseInt(h.slice(1, 3), 16), cg = parseInt(h.slice(3, 5), 16), cb = parseInt(h.slice(5, 7), 16);
    const dd = (r - cr) * (r - cr) * 0.3 + (g - cg) * (g - cg) * 0.59 + (b - cb) * (b - cb) * 0.11;
    if (dd < bd) { bd = dd; best = n; }
  });
  return best;
}

/* Membaca file foto: dikecilkan ke 200px, diambil rata-rata warna bagian tengah */
function processImage(file) {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      const max = 200, sc = max / Math.max(img.width, img.height);
      const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0, w, h);

      // ambil kotak tengah (40% x 40%) agar latar belakang tidak ikut terhitung
      const x0 = Math.floor(w * 0.3), y0 = Math.floor(h * 0.3);
      const sw = Math.max(1, Math.floor(w * 0.4)), sh = Math.max(1, Math.floor(h * 0.4));
      const px = cx.getImageData(x0, y0, sw, sh).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = 0; k < px.length; k += 4) { r += px[k]; g += px[k + 1]; b += px[k + 2]; n++; }

      URL.revokeObjectURL(url);
      resolve({
        photo: cv.toDataURL("image/jpeg", 0.75),
        color: nearestColor(r / n, g / n, b / n),
        ratio: img.height / img.width
      });
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

/* Tebakan kasar jenis baju dari perbandingan tinggi:lebar foto */
function guessType(ratio) {
  if (ratio > 1.6) return "Dress";
  if (ratio > 1.15) return "Bawahan";
  if (ratio < 0.7) return "Sepatu";
  return "Atasan";
}
