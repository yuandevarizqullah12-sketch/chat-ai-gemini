// API endpoint untuk pencarian eksternal
export default async function handler(req, res) {
    // Cek method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query } = req.body;

        // Validasi input
        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // API key dan URL dari environment variables
        const apiKey = process.env.SEARCH_API_KEY;
        const apiUrl = process.env.SEARCH_API_URL;

        // Jika search API tidak dikonfigurasi, kembalikan mock data
        if (!apiKey || !apiUrl) {
            console.log('Search API not configured, returning mock data');
            const mockResults = generateMockSearchResults(query);
            return res.status(200).json({ results: mockResults });
        }

        // Lakukan pencarian aktual menggunakan API
        const searchResults = await performActualSearch(query, apiKey, apiUrl);
        
        // Format hasil pencarian
        const formattedResults = formatSearchResults(searchResults);
        
        return res.status(200).json({ 
            results: formattedResults,
            query: query
        });

    } catch (error) {
        console.error('Search API error:', error);
        
        // Fallback ke mock data jika terjadi error
        const mockResults = generateMockSearchResults(req.body?.query || '');
        
        return res.status(200).json({ 
            results: mockResults,
            error: 'Using mock data due to search API error',
            details: error.message
        });
    }
}

// Fungsi untuk melakukan pencarian aktual
async function performActualSearch(query, apiKey, apiUrl) {
    // Implementasi sesuai dengan API pencarian yang digunakan
    // Contoh untuk SerpAPI:
    const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        num: 5, // Jumlah hasil
        hl: 'id', // Bahasa Indonesia
        gl: 'id'  // Negara Indonesia
    });

    const response = await fetch(`${apiUrl}?${params}`);
    
    if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
    }
    
    return await response.json();
}

// Fungsi untuk memformat hasil pencarian
function formatSearchResults(searchData) {
    // Format tergantung pada API yang digunakan
    // Contoh untuk SerpAPI:
    if (searchData.organic_results) {
        return searchData.organic_results.slice(0, 5).map(result => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link,
            source: result.source
        }));
    }
    
    // Fallback format jika struktur tidak dikenali
    return [];
}

// Fungsi untuk menghasilkan mock search results
function generateMockSearchResults(query) {
    const currentDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return [
        {
            title: `Informasi Terbaru tentang "${query}"`,
            snippet: `Berdasarkan data terkini hingga ${currentDate}, topik "${query}" menunjukkan perkembangan yang signifikan. Sumber terpercaya melaporkan tren dan analisis terbaru di bidang ini.`,
            link: `https://example.com/search?q=${encodeURIComponent(query)}`,
            source: "Example News"
        },
        {
            title: `Analisis dan Pembahasan "${query}"`,
            snippet: `Para ahli memberikan perspektif baru mengenai "${query}". Temuan dan penelitian terbaru memberikan wawasan yang berharga untuk memahami topik ini secara lebih mendalam.`,
            link: `https://example.com/analysis?q=${encodeURIComponent(query)}`,
            source: "Analysis Portal"
        },
        {
            title: `Statistik dan Data "${query}"`,
            snippet: `Data statistik terbaru menunjukkan perkembangan "${query}" dalam beberapa bulan terakhir. Informasi ini dapat menjadi referensi penting untuk pengambilan keputusan.`,
            link: `https://example.com/data?q=${encodeURIComponent(query)}`,
            source: "Data Center"
        }
    ];
}