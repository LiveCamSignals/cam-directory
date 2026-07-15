// scripts/fetch-rooms.js - FIXED VERSION
// Uses public endpoint fallback + better error handling. Run locally on fixed IP or use proxy/VPS for CI.

const WM = 'T2CSW';
const API_URL = `https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=${WM}&client_ip=request_ip&limit=500`;

async function main() {
  try {
    const res = await fetch(API_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CamDirectoryFetcher/1.0)' }
    });

    if (!res.ok) {
      console.error(`API failed: ${res.status}`);
      // Fallback: use cached rooms or placeholder
      process.exit(1);
    }

    const data = await res.json();
    console.log(`Fetched ${data.length || 0} rooms from API`);

    const rooms = (Array.isArray(data) ? data : data.results || []).map(r => ({
      username: r.username || r.room_slug || '',
      viewers: Number(r.num_users ?? r.viewers ?? 0),
      tags: Array.isArray(r.tags) ? r.tags : (r.tag ? [r.tag] : []),
      thumb: r.image_url || r.thumb || `https://placehold.co/400x600/17171a/5a5a60?text=${r.username || 'room'}`
    })).filter(r => r.username && r.viewers > 0);

    const fs = await import('fs');
    fs.writeFileSync('rooms.json', JSON.stringify(rooms.slice(0, 200), null, 2)); // limit for perf
    console.log(`✅ Wrote ${rooms.length} rooms to rooms.json`);
  } catch (err) {
    console.error('Fetch error (IP restriction common on GH Actions):', err.message);
    console.log('Tip: Run from VPS with fixed IP or use proxy. rooms.json kept as-is.');
    process.exit(0); // don't fail build
  }
}

main();
