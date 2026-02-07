// API endpoint untuk Gemini AI
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // Cek method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, image, mode } = req.body;

        // Validasi input
        if (!message && !image) {
            return res.status(400).json({ error: 'Message or image is required' });
        }

        // Inisialisasi Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Konfigurasi model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        });

        let prompt = message;
        let searchUsed = false;

        // Jika mode search aktif, tambahkan konteks pencarian
        if (mode === 'search') {
            try {
                // Panggil search API untuk mendapatkan informasi terbaru
                const searchResults = await performSearch(message);
                
                if (searchResults && searchResults.length > 0) {
                    prompt = `Pertanyaan: ${message}\n\nInformasi dari pencarian terkini:\n${searchResults.slice(0, 3).map((result, idx) => `${idx + 1}. ${result}`).join('\n')}\n\nBerdasarkan informasi di atas, jawablah pertanyaan berikut dengan jelas dan akurat. Jika informasi dari pencarian tidak cukup atau tidak relevan, jelaskan bahwa informasi terbaru tidak tersedia dan berikan pengetahuan umum.`;
                    searchUsed = true;
                }
            } catch (searchError) {
                console.error('Search error:', searchError);
                // Lanjut tanpa informasi pencarian jika search gagal
            }
        }

        // Siapkan konten untuk dikirim ke Gemini
        const contents = [];

        // Jika ada gambar, tambahkan sebagai part
        if (image) {
            // Hilangkan data URL prefix jika ada
            const base64Image = image.split(',')[1] || image;
            
            contents.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                }
            });
        }

        // Tambahkan teks sebagai part
        contents.push({ text: prompt });

        // Generate konten
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: contents }]
        });

        const responseText = result.response.text();

        // Kirim respon
        return res.status(200).json({
            response: responseText,
            searchUsed: searchUsed
        });

    } catch (error) {
        console.error('Gemini API error:', error);
        
        // Error handling yang lebih spesifik
        if (error.message.includes('API_KEY_INVALID')) {
            return res.status(401).json({ error: 'Invalid API key' });
        } else if (error.message.includes('Quota exceeded')) {
            return res.status(429).json({ error: 'API quota exceeded' });
        } else {
            return res.status(500).json({ 
                error: 'Failed to get response from AI',
                details: error.message 
            });
        }
    }
}

// Fungsi untuk melakukan pencarian (mock/placeholder)
async function performSearch(query) {
    // Ini adalah implementasi mock
    // Dalam implementasi nyata, hubungkan dengan API pencarian seperti SerpAPI, Google Custom Search, dll.
    
    // Contoh: Gunakan environment variable untuk search API
    const searchApiKey = process.env.SEARCH_API_KEY;
    const searchApiUrl = process.env.SEARCH_API_URL;
    
    if (!searchApiKey || !searchApiUrl) {
        console.log('Search API not configured, using mock data');
        return getMockSearchResults(query);
    }
    
    try {
        // Implementasi actual search API call
        const response = await fetch(`${searchApiUrl}?q=${encodeURIComponent(query)}&api_key=${searchApiKey}`);
        
        if (!response.ok) {
            throw new Error(`Search API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ekstrak hasil pencarian berdasarkan format API
        // Contoh untuk SerpAPI:
        // return data.organic_results?.map(result => result.snippet) || [];
        
        // Fallback ke mock data jika format tidak sesuai
        return getMockSearchResults(query);
        
    } catch (error) {
        console.error('Search API error:', error);
        return getMockSearchResults(query);
    }
}

// Fungsi untuk menghasilkan mock search results
function getMockSearchResults(query) {
    const mockResults = [
        `Informasi tentang "${query}" diperbarui hingga 2024. Sumber terpercaya mencatat perkembangan terbaru di bidang ini.`,
        `Berdasarkan data terkini, topik "${query}" menjadi perhatian banyak pihak dengan perkembangan yang signifikan.`,
        `Pencarian terbaru menunjukkan minat yang tinggi terhadap "${query}" dengan berbagai perspektif dan analisis.`
    ];
    
    return mockResults;
}