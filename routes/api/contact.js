import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res) => {
  const { name, email, message } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100)
    return res.status(400).json({ error: 'Name is required and must be 100 characters or fewer' });

  if (!email || !EMAIL_REGEX.test(email))
    return res.status(400).json({ error: 'A valid email address is required' });

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000)
    return res.status(400).json({ error: 'Message is required and must be 2000 characters or fewer' });

  if (!process.env.RESEND_API_KEY) {
    console.warn('[contact] RESEND_API_KEY not set — skipping send in dev/test');
    return res.json({ ok: true, dev: true });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Hardy House Consulting <onboarding@resend.dev>',
      to: 'james@hardyhouseconsulting.com',
      replyTo: email,
      subject: `Hardy House — message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Resend error:', err.message);
    res.status(500).json({ error: 'Delivery failed' });
  }
});

export default router;
