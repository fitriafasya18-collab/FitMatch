/* =========================================================
   data.js — DATA dan PENYIMPANAN
   Isi file ini:
   1. Daftar tetap: warna, jenis baju, gaya, aktivitas, bentuk gambar
   2. Data contoh isi lemari (persona Nabila)
   3. Fungsi tanggal
   4. Memuat & menyimpan data ke localStorage peramban
   File ini dimuat PERTAMA, jadi variabelnya bisa dipakai ai.js dan app.js.
   ========================================================= */

/* ---------- 1. Daftar tetap ---------- */
const COLORS = {
  Hitam: "#26272b", Putih: "#f6f6f3", Krem: "#e6d8bd", Abu: "#9a9ca3",
  Navy: "#2b3a5c", Denim: "#4f6d96", Cokelat: "#7a5238", Sage: "#9cae8f",
  Marun: "#7d2a35", Pink: "#e9a9ba", Lilac: "#b6a5d6", Mustard: "#d4a237"
};
const NEUTRAL = new Set(["Hitam", "Putih", "Krem", "Abu", "Navy", "Denim", "Cokelat"]);
const TYPES = ["Atasan", "Bawahan", "Dress", "Outer", "Sepatu"];
const PREFIX = { Atasan: "ATS", Bawahan: "BWH", Dress: "DRS", Outer: "OUT", Sepatu: "SPT" };
const SHAPE_OF = { Atasan: "tee", Bawahan: "pants", Dress: "dress", Outer: "jacket", Sepatu: "shoe" };
const ACTS = ["Kuliah", "Kerja", "Nongkrong", "Acara"];
const STYLES = ["Kasual", "Minimalis", "Feminin", "Formal", "Streetwear", "Sporty"];

/* Siluet baju (path SVG, kotak 64x64) dipakai jika baju belum punya foto */
const SHAPES = {
  tee: "M23 9 L13 13 L6 22 L12 28 L17 24 L17 55 L47 55 L47 24 L52 28 L58 22 L51 13 L41 9 Q32 17 23 9 Z",
  pants: "M19 7 H45 L48 57 H37 L32 25 L27 57 H16 Z",
  skirt: "M22 9 H42 L52 53 H12 Z",
  dress: "M25 5 H39 L41 18 L53 57 H11 L23 18 Z",
  jacket: "M23 7 L11 13 L6 55 H19 L20 27 L23 55 H41 L44 27 L45 55 H58 L53 13 L41 7 L32 30 Z",
  shoe: "M8 37 Q10 27 22 29 L34 33 Q46 35 56 40 Q58 46 54 48 H10 Q6 46 8 37 Z"
};

/* ---------- 2. Data contoh ----------
   Urutan kolom: nama, jenis, bentuk, warna, gaya, cocok untuk,
   jumlah dipakai, hari sejak terakhir dipakai (null = belum pernah), status */
const SEED = [
  ["Kemeja putih oversize", "Atasan", "tee", "Putih", ["Minimalis", "Formal"], ["Kuliah", "Kerja"], 12, 3, "ready"],
  ["Kaos hitam basic", "Atasan", "tee", "Hitam", ["Kasual", "Minimalis"], ["Kuliah", "Nongkrong"], 20, 0, "used"],
  ["Blouse pink puff", "Atasan", "tee", "Pink", ["Feminin"], ["Nongkrong", "Acara", "Kuliah"], 2, 41, "ready"],
  ["Knit lilac", "Atasan", "tee", "Lilac", ["Feminin", "Kasual"], ["Kuliah", "Nongkrong"], 1, 58, "ready"],
  ["Crop top mustard", "Atasan", "tee", "Mustard", ["Streetwear"], ["Nongkrong"], 0, null, "ready"],
  ["Jeans straight", "Bawahan", "pants", "Denim", ["Kasual", "Streetwear"], ["Kuliah", "Nongkrong"], 25, 0, "used"],
  ["Kulot krem", "Bawahan", "pants", "Krem", ["Minimalis", "Formal"], ["Kerja", "Kuliah"], 9, 6, "ready"],
  ["Rok plisket sage", "Bawahan", "skirt", "Sage", ["Feminin"], ["Kuliah", "Acara", "Nongkrong"], 3, 33, "ready"],
  ["Celana bahan hitam", "Bawahan", "pants", "Hitam", ["Formal", "Minimalis"], ["Kerja", "Kuliah"], 7, 10, "ready"],
  ["Dress midi marun", "Dress", "dress", "Marun", ["Feminin", "Formal"], ["Acara"], 1, 90, "ready"],
  ["Slip dress hitam", "Dress", "dress", "Hitam", ["Minimalis", "Feminin"], ["Acara", "Nongkrong"], 0, null, "ready"],
  ["Blazer abu", "Outer", "jacket", "Abu", ["Formal", "Minimalis"], ["Kerja", "Acara"], 6, 14, "ready"],
  ["Cardigan krem", "Outer", "jacket", "Krem", ["Kasual", "Feminin"], ["Kuliah", "Nongkrong"], 4, 21, "ready"],
  ["Sneakers putih", "Sepatu", "shoe", "Putih", ["Kasual", "Streetwear", "Minimalis"], ["Kuliah", "Nongkrong", "Kerja"], 30, 0, "used"],
  ["Loafers cokelat", "Sepatu", "shoe", "Cokelat", ["Formal", "Minimalis"], ["Kerja", "Kuliah", "Acara"], 8, 5, "ready"],
  ["Mary jane hitam", "Sepatu", "shoe", "Hitam", ["Feminin"], ["Acara", "Nongkrong", "Kuliah"], 2, 27, "ready"]
];

/* Foto asli baju contoh. Kiri: nama baju persis seperti di SEED. Kanan: lokasi file. */
const PHOTOS = {
  "Kemeja putih oversize": "img/kemeja-putih.jpg",
  "Jeans straight": "img/jeans.jpg",
  "Blouse pink puff": "img/blouse-pink.jpg",
  "Kulot krem": "img/kulot-krem.jpg",
  "Rok plisket sage": "img/rok-plisket.jpg",
  "Celana bahan hitam": "img/celana-hitam.jpg",
  "Dress midi marun": "img/dress-midi.jpg",
  "Slip dress hitam": "img/slip-dress.jpg",
  "Blazer abu": "img/blazer-abu.jpg",
  "Cardigan krem": "img/cardigan-krem.jpg",
  "Sneakers putih": "img/sneakers-putih.jpg",
  "Loafers cokelat": "img/loafers-cokelat.jpg",
  "Mary jane hitam": "img/mary-jane.jpg",
  "Kaos hitam basic": "img/kaos-hitam.jpg",
  "Knit lilac": "img/knit-lilac.jpg",
  "Crop top mustard": "img/crop-top-mustard.jpg",
  };

/* ---------- 3. Fungsi tanggal ---------- */
function localISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}
/* Berapa hari sejak tanggal iso (format "2026-10-08"); null jika belum pernah */
function daysSince(iso) {
  if (!iso) return null;
  const p = iso.split("-").map(Number);
  const then = new Date(p[0], p[1] - 1, p[2]);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - then) / 864e5);
}

/* ---------- 4. Memuat & menyimpan data ---------- */
const KEY = "FitMatch-proto-v1" + userSuffix(); // nama kunci di localStorage

function defaultPrefs() {
  return {
    Atasan: { styles: ["Minimalis", "Feminin"], colors: ["Putih", "Pink", "Lilac"] },
    Bawahan: { styles: ["Minimalis"], colors: ["Krem", "Denim"] },
    Dress: { styles: ["Feminin"], colors: ["Hitam"] },
    Outer: { styles: ["Minimalis"], colors: ["Krem", "Abu"] },
    Sepatu: { styles: ["Minimalis"], colors: ["Putih", "Cokelat"] }
  };
}

/* Mengubah SEED (tabel) menjadi objek baju lengkap dengan kode seperti ATS-001 */
function seedState() {
  const nums = {};
  const items = SEED.map(function (r, idx) {
    nums[r[1]] = (nums[r[1]] || 0) + 1;
    return {
      id: "i" + idx,
      code: PREFIX[r[1]] + "-" + String(nums[r[1]]).padStart(3, "0"),
      name: r[0], type: r[1], shape: r[2], color: r[3], styles: r[4], occ: r[5],
      wear: r[6],
      lastWorn: r[7] === null ? null : daysAgoISO(r[7]),
      status: r[8],
      photo: PHOTOS[r[0]] || null
    };
  });
  return { items: items, prefs: defaultPrefs(), rare: true, nums: nums, nextId: items.length };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.items) && s.prefs) return s;
    }
  } catch (e) { /* localStorage tidak tersedia, pakai data contoh */ }
  return seedState();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ }
}

/* S = seluruh data aplikasi (isi lemari + preferensi). Dipakai di semua file. */
let S = load();
