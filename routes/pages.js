import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.get('*', (req, res) => res.sendFile(join(__dirname, '../views/index.html')));

export default router;
