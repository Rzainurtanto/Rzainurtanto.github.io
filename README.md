# Portfolio Rzainurtanto

Website portofolio bertema pixel. Buka `index.html` di browser untuk melihatnya.

## Struktur folder

```
porto/
├── index.html            Halaman utama (isi teks, project, kontak)
├── style.css             Semua tampilan
├── script.js             Semua interaksi (animasi, galeri, tema, dll)
│
├── assets/               File yang DIPAKAI website
│   ├── profile/          Foto profil
│   └── projects/         Satu folder per project
│       ├── berkasir/       01-loading.jpg ... 08-laporan.jpg + poster.jpg
│       ├── stickerkit/     01-upload.jpg ... 09-hasil-gif.jpg + poster.jpg
│       ├── pensight/       01-menu.jpg ... 05-proses-pengerjaan.jpg + poster.jpg
│       ├── jejaknusa/      01-beranda.jpg ... 08-galeri.jpg + poster.jpg
│       ├── amv-remake/     video.mp4 + poster.jpg
│       └── toleransi/      video.mp4 (animasi 2D, 720p) + poster.jpg
│
├── thumbnails/           Desain thumbnail (poster.jpg) tiap project, dalam bentuk HTML
├── originals/            File asli/mentah (screenshot, video belum dikompres)
└── backup/               Backup kode versi awal
```

`originals/` dan `backup/` **tidak dipakai website**. Folder ini juga sudah masuk `.gitignore`
supaya tidak ikut ter-upload. Di dalamnya ada video berukuran besar dan screenshot tim yang
memuat NRP.

## Menambah project baru

1. Buat folder `assets/projects/<nama-project>/`, lalu taruh fotonya dengan nama berurutan:
   `01-....jpg`, `02-....jpg`, dan seterusnya. Video juga boleh (`.mp4`, sebaiknya di bawah 10 MB).
2. Di `index.html`, salin salah satu blok `<article class="project-card">`, lalu ubah:
   - `data-category`: `web`, `android`, atau `motion`
   - `data-images`: daftar foto/video, dipisahkan koma
   - `data-poster`: gambar cover kartu (opsional)
   - `data-link` / `data-link-label`: tombol link utama (opsional)
   - `data-link-alt` / `data-link-alt-label`: tombol link kedua, misalnya video demo (opsional)
   - judul, deskripsi, tag, dan isi `<template class="project-detail">`
3. Thumbnail: salin salah satu folder di `thumbnails/`, ganti teks dan gambarnya, lalu render
   ukuran 1280x880 dan simpan sebagai `assets/projects/<nama-project>/poster.jpg`.

## Tips

- Latar karakter di Home mengikuti jam pengunjung. Klik jam di pojok kanan atas ilustrasi
  untuk mengganti waktu (Otomatis → Pagi → Siang → Sore → Malam). Bisa juga lewat alamat:
  `index.html?time=dawn`, `?time=day`, `?time=dusk`, atau `?time=night`.
- Foto sebaiknya lebarnya maksimal 1600px dan ukurannya di bawah 500 KB agar website tetap cepat.
- Musik latar: tombol equalizer di header membuka pemutar musik (play/pause + volume).
  Lagu: `assets/audio/suiheisen-reff.dat` (file MP3 yang ekstensinya diganti `.dat` supaya tidak ditangkap IDM) (back number, 水平線, cuplikan reff dari menit 1:13 sampai 1:55; lagu penuh dan lagu lama ada di `originals/audio/`). Judul, artis, dan path lagu diatur di objek `MUSIC`
  bagian "Musik latar" pada `script.js`. Kalau file lagu tidak ada, otomatis diputar
  chiptune 8-bit bawaan. Lagu diputar otomatis (atau pada klik pertama bila browser memblokir), volume default 5% (`DEFAULT_VOLUME`).

## Warna (palet "Suiheisen": laut & senja)

Semua warna utama diatur di bagian atas `style.css` (`:root`). Ganti nilainya di sana, seluruh website ikut berubah.

| Variabel  | Warna     | Dipakai untuk                                 |
|-----------|-----------|-----------------------------------------------|
| `--sun`   | `#e8743b` | Warna utama: judul, tombol, garis aktif       |
| `--sea`   | `#4f93bd` | Pendamping: bayangan, label di panel gelap    |
| `--tide`  | `#2c5f86` | Teks biru (angka statistik, label kecil)      |
| `--gold`  | `#f2b84b` | Aksen kecil: badge, balon dialog              |
| `--ocean` | `#13263b` | Teks & panel gelap                            |
| `--sand`  | `#f4efe6` | Latar terang                                  |

Mode gelap diatur di blok `:root[data-theme="dark"]`. Warna langit ilustrasi (pagi/siang/sore/malam) ada di bagian "Hero art".
Thumbnail di folder `thumbnails/` memakai variabel yang sama. Setelah warnanya diubah, render ulang thumbnail-nya menjadi `assets/projects/<nama>/poster.jpg` (ukuran 1280×880).

## Halaman studi kasus

Setiap project bisa punya halaman sendiri, misalnya `berkasir/index.html` → **rzainurtanto.github.io/berkasir/**.

- Tampilannya memakai `style.css` + `case.css`, dan tombol tema memakai `case.js`.
- Untuk project baru: salin folder `berkasir/`, ganti nama foldernya (misalnya `pensight/`), lalu ubah teks dan gambarnya. Path gambar diawali `../assets/...`.
- Sambungkan dari halaman utama dengan mengisi `data-link="pensight/"` dan `data-link-label="BACA STUDI KASUS"` pada kartu project.
- Isi yang paling penting: masalahnya apa, apa yang kamu buat, bagian tersulit, dan yang kamu pelajari.

Catatan: link folder seperti `berkasir/` hanya terbuka benar lewat Live Server atau setelah online, bukan saat membuka file HTML langsung dari folder.
