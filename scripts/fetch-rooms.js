// scripts/fetch-rooms.js
// Fetches live room data from the Chaturbate affiliate API and writes
// rooms.json in the shape index.html expects: username, viewers, tags, thumb.
//
// NOTE: Chaturbate's affiliate API is IP-restricted. The IP calling this
// endpoint must be whitelisted in your Chaturbate affiliate dashboard.
// GitHub Actions runners use rotating shared IPs and generally CANNOT be
// whitelisted — if this script returns 0 rooms, that's almost certainly why.
// This script is safe to run from a VPS/server with a fixed IP.

const WM = 'T2CSW';           // your affiliate wm code
const CAMPAIGN = 'T2CSW';     // used in the revshare link, not the API call
const API_URL = `https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=${WM}&client_ip=request_ip`;

async function main() {
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoomFetcher/1.0)' }
  });

  if (!res.ok) {
    console.error(`API request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.error('API returned no rooms. Likely an IP-whitelist issue — see comment at top of this file.');
    process.exit(1);
  }

  // DEBUG: print the raw shape of the first item so we can confirm real
  // field names instead of guessing. Check this in the Actions log.
  console.log('Raw first item from API:', JSON.stringify(data[0], null, 2));

  // Chaturbate's affiliate API field names have varied historically
  // (room_slug vs username, num_users vs viewers). Map defensively.
  const rooms = data.map(r => ({
    username: r.username || r.room_slug || r.room || '',
    viewers: Number(r.num_users ?? r.viewers ?? 0),
    tags: Array.isArray(r.tags) ? r.tags : [],
    thumb: r.image_url || r.thumb || ''
  })).filter(r => r.username); // drop anything malformed

  if (rooms.length === 0) {
    console.error(`Mapped 0 usable rooms out of ${data.length} raw results.`);
    console.error('The field names above did not match r.username / r.room_slug / r.room.');
    console.error('Check the "Raw first item" log above and update the mapping to match the real field names.');
    process.exit(1); // don't overwrite rooms.json with an empty file
  }

  const fs = await import('fs');
  fs.writeFileSync('rooms.json', JSON.stringify(rooms, null, 2));
  console.log(`Wrote ${rooms.length} rooms to rooms.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
