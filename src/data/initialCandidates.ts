import { getDriveImageUrl } from '../utils/driveUrl.ts';

export interface Candidate {
  id: number;
  nomorUrut: number;
  namaKetua: string;
  namaWakil: string;
  kelasKetua: string;
  kelasWakil: string;
  fotoKetua: string;
  fotoWakil: string;
  fotoPasangan?: string;
  tagline: string;
  visi: string;
  misi: string[];
  programUnggulan: string[];
  warnaAksen: string;
  votes: number;
  percentage?: number;
}

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 1,
    nomorUrut: 1,
    namaKetua: "MUHAMAD RIZKI LAMUSU",
    namaWakil: "SALSABILA J.N ALI RUDIN",
    kelasKetua: "12-APHP-1",
    kelasWakil: "12-APHP-2",
    fotoKetua: "https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG",
    fotoWakil: "https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG",
    fotoPasangan: "https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG",
    tagline: "SMK BISA, BERKREASI, BERPRESTASI & BERINTEGRITAS TINGGI",
    visi: "Mewujudkan OSIS SMKN 2 Gorontalo yang inklusif, adaptif terhadap teknologi digital, dan menjadi wadah kreativitas serta kepemimpinan siswa yang berakhlak mulia.",
    misi: [
      "Mengembangkan forum aspirasi digital siswa yang transparan dan solutif.",
      "Mengadakan kompetisi kejuruan antarkelas untuk mengasah bakat industri kreatif.",
      "Menumbuhkan kepedulian lingkungan sekolah dengan program Zero Waste Campus.",
      "Mempererat solidaritas antar rombel kejuruan tanpa membeda-bedakan jurusan."
    ],
    programUnggulan: [
      "Digital Student Hub (Portal Aspirasi Siswa)",
      "SMKN 2 Gorontalo Creative & Skill Expo",
      "Pekan Olahraga & Seni Antar Rombel (PORSENI)"
    ],
    warnaAksen: "from-blue-600 to-indigo-600",
    votes: 0,
  },
  {
    id: 2,
    nomorUrut: 2,
    namaKetua: "AL FATHIR ADAM KONDENGIS",
    namaWakil: "CHELSEA LILIANA LIMONU",
    kelasKetua: "12-DKV-1",
    kelasWakil: "12-CANTIK-1",
    fotoKetua: "https://lh3.googleusercontent.com/d/1U3MmtvmtaEYFbkzaex_kbZpd1U8_UsUw",
    fotoWakil: "https://lh3.googleusercontent.com/d/1U3MmtvmtaEYFbkzaex_kbZpd1U8_UsUw",
    fotoPasangan: "https://lh3.googleusercontent.com/d/1U3MmtvmtaEYFbkzaex_kbZpd1U8_UsUw",
    tagline: "BERSAMA MEMBANGUN KARAKTER, UNGGUL DALAM KARYA DAN KARYAWISATA",
    visi: "Menjadikan OSIS SMKN 2 Gorontalo sebagai poros perubahan karakter siswa yang berdaya saing global, berjiwa kewirausahaan, dan menjunjung tinggi nilai budaya Gorontalo.",
    misi: [
      "Mendorong program magang mini dan pameran karya kejuruan siswa di tingkat kota.",
      "Mengoptimalkan peran ekstrakurikuler dalam membentuk mental kepemimpinan tangguh.",
      "Meluncurkan program 'Sahabat Siswa' untuk pendampingan konseling teman sebaya.",
      "Membangun kolaborasi erat antara OSIS dengan alumni sukses SMK Negeri 2 Gorontalo."
    ],
    programUnggulan: [
      "Young Entrepreneur Festival (Bazar Produk Siswa)",
      "Pekan Disiplin & Apresiasi Duta Siswa Teladan",
      "Klinik Karya & Desain Portofolio Siap Kerja"
    ],
    warnaAksen: "from-emerald-600 to-teal-600",
    votes: 0,
  },
  {
    id: 3,
    nomorUrut: 3,
    namaKetua: "MOHAMAD RASYA HAMZAH",
    namaWakil: "AYRA SOLEHA ZUBEIDI",
    kelasKetua: "12-HOTEL-1",
    kelasWakil: "12-HOTEL-3",
    fotoKetua: "https://lh3.googleusercontent.com/d/1oDOtQVlQGcaGu-95JicM8chDZ3bonbMM",
    fotoWakil: "https://lh3.googleusercontent.com/d/1oDOtQVlQGcaGu-95JicM8chDZ3bonbMM",
    fotoPasangan: "https://lh3.googleusercontent.com/d/1oDOtQVlQGcaGu-95JicM8chDZ3bonbMM",
    tagline: "PELAYANAN RAMAH, SOLIDARITAS UTAMA, PRESTASI NYATA",
    visi: "Mewujudkan lingkungan sekolah yang harmonis, ramah, dan berstandar hospitaliti unggul dengan OSIS yang melayani dan mengayomi seluruh warga sekolah.",
    misi: [
      "Meningkatkan etika dan budaya 5S (Senyum, Salam, Sapa, Sopan, Santun) di sekolah.",
      "Memfasilitasi pelatihan public speaking dan hospitality leadership bagi seluruh siswa.",
      "Menjalin kerja sama dengan instansi luar untuk kegiatan sosial dan bakti kemasyarakatan.",
      "Mengembangkan media informasi OSIS yang interaktif, edukatif, dan menarik."
    ],
    programUnggulan: [
      "Hospitality & Etiquette Bootcamp untuk Siswa",
      "Aksi Peduli Kasih & Bakti Sosial SMKN 2",
      "Podcast & Mading Digital Suara Siswa"
    ],
    warnaAksen: "from-amber-600 to-rose-600",
    votes: 0,
  }
];

export const CANDIDATES_SPREADSHEET_TEMPLATE_CSV = `Nomor Urut,Nama Ketua,Nama Wakil,Kelas Ketua,Kelas Wakil,Foto Ketua URL,Foto Wakil URL,Tagline,Visi,Misi (Pisahkan dengan tanda |),Program Unggulan (Pisahkan dengan tanda |),Warna Aksen
1,MUHAMAD RIZKI LAMUSU,SALSABILA J.N ALI RUDIN,12-APHP-1,12-APHP-2,https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG,https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG,SMK BISA BERKREASI DAN BERINTEGRITAS,Mewujudkan OSIS yang inklusif dan adaptif teknologi digital,Forum aspirasi digital|Kompetisi kejuruan antarkelas|Zero waste campus|Solidaritas antar rombel,Digital Student Hub|Skill Expo|Porseni,from-blue-600 to-indigo-600
2,AL FATHIR ADAM KONDENGIS,CHELSEA LILIANA LIMONU,12-DKV-1,12-CANTIK-1,https://lh3.googleusercontent.com/d/1U3MmtvmtaEYFbkzaex_kbZpd1U8_UsUw,https://lh3.googleusercontent.com/d/1U3MmtvmtaEYFbkzaex_kbZpd1U8_UsUw,BERSAMA MEMBANGUN KARAKTER DAN KARYA,Menjadikan OSIS poros perubahan karakter berjiwa wirausaha,Pameran karya kejuruan|Optimalisasi ekskul kepemimpinan|Program sahabat siswa|Kolaborasi alumni,Entrepreneur Fest|Duta Siswa Teladan|Klinik Portofolio,from-emerald-600 to-teal-600
3,MOHAMAD RASYA HAMZAH,AYRA SOLEHA ZUBEIDI,12-HOTEL-1,12-HOTEL-3,https://lh3.googleusercontent.com/d/1oDOtQVlQGcaGu-95JicM8chDZ3bonbMM,https://lh3.googleusercontent.com/d/1oDOtQVlQGcaGu-95JicM8chDZ3bonbMM,PELAYANAN RAMAH PRESTASI NYATA,Mewujudkan lingkungan sekolah harmonis dengan hospitality unggul,Meningkatkan budaya 5S|Bootcamp public speaking|Bakti sosial kemasyarakatan|Media informasi interaktif,Hospitality Bootcamp|Bakti Sosial SMKN 2|Podcast Suara Siswa,from-amber-600 to-rose-600`;

export function parseCandidatesCSV(csvText: string, existingCandidates: Candidate[] = []): Candidate[] {
  const lines = csvText.trim().split(/\r?\n/);
  const candidates: Candidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith('nomor urut') || line.toLowerCase().startsWith('no,')) continue;

    // Split CSV handling quotes
    const parts: string[] = [];
    let insideQuote = false;
    let currentPart = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim());

    if (parts.length >= 3) {
      const noUrut = parseInt(parts[0], 10) || (i + 1);
      const namaKetua = parts[1] || `Calon Ketua ${noUrut}`;
      const namaWakil = parts[2] || `Calon Wakil ${noUrut}`;
      const kelasKetua = parts[3] || 'SMKN 2 Gorontalo';
      const kelasWakil = parts[4] || 'SMKN 2 Gorontalo';
      const rawFotoKetua = parts[5] || 'https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG';
      const rawFotoWakil = parts[6] || rawFotoKetua;
      const fotoKetua = getDriveImageUrl(rawFotoKetua);
      const fotoWakil = getDriveImageUrl(rawFotoWakil);
      const fotoPasangan = fotoKetua;
      const tagline = parts[7] || 'Maju Bersama OSIS Hebat';
      const visi = parts[8] || 'Menjadikan OSIS SMKN 2 Gorontalo yang mandiri dan berprestasi.';
      const misiStr = parts[9] || 'Meningkatkan kedisiplinan|Mengembangkan potensi minat bakat';
      const progStr = parts[10] || 'Program Bakat & Minat|Pekan Kreativitas';
      const warnaAksen = parts[11] || (noUrut === 1 ? 'from-blue-600 to-indigo-600' : noUrut === 2 ? 'from-emerald-600 to-teal-600' : 'from-amber-600 to-rose-600');

      const misi = misiStr.split('|').map((s) => s.trim()).filter(Boolean);
      const programUnggulan = progStr.split('|').map((s) => s.trim()).filter(Boolean);

      // Preserve existing votes if id/nomorUrut matches
      const existing = existingCandidates.find((c) => c.nomorUrut === noUrut);

      candidates.push({
        id: noUrut,
        nomorUrut: noUrut,
        namaKetua,
        namaWakil,
        kelasKetua,
        kelasWakil,
        fotoKetua,
        fotoWakil,
        fotoPasangan,
        tagline,
        visi,
        misi: misi.length > 0 ? misi : ['Meningkatkan solidaritas siswa', 'Mendukung program sekolah'],
        programUnggulan: programUnggulan.length > 0 ? programUnggulan : ['Pekan Kreativitas'],
        warnaAksen,
        votes: existing ? existing.votes : 0,
      });
    }
  }

  return candidates.length > 0 ? candidates : INITIAL_CANDIDATES;
}
