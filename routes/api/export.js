import { Router } from 'express';

const router = Router();

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47]);

/**
 * Sanitize a user-supplied filename for safe use in
 * Content-Disposition headers. Strips path traversal, restricts
 * to a whitelist, and always returns a `.png` filename.
 *
 * @param {string} input - raw filename from client
 * @returns {string} sanitized filename ending in `.png`
 */
function sanitizeFilename(input) {
  let name = (input || '').trim();
  if (name.length === 0 || name.length > 255) return 'export.png';
  name = name.replace(/\.[^.]*$/, '');           // strip extension
  name = name.replace(/[^A-Za-z0-9._\- ]/g, ''); // whitelist
  name = name.replace(/\.\./g, '');              // no path traversal
  name = name.replace(/^\.+/, '');               // no leading dots
  name = name.replace(/\s+/g, ' ').replace(/-+/g, '-'); // normalize
  return (name || 'export') + '.png';
}

router.post('/', (req, res) => {
  try {
    const { dataUrl, filename } = req.body || {};

    if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
      return res.status(400).json({ error: 'Missing dataUrl' });
    }

    if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
      return res.status(400).json({ error: 'Invalid dataUrl format; expected data:image/png;base64,' });
    }

    const b64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
    if (b64.length === 0 || !/^[A-Za-z0-9+/=]+$/.test(b64)) {
      return res.status(400).json({ error: 'Invalid base64 payload' });
    }

    let buf;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Malformed base64' });
    }

    if (buf.length < 8 || !buf.slice(0, 4).equals(PNG_SIG)) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const safeName = sanitizeFilename(filename);
    const encoded  = encodeURIComponent(safeName);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`
    );
    res.setHeader('Content-Length', buf.length);
    return res.status(200).end(buf);
  } catch (err) {
    console.error('[api/export]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { sanitizeFilename };
export default router;
