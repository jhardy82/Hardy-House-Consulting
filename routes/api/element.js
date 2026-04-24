import { Router } from 'express';

const router = Router();
const VALID = ['fire', 'earth', 'air', 'water', 'aether'];

router.get('/', (req, res) => {
  res.json({ element: req.session.element || null });
});

router.post('/', (req, res) => {
  const { element } = req.body;
  if (!VALID.includes(element))
    return res.status(400).json({ error: 'Invalid element' });
  req.session.element = element;
  res.json({ element, ok: true });
});

export default router;
