/* =========================================================
   app.js — TAMPILAN dan TOMBOL
   Isi file ini:
   1. Status tampilan (menu aktif, filter, dll.)
   2. Fungsi bantu (gambar baju, notifikasi, dll.)
   3. Empat layar: Lemari, Match, Scan, Gaya + panel detail
   4. Aksi tombol (apa yang terjadi saat tombol diklik)
   5. Menyambungkan klik ke aksi, tombol tema, lalu tampilkan layar pertama
   Butuh data.js dan ai.js sudah dimuat lebih dulu.
   ========================================================= */

/* ---------- 1. Status tampilan ----------
   Berbeda dengan S (data lemari), ui hanya menyimpan keadaan layar dan tidak disimpan. */
const ui = {
  tab: "lemari",          // menu aktif: lemari | match | scan | pref
  fStatus: "Semua",       // filter status di Lemari: Semua | Ready | Dipakai | Jarang Dipakai
  fType: "Semua",         // filter jenis di Lemari
  act: "Kuliah",          // aktivitas di Match
  seed: 0,                // bertambah setiap "Match ulang"
  matchLoading: false,
  sheetId: null,          // id baju yang detailnya sedang dibuka
  confirmDelete: false,
  confirmReset: false,
  scan: { phase: "idle", draft: null, done: 0 }, // idle | analyzing | review
  sampleIdx: 0,
  newId: null             // baju yang baru disimpan, diberi tanda "Baru"
};
const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 2. Fungsi bantu ---------- */
const $ = function (s) { return document.querySelector(s); };

/* Mencegah teks buatan pengguna dibaca sebagai HTML */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function byId(id) { return S.items.find(function (i) { return i.id === id; }); }

/* Warna baju sebagai variabel CSS, dipakai kelas .swatch untuk latar berwarna */
function tint(i) { return 'style="--tint:' + (COLORS[i.color] || "#999999") + '"'; }

/* Gambar baju: foto jika ada, jika tidak siluet SVG berwarna */
function art(i) {
  if (i.photo) return '<img class="art" src="' + i.photo + '" alt="">';
  const hex = COLORS[i.color] || "#999999";
  return '<svg class="art" viewBox="0 0 64 64" aria-hidden="true">'
    + '<path d="' + SHAPES[i.shape || SHAPE_OF[i.type]] + '" fill="' + hex + '" stroke="var(--garment-line)" stroke-width="1" stroke-linejoin="round"/>'
    + (i.shape === "shoe" ? '<path d="M9 44 H55" stroke="var(--garment-line)" stroke-width="1" fill="none"/>' : "")
    + "</svg>";
}

/* Ikon kecil yang dipakai berulang */
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>';

function wornText(i) {
  const d = daysSince(i.lastWorn);
  if (!i.wear || d === null) return "Belum pernah dipakai";
  const when = d === 0 ? "hari ini" : d === 1 ? "kemarin" : d + " hari lalu";
  return i.wear + "× dipakai, " + when;
}
function statusPill(i) {
  return i.status === "used" ? '<span class="status used">Dipakai</span>' : '<span class="status ready">Ready</span>';
}
function isForgotten(i) {
  const d = daysSince(i.lastWorn);
  return i.status === "ready" && (!i.wear || d === null || d > 30);
}
let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
}
/* Fitur USE: baju ditandai Dipakai, jumlah pakai bertambah, tanggal dicatat */
function markUsed(i) {
  i.status = "used";
  i.wear = (i.wear || 0) + 1;
  i.lastWorn = localISO(new Date());
}
function toggle(arr, v) {
  const k = arr.indexOf(v);
  if (k >= 0) arr.splice(k, 1); else arr.push(v);
}

/* ---------- 3a. Layar Lemari ---------- */
function renderLemari() {
  const all = S.items;
  const ready = all.filter(function (i) { return i.status === "ready"; }).length;
  const used = all.length - ready;
  const forgotten = all.filter(isForgotten).length;
  const pct = function (n) { return all.length ? (n / all.length * 100) : 0; };

  const list = all.filter(function (i) {
    let okS = true;
    if (ui.fStatus === "Ready") okS = i.status === "ready";
    else if (ui.fStatus === "Dipakai") okS = i.status === "used";
    else if (ui.fStatus === "Jarang Dipakai") okS = isForgotten(i);
    const okT = ui.fType === "Semua" || i.type === ui.fType;
    return okS && okT;
  });

  let h = '<header class="app-head"><div><p class="hello">Halo, ' + esc(firstName() || "There") + '</p><h1>My Wardrobe</h1></div><span class="sample-badge">Data contoh</span></header>';

  // Ringkasan: jumlah baju + batang Ready/Dipakai
  h += '<section class="overview" aria-label="Ringkasan lemari">'
    + '<p class="overview-total"><b>' + all.length + '</b>baju di lemari</p>'
    + '<div class="meter" role="img" aria-label="' + ready + ' Ready, ' + used + ' Dipakai">'
    + (ready ? '<span class="m-ready" style="width:' + pct(ready) + '%"></span>' : "")
    + (used ? '<span class="m-used" style="width:' + pct(used) + '%"></span>' : "")
    + '</div>'
    + '<div class="legend"><span><i class="l-ready"></i>' + ready + ' Ready</span><span><i class="l-used"></i>' + used + ' Dipakai</span></div>'
    + (forgotten ? '<button type="button" class="forgot" data-action="fstatus" data-val="Jarang Dipakai"><span><strong>' + forgotten + ' baju</strong> belum dipakai lebih dari 30 hari</span><span class="go">Lihat</span></button>' : "")
    + '</section>';

  if (used > 0) {
    h += '<div class="banner"><span><strong>' + used + ' baju sedang dipakai.</strong> Sudah kembali ke lemari?</span>'
      + '<button type="button" class="btn btn-dark btn-small" data-action="return-all">Kembalikan</button></div>';
  }

  h += '<div class="seg" role="group" aria-label="Filter status">' + ["Semua", "Ready", "Dipakai", "Jarang Dipakai"].map(function (s) {
    return '<button type="button" data-action="fstatus" data-val="' + s + '" aria-pressed="' + (ui.fStatus === s) + '">' + s + "</button>";
  }).join("") + "</div>";
  h += '<div class="chips scroll" role="group" aria-label="Filter jenis">' + ["Semua"].concat(TYPES).map(function (t) {
    return '<button type="button" class="chip" data-action="ftype" data-val="' + t + '" aria-pressed="' + (ui.fType === t) + '">' + t + "</button>";
  }).join("") + "</div>";

  if (!list.length) {
    h += '<div class="empty">Tidak ada baju dengan filter ini.<br>Ubah filter atau scan baju baru.</div>';
  } else {
    h += '<div class="grid">' + list.map(function (i) {
      return '<button type="button" class="tile" data-action="open" data-id="' + i.id + '">'
        + '<span class="tile-art swatch" ' + tint(i) + '>' + art(i) + statusPill(i)
        + (i.id === ui.newId ? '<span class="new-flag">Baru</span>' : "") + '</span>'
        + '<span class="tile-name">' + esc(i.name) + '</span>'
        + '<span class="tile-meta">' + wornText(i) + '</span></button>';
    }).join("") + "</div>";
  }
  return h;
}

/* ---------- 3b. Layar Match ---------- */
function renderMatch() {
  let h = '<header class="app-head"><div><h1>Match outfit</h1><p class="sub">AI memadukan baju Ready milikmu</p></div></header>';
  h += '<div class="seg" role="group" aria-label="Aktivitas">' + ACTS.map(function (a) {
    return '<button type="button" data-action="act" data-val="' + a + '" aria-pressed="' + (ui.act === a) + '">' + a + "</button>";
  }).join("") + "</div>";

  if (ui.matchLoading) {
    return h + '<p class="hint">Membaca isi lemari dan gayamu…</p><div class="skeleton"></div><div class="skeleton"></div>';
  }

  const res = buildOutfits(ui.act, ui.seed); // dari ai.js
  const usedCount = S.items.filter(function (i) { return i.status === "used"; }).length;
  h += '<p class="ai-note">' + ICON_SPARK + '<span>Dipadukan dari <b>' + res.pool.length + ' baju Ready</b> yang cocok untuk ' + ui.act.toLowerCase() + '.'
    + (usedCount ? ' ' + usedCount + ' baju yang sedang dipakai tidak diikutkan.' : '') + '</span></p>';

  if (!res.outfits.length) {
    return h + '<div class="empty">Baju Ready untuk ' + ui.act.toLowerCase() + ' belum cukup untuk satu outfit.<br>Kembalikan baju yang sedang dipakai, atau scan baju baru.</div>';
  }
  res.outfits.forEach(function (o, n) {
    h += '<article class="outfit"><div class="outfit-head"><h3>Pilihan ' + (n + 1) + '</h3>' + (n === 0 ? '<span class="best">Paling cocok</span>' : '') + '</div>';
    h += '<div class="board">' + o.items.map(function (i) {
      return '<div class="board-item"><span class="board-art swatch" ' + tint(i) + '>' + art(i) + '</span><span>' + esc(i.name) + '</span></div>';
    }).join("") + '</div>';
    h += '<ul class="reasons">' + o.reasons.map(function (r) { return '<li>' + ICON_CHECK + '<span>' + esc(r) + '</span></li>'; }).join("") + '</ul>';
    h += '<button type="button" class="btn btn-primary btn-block" data-action="wear-outfit" data-ids="' + o.items.map(function (i) { return i.id; }).join(",") + '">Pakai outfit ini</button></article>';
  });
  h += '<button type="button" class="btn btn-ghost btn-block" data-action="reroll">Match ulang</button>';
  return h;
}

/* ---------- 3c. Layar Scan ---------- */
function renderScan() {
  const sc = ui.scan;
  let h = '<header class="app-head"><div><h1>Scan baju</h1><p class="sub">AI mengenali jenis, warna, dan gayanya</p></div></header>';
  const corners = '<span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>';

  // Tahap 1: menunggu foto
  if (sc.phase === "idle") {
    h += '<div class="finder">' + corners + '<div class="finder-inner">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9V10"/><path d="M12 10 3 17.2c-.6.5-.3 1.3.5 1.3h17c.8 0 1.1-.8.5-1.3L12 10Z"/></svg>'
      + 'Bentangkan baju di permukaan polos, lalu foto dari atas.</div></div>';
    h += '<label for="fileInput" class="btn btn-primary btn-block" role="button" tabindex="0">Foto atau unggah baju</label>';
    h += '<button type="button" class="btn btn-ghost btn-block" data-action="scan-sample">Coba dengan baju contoh</button>';
    h += '<p class="hint">Baju yang disimpan langsung berstatus Ready di lemari.</p>';
    return h;
  }

  const d = sc.draft;

  // Tahap 2: animasi "AI menganalisis"
  if (sc.phase === "analyzing") {
    h += '<div class="finder">' + corners + art(d) + '<span class="scanline"></span></div>';
    const steps = ["Mengenali jenis baju", "Membaca warna dominan", "Mencocokkan gaya dengan seleramu"];
    h += '<ul class="steps">' + steps.map(function (s, k) { return '<li class="' + (k < sc.done ? "done" : "") + '">' + s + "</li>"; }).join("") + "</ul>";
    return h;
  }

  // Tahap 3: periksa hasil deteksi, lalu simpan
  h += '<div class="review-head"><span class="review-art swatch" ' + tint(d) + '>' + art(d) + '</span><div><div class="t">' + esc(d.name || "Baju baru") + '</div><span class="s">Periksa hasil deteksi, lalu simpan.</span></div></div>';
  h += '<div class="field"><label for="dName">Nama baju</label><input type="text" id="dName" value="' + esc(d.name) + '" maxlength="40"></div>';
  h += '<div class="field"><label for="dType">Jenis ' + (d.guessType ? '<span class="guess">Tebakan AI</span>' : "") + '</label><select id="dType">'
    + TYPES.map(function (t) { return "<option" + (t === d.type ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>";
  h += '<div class="field"><span class="label">Warna ' + (d.guessColor ? '<span class="guess">Dari foto</span>' : "") + '</span><div class="chips">'
    + Object.keys(COLORS).map(function (c) { return '<button type="button" class="chip" data-action="d-color" data-val="' + c + '" aria-pressed="' + (d.color === c) + '"><span class="dot" style="background:' + COLORS[c] + '"></span>' + c + "</button>"; }).join("") + "</div></div>";
  h += '<div class="field"><span class="label">Gaya <span class="guess">Saran dari seleramu</span></span><div class="chips">'
    + STYLES.map(function (s) { return '<button type="button" class="chip" data-action="d-style" data-val="' + s + '" aria-pressed="' + (d.styles.indexOf(s) >= 0) + '">' + s + "</button>"; }).join("") + "</div></div>";
  h += '<div class="field"><span class="label">Cocok untuk</span><div class="chips">'
    + ACTS.map(function (a) { return '<button type="button" class="chip" data-action="d-occ" data-val="' + a + '" aria-pressed="' + (d.occ.indexOf(a) >= 0) + '">' + a + "</button>"; }).join("") + "</div></div>";
  h += '<button type="button" class="btn btn-primary btn-block" data-action="scan-save">Simpan ke lemari</button>'
    + '<button type="button" class="linkish" data-action="scan-cancel">Batal, scan ulang</button>';
  return h;
}

/* ---------- 3d. Layar Gaya (preferensi) ---------- */
function renderPref() {
  let h = '<header class="app-head"><div><h1>Gaya kamu</h1><p class="sub">AI memakai pilihan ini saat memadukan outfit</p></div></header>';

  // Kartu akun + tombol keluar (CURRENT_USER dari auth.js)
  if (CURRENT_USER) {
    h += '<div class="card account"><span class="avatar">' + esc(CURRENT_USER.name.charAt(0).toUpperCase()) + '</span>'
      + '<div class="who"><div class="t">' + esc(CURRENT_USER.name) + '</div><div class="s">' + (CURRENT_USER.email === "tamu" ? "Mode tamu" : esc(CURRENT_USER.email)) + '</div></div>'
      + '<button type="button" class="btn btn-ghost btn-small" data-action="logout">Keluar</button></div>';
  }
  h += '<div class="card"><div class="switch-row"><div><div class="t">Utamakan baju yang jarang dipakai</div>'
    + '<p class="hint">Baju yang lama tidak dipakai lebih sering muncul di saran.</p></div>'
    + '<button type="button" class="switch" role="switch" aria-label="Utamakan baju yang jarang dipakai" aria-checked="' + S.rare + '" data-action="toggle-rare"></button></div></div>';

  TYPES.forEach(function (t) {
    const p = S.prefs[t];
    const count = S.items.filter(function (i) { return i.type === t; }).length;
    h += '<section class="card" aria-label="Gaya ' + t + '"><div class="card-head"><h2>' + t + '</h2><span>' + count + ' baju</span></div>';
    h += '<div class="field"><span class="label">Gaya</span><div class="chips">' + STYLES.map(function (s) {
      return '<button type="button" class="chip" data-action="pref-style" data-type="' + t + '" data-val="' + s + '" aria-pressed="' + (p.styles.indexOf(s) >= 0) + '">' + s + "</button>";
    }).join("") + "</div></div>";
    h += '<div class="field"><span class="label">Warna favorit</span><div class="chips">' + Object.keys(COLORS).map(function (c) {
      return '<button type="button" class="chip" data-action="pref-color" data-type="' + t + '" data-val="' + c + '" aria-pressed="' + (p.colors.indexOf(c) >= 0) + '"><span class="dot" style="background:' + COLORS[c] + '"></span>' + c + "</button>";
    }).join("") + "</div></div></section>";
  });

  if (ui.confirmReset) {
    h += '<div class="confirm"><span>Kembalikan semua baju dan gaya ke data contoh awal? Baju hasil scan akan terhapus.</span><div class="row">'
      + '<button type="button" class="btn btn-danger btn-small" data-action="reset-confirm">Ya, atur ulang</button>'
      + '<button type="button" class="btn btn-ghost btn-small" data-action="reset-cancel">Batal</button></div></div>';
  } else {
    h += '<button type="button" class="linkish" data-action="reset">Atur ulang ke data contoh</button>';
  }
  return h;
}

/* ---------- 3e. Panel detail baju ---------- */
function renderSheet() {
  const wrap = $("#sheetWrap");
  const i = ui.sheetId && byId(ui.sheetId);
  if (!i) { wrap.hidden = true; return; }
  wrap.hidden = false;

  const d = daysSince(i.lastWorn);
  let h = '<div class="grip"></div>'
    + '<div class="sheet-art swatch" ' + tint(i) + '>' + art(i) + '</div>'
    + '<div class="sheet-title"><div><p class="code">' + i.code + '</p><h2>' + esc(i.name) + '</h2><p class="sub">' + i.type + ', ' + i.color.toLowerCase() + '</p></div>' + statusPill(i) + '</div>';
  h += '<dl class="kv"><dt>Gaya</dt><dd><span class="chips">' + i.styles.map(function (s) { return '<span class="tagword">' + s + "</span>"; }).join("") + "</span></dd>";
  h += '<dt>Cocok untuk</dt><dd><span class="chips">' + i.occ.map(function (s) { return '<span class="tagword">' + s + "</span>"; }).join("") + "</span></dd>";
  h += "<dt>Dipakai</dt><dd>" + (i.wear || 0) + " kali</dd>";
  h += "<dt>Terakhir</dt><dd>" + (!i.wear || d === null ? "Belum pernah" : d === 0 ? "Hari ini" : d + " hari lalu") + "</dd></dl>";

  // Tombol utama tergantung status: Ready -> Pakai, Dipakai -> Kembalikan
  if (i.status === "ready") h += '<button type="button" class="btn btn-primary btn-block" data-action="use" data-id="' + i.id + '">Pakai hari ini</button>';
  else h += '<button type="button" class="btn btn-dark btn-block" data-action="return" data-id="' + i.id + '">Kembalikan ke lemari</button>';

  if (ui.confirmDelete) {
    h += '<div class="confirm"><span>Hapus ' + esc(i.name) + ' dari lemari digital?</span><div class="row">'
      + '<button type="button" class="btn btn-danger btn-small" data-action="del-confirm" data-id="' + i.id + '">Hapus</button>'
      + '<button type="button" class="btn btn-ghost btn-small" data-action="del-cancel">Batal</button></div></div>';
  } else {
    h += '<button type="button" class="linkish" data-action="del">Hapus dari lemari</button>';
  }
  $("#sheet").innerHTML = h;
}

/* Menampilkan ulang layar sesuai menu aktif */
function render() {
  const screens = { lemari: renderLemari, match: renderMatch, scan: renderScan, pref: renderPref };
  if (!screens[ui.tab]) ui.tab = "lemari"; // nama tab tidak dikenal: kembali ke Lemari, jangan error
  $("#screen").innerHTML = screens[ui.tab]();
  document.querySelectorAll("#nav button").forEach(function (b) {
    if (b.dataset.tab === ui.tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  renderSheet();
}

/* ---------- 4. Aksi tombol ---------- */
function runMatch() {
  ui.matchLoading = !reduced;
  render();
  if (!reduced) setTimeout(function () { ui.matchLoading = false; if (ui.tab === "match") render(); }, 700);
}

/* Animasi 3 langkah analisis, lalu masuk ke tahap periksa hasil */
function startAnalyze(draft) {
  ui.tab = "scan";
  ui.scan = { phase: "analyzing", draft: draft, done: 0 };
  render();
  const stepMs = reduced ? 0 : 520;
  [1, 2, 3].forEach(function (k) {
    setTimeout(function () {
      if (ui.scan.draft !== draft) return;
      ui.scan.done = k;
      if (k === 3) ui.scan.phase = "review";
      if (ui.tab === "scan") render();
    }, stepMs * k);
  });
}

/* Draf baju baru; gaya diisi otomatis dari selera untuk jenis baju tersebut */
function draftFrom(type, color, extra) {
  const pref = S.prefs[type];
  return Object.assign({
    name: type + " " + color.toLowerCase(), type: type, shape: SHAPE_OF[type], color: color,
    styles: pref.styles.length ? [pref.styles[0]] : ["Kasual"],
    occ: ["Kuliah", "Nongkrong"], photo: null
  }, extra || {});
}

function handle(action, el) {
  const val = el.dataset.val;
  switch (action) {
    case "tab":
      // huruf besar/kecil disamakan; nama lama "racik" juga diterima
      ui.tab = el.dataset.tab.toLowerCase();
      if (ui.tab === "racik") ui.tab = "match";
      ui.sheetId = null; ui.confirmReset = false;
      if (ui.tab === "match") { runMatch(); $("#screen").scrollTop = 0; return; }
      render(); $("#screen").scrollTop = 0;
      return;
    case "fstatus": ui.fStatus = val; break;
    case "ftype": ui.fType = val; break;
    case "open": ui.sheetId = el.dataset.id; ui.confirmDelete = false; break;
    case "close-sheet": ui.sheetId = null; break;

    // Fitur USE dan READY
    case "use": {
      const i = byId(el.dataset.id); markUsed(i); save();
      toast(i.name + " sedang dipakai"); break;
    }
    case "return": {
      const i = byId(el.dataset.id); i.status = "ready"; save();
      toast(i.name + " kembali Ready"); break;
    }
    case "return-all": {
      let n = 0;
      S.items.forEach(function (i) { if (i.status === "used") { i.status = "ready"; n++; } });
      save(); toast(n + " baju kembali Ready"); break;
    }

    // Hapus baju
    case "del": ui.confirmDelete = true; break;
    case "del-cancel": ui.confirmDelete = false; break;
    case "del-confirm": {
      const i = byId(el.dataset.id);
      S.items = S.items.filter(function (x) { return x.id !== i.id; });
      ui.sheetId = null; save(); toast(i.name + " dihapus dari lemari"); break;
    }

    // Match
    case "act": ui.act = val; runMatch(); return;
    case "reroll": ui.seed++; runMatch(); $("#screen").scrollTop = 0; return;
    case "wear-outfit": {
      const ids = el.dataset.ids.split(",");
      ids.forEach(function (id) { markUsed(byId(id)); });
      save(); toast("Outfit dipakai, " + ids.length + " baju ditandai Dipakai"); break;
    }

    // Scan
    case "scan-sample": {
      const s = SCAN_SAMPLES[ui.sampleIdx % SCAN_SAMPLES.length];
      ui.sampleIdx++;
      startAnalyze(Object.assign(draftFrom(s.type, s.color), {
        name: s.name, shape: s.shape, styles: s.styles.slice(), occ: s.occ.slice(), guessType: true, guessColor: true
      }));
      return;
    }
    case "d-color": ui.scan.draft.color = val; ui.scan.draft.guessColor = false; break;
    case "d-style": toggle(ui.scan.draft.styles, val); break;
    case "d-occ": toggle(ui.scan.draft.occ, val); break;
    case "scan-save": {
      const d = ui.scan.draft;
      if (!d.styles.length) d.styles = ["Kasual"];
      if (!d.occ.length) d.occ = ACTS.slice();
      S.nums[d.type] = (S.nums[d.type] || 0) + 1;
      const item = {
        id: "i" + (S.nextId++),
        code: PREFIX[d.type] + "-" + String(S.nums[d.type]).padStart(3, "0"),
        name: (d.name || "").trim() || d.type + " baru",
        type: d.type, shape: d.shape, color: d.color, styles: d.styles, occ: d.occ,
        wear: 0, lastWorn: null, status: "ready", photo: d.photo
      };
      S.items.unshift(item); ui.newId = item.id; save();
      ui.scan = { phase: "idle", draft: null, done: 0 };
      ui.tab = "lemari"; ui.fStatus = "Semua"; ui.fType = "Semua";
      toast(item.name + " tersimpan, status Ready");
      render(); $("#screen").scrollTop = 0;
      return;
    }
    case "scan-cancel": ui.scan = { phase: "idle", draft: null, done: 0 }; break;

    // Gaya
    case "pref-style": toggle(S.prefs[el.dataset.type].styles, val); save(); break;
    case "pref-color": toggle(S.prefs[el.dataset.type].colors, val); save(); break;
    case "toggle-rare": S.rare = !S.rare; save(); break;
    case "reset": ui.confirmReset = true; break;
    case "reset-cancel": ui.confirmReset = false; break;
    case "logout": logout(); return; // fungsi dari auth.js
    case "reset-confirm":
      S = seedState(); save(); ui.confirmReset = false; ui.newId = null;
      toast("Data contoh dipulihkan"); break;
  }
  // Tampilkan ulang tanpa melompat ke atas
  const top = $("#screen").scrollTop;
  render();
  $("#screen").scrollTop = top;
}

/* ---------- 5. Menyambungkan klik ke aksi ----------
   Setiap tombol punya atribut data-action. Satu pendengar klik menangani semuanya. */
$("#phone").addEventListener("click", function (e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  handle(el.dataset.action, el);
});

/* Tombol foto bisa ditekan dengan Enter/Spasi dari keyboard */
$("#phone").addEventListener("keydown", function (e) {
  const lab = e.target.closest('label[for="fileInput"]');
  if (lab && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); $("#fileInput").click(); }
});

/* Ketikan nama baju dan pilihan jenis di layar Scan */
$("#screen").addEventListener("input", function (e) {
  if (e.target.id === "dName" && ui.scan.draft) ui.scan.draft.name = e.target.value;
});
$("#screen").addEventListener("change", function (e) {
  if (e.target.id === "dType" && ui.scan.draft) {
    const d = ui.scan.draft;
    d.type = e.target.value; d.shape = SHAPE_OF[d.type]; d.guessType = false;
    const top = $("#screen").scrollTop; render(); $("#screen").scrollTop = top;
  }
});

/* Saat foto dipilih: diproses ai.js, lalu animasi analisis */
$("#fileInput").addEventListener("change", function (e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  processImage(f).then(function (r) {
    startAnalyze(draftFrom(guessType(r.ratio), r.color, { photo: r.photo, guessType: true, guessColor: true }));
  }).catch(function () {
    toast("Foto tidak bisa dibaca. Coba foto JPG atau PNG.");
  });
});

/* Tombol mode terang/gelap di bilah atas */
const themeBtn = $("#themeToggle");
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function syncThemeBtn() {
  themeBtn.innerHTML = isDark() ? ICON_SUN + "Mode terang" : ICON_MOON + "Mode gelap";
}
try {
  const savedTheme = localStorage.getItem("FitMatch-theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
} catch (e) { /* abaikan */ }
themeBtn.addEventListener("click", function () {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("FitMatch-theme", next); } catch (e) { /* abaikan */ }
  syncThemeBtn();
});
syncThemeBtn();

/* Tampilkan layar pertama */
render();
