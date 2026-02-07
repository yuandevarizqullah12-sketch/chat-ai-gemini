# Website Chat AI dengan Gemini

Website chat sederhana yang terhubung dengan Google Gemini API, dengan fitur upload gambar dan mode pencarian.

## Fitur

1. **Chat Interface**:
   - Kirim pesan teks dan gambar
   - Dua mode chat: Standard (AI saja) dan AI + Search
   - Riwayat chat disimpan di localStorage
   - Responsif di semua perangkat

2. **Backend Serverless**:
   - Endpoint `/api/gemini` untuk koneksi ke Gemini API
   - Endpoint `/api/search` untuk pencarian informasi terbaru
   - API key aman di environment variables

## Cara Menjalankan di Lokal

### Prasyarat
- Node.js 18+ dan npm
- Akun Google AI Studio (untuk Gemini API key)

### Langkah-langkah

1. **Clone atau buat project**:
   ```bash
   mkdir chat-ai-gemini
   cd chat-ai-gemini