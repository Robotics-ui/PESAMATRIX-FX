// filename: src/api-server/routes/admin.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db/index.js';
import { subscriptionPlans, users, providers, trades } from '../../lib/db/schema.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.use(authenticateJWT, requireRole(['admin']));

router.post('/plans', async (req: Request, res: Response) => {
  const planSchema = z.object({ name: z.string(), price: z.number(), durationDays: z.number() });
  try {
    const payload = planSchema.parse(req.body);
    const [plan] = await db.insert(subscriptionPlans).values({
      name: payload.name,
      price: payload.price.toString(),
      durationDays: payload.durationDays
    }).returning();
    return res.status(201).json(plan);
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || err.message });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  const usersList = await db.select().from(users);
  const activeProviders = await db.select().from(providers);
  const activeTradesList = await db.select().from(trades).where(eq(trades.status, 'OPEN'));
  return res.json({ usersCount: usersList.length, providersCount: activeProviders.length, liveTradesCount: activeTradesList.length });
});

export default router;
