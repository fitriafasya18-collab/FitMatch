/* =========================================================
   auth.js — LOGIN dan DAFTAR (simulasi untuk prototipe)
   - Akun disimpan di localStorage browser ini saja, tanpa server.
   - Kata sandi hanya diacak sederhana, BUKAN pengamanan sungguhan.
     Untuk uji prototipe, pakai kata sandi contoh, jangan kata sandi asli.
   - Setiap akun punya isi lemari sendiri (lihat KEY di data.js).
   File ini harus dimuat PALING AWAL, sebelum data.js.
   ========================================================= */

const APP_NAME = "FitMatch";               // nama aplikasi di layar login
const USERS_KEY = "fitmatch-users";        // daftar akun
const SESSION_KEY = "fitmatch-session";    // akun yang sedang masuk

/* ---------- 1. Baca akun yang sedang masuk ---------- */
function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v || fallback; } catch (e) { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* abaikan */ }
}

/* CURRENT_USER = { name, email } atau null jika belum masuk. Dipakai data.js dan app.js. */
const CURRENT_USER = readJSON(SESSION_KEY, null);

/* Akhiran kunci penyimpanan agar tiap akun punya lemari sendiri */
function userSuffix() {
  return CURRENT_USER ? "-" + CURRENT_USER.email : "";
}

/* Nama depan untuk sapaan, misalnya "Halo, Nabila" */
function firstName() {
  return CURRENT_USER ? CURRENT_USER.name.split(" ")[0] : "";
}

/* Pengacak sederhana (FNV-1a). Hanya agar kata sandi tidak tersimpan apa adanya. */
function scramble(text) {
  let h = 2166136261;
  for (let k = 0; k < text.length; k++) { h ^= text.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}

/* ---------- 2. Masuk, daftar, keluar ---------- */
function startSession(user) {
  writeJSON(SESSION_KEY, { name: user.name, email: user.email });
  location.reload(); // muat ulang agar data.js membaca lemari milik akun ini
}
function logout() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* abaikan */ }
  location.reload();
}

/* ---------- 3. Layar login ---------- */
const authUI = { mode: "masuk", error: "", name: "", email: "" };

function authEsc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function renderAuth() {
  const box = document.getElementById("auth");
  if (!box) return;
  const daftar = authUI.mode === "daftar";
  let h = '<div class="auth-inner">'
    + '<div class="auth-brand"><img class="brand-logo" src="img/logo.png" alt="FitMatch"></div>'    + '<div class="seg" role="group" aria-label="Pilih masuk atau daftar">'
    + '<button type="button" data-auth="mode" data-val="masuk" aria-pressed="' + !daftar + '">Masuk</button>'
    + '<button type="button" data-auth="mode" data-val="daftar" aria-pressed="' + daftar + '">Daftar</button></div>'
    + '<form class="auth-form" id="authForm" novalidate>';
  if (daftar) {
    h += '<div class="field"><label for="aName">Nama</label><input type="text" id="aName" autocomplete="name" value="' + authEsc(authUI.name) + '" placeholder="nama anda"></div>';
  }
  h += '<div class="field"><label for="aEmail">Email</label><input type="email" id="aEmail" autocomplete="email" value="' + authEsc(authUI.email) + '" placeholder="nama@email.com"></div>'
    + '<div class="field"><label for="aPass">Kata sandi</label><input type="password" id="aPass" autocomplete="' + (daftar ? "new-password" : "current-password") + '" placeholder="' + (daftar ? "Minimal 6 karakter" : "Kata sandimu") + '"></div>'
    + (authUI.error ? '<p class="auth-error" role="alert">' + authEsc(authUI.error) + '</p>' : '')
    + '<button type="submit" class="btn btn-primary btn-block">' + (daftar ? "Daftar dan masuk" : "Masuk") + '</button>'
    + '</form>'
    + '<div class="auth-or"><span>atau</span></div>'
    + '<button type="button" class="btn btn-ghost btn-block" data-auth="guest">Coba sebagai tamu</button>'
    + '<p class="auth-note">Prototipe: akun hanya tersimpan di browser ini. Gunakan kata sandi contoh, bukan kata sandi aslimu.</p>'
    + '</div>';
  box.innerHTML = h;
}

function submitAuth() {
  const daftar = authUI.mode === "daftar";
  const name = daftar ? document.getElementById("aName").value.trim() : "";
  const email = document.getElementById("aEmail").value.trim().toLowerCase();
  const pass = document.getElementById("aPass").value;
  authUI.name = name; authUI.email = email;
  const users = readJSON(USERS_KEY, {});

  if (daftar && !name) return showAuthError("Isi nama dulu.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError("Format email belum benar, contoh: nama@email.com.");
  if (daftar && pass.length < 6) return showAuthError("Kata sandi minimal 6 karakter.");
  if (!pass) return showAuthError("Isi kata sandi dulu.");

  if (daftar) {
    if (users[email]) return showAuthError("Email ini sudah terdaftar. Pilih Masuk.");
    users[email] = { name: name, email: email, pass: scramble(email + pass) };
    writeJSON(USERS_KEY, users);
    return startSession(users[email]);
  }
  const u = users[email];
  if (!u) return showAuthError("Email belum terdaftar. Pilih Daftar untuk membuat akun.");
  if (u.pass !== scramble(email + pass)) return showAuthError("Kata sandi salah. Coba lagi.");
  startSession(u);
}
function showAuthError(msg) {
  authUI.error = msg;
  renderAuth();
}

/* ---------- 4. Pasang layar login jika belum masuk ---------- */
(function initAuth() {
  const box = document.getElementById("auth");
  if (!box) return;
  if (CURRENT_USER) { box.hidden = true; return; }
  box.hidden = false;
  renderAuth();

  box.addEventListener("click", function (e) {
    const el = e.target.closest("[data-auth]");
    if (!el) return;
    if (el.dataset.auth === "mode") { authUI.mode = el.dataset.val; authUI.error = ""; renderAuth(); }
    if (el.dataset.auth === "guest") startSession({ name: "Tamu", email: "tamu" });
  });
  box.addEventListener("submit", function (e) {
    e.preventDefault();
    submitAuth();
  });
})();
