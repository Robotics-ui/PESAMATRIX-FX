// filename: src/api-server/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../lib/db/index.js';
import { users, sessions } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many connection attempts, clear cooldown window before retrying' }
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'provider', 'user']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      role: role || 'user'
    }).returning();

    return res.status(201).json({ id: newUser!.id, email: newUser!.email, role: newUser!.role });
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || err.message });
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash)) || !user.isActive) {
      return res.status(401).json({ error: 'Invalid active user credentials' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    await db.insert(sessions).values({
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return res.json({ accessToken, refreshToken });
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || err.message });
  }
});

export default router;
