import localtunnel from 'localtunnel';

let activeTunnel = null;
let publicUrl = null;

export async function getPublicMediaUrl(localMediaUrl) {
  if (!localMediaUrl) return '';

  // If already a remote URL (not localhost), return as is
  if (!localMediaUrl.includes('localhost') && !localMediaUrl.includes('127.0.0.1')) {
    return localMediaUrl;
  }

  // If tunnel is already open, use it
  if (publicUrl && activeTunnel) {
    const filename = localMediaUrl.split('/uploads/').pop();
    return `${publicUrl}/uploads/${filename}`;
  }

  // Otherwise, try opening localtunnel on port 5000
  try {
    console.log('[Tunnel] Opening public tunnel for Instagram/Threads media URLs...');
    activeTunnel = await localtunnel({ port: 5000 });
    publicUrl = activeTunnel.url;

    activeTunnel.on('close', () => {
      console.log('[Tunnel] Public tunnel closed.');
      activeTunnel = null;
      publicUrl = null;
    });

    console.log(`[Tunnel] Public tunnel active at: ${publicUrl}`);
    const filename = localMediaUrl.split('/uploads/').pop();
    return `${publicUrl}/uploads/${filename}`;
  } catch (err) {
    console.warn('[Tunnel] Could not launch localtunnel, using local URL:', err.message);
    return localMediaUrl;
  }
}
