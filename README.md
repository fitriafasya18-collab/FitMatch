# Prototipe FitMatch

Prototipe aplikasi lemari digital berbasis AI (simulasi) untuk UTS Design Thinking.

## Struktur folder

```
FitMatch/
├── index.html      kerangka halaman (bingkai ponsel + panel panduan)
├── css/
│   └── style.css   semua tampilan: warna, font, ukuran, tata letak
└── js/
    ├── data.js     daftar warna/jenis/gaya, data contoh, simpan & muat data
    ├── ai.js       simulasi AI: racik outfit, baca warna foto, tebak jenis baju
    └── app.js      empat layar (Lemari, Racik, Scan, Gaya) dan aksi tombol
```

Urutan `<script>` di `index.html` harus data.js → ai.js → app.js.

## Cara menjalankan di VS Code

1. Buka folder `ceklemari` lewat **File → Open Folder**.
2. Pasang ekstensi **Live Server** (penerbit: Ritwick Dey).
3. Klik kanan `index.html` → **Open with Live Server**.

Tanpa Live Server, `index.html` juga bisa dibuka dengan klik dua kali.

## Tempat mengubah hal yang sering diubah

| Ingin mengubah | Buka file | Cari |
| --- | --- | --- |
| Warna tema aplikasi | css/style.css | `--accent` |
| Isi lemari contoh | js/data.js | `const SEED` |
| Gaya awal tiap jenis baju | js/data.js | `function defaultPrefs` |
| Aturan skor AI | js/ai.js | `function itemScore` |
| Teks di layar | js/app.js | fungsi `render...` |

Data contoh tersimpan di peramban (localStorage). Untuk kembali ke awal, buka menu Gaya lalu pilih **Atur ulang ke data contoh**.
