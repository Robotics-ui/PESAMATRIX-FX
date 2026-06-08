// filename: src/api-server/routes/accounts.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db/index.js';
import { mt5Accounts, providers, followerAccounts } from '../../lib/db/schema.js';
import { authenticateJWT } from '../middleware/auth.js';
import { encrypt } from '../../lib/crypto.js';
import { accountSyncQueue } from '../../lib/queue/definitions.js';

const router = Router();

const linkAccountSchema = z.object({
  metaApiAccountId: z.string(),
  login: z.string(),
  password: z.string(),
  server: z.string(),
  accountType: z.enum(['MASTER', 'FOLLOWER']),
  providerName: z.string().optional() 
});

router.post('/connect', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const payload = linkAccountSchema.parse(req.body);
    const userId = req.user!.userId;
    const encryptedPassword = encrypt(payload.password);

    const [account] = await db.insert(mt5Accounts).values({
      userId,
      metaApiAccountId: payload.metaApiAccountId,
      login: payload.login,
      encryptedPassword,
      server: payload.server,
      accountType: payload.accountType,
    }).returning();

    if (payload.accountType === 'MASTER') {
      await db.insert(providers).values({
        userId,
        mt5AccountId: account!.id,
        name: payload.providerName || `Master-${payload.login}`,
      });
    }

    await accountSyncQueue.add(`sync-${account!.id}`, { accountId: account!.id });

    return res.status(201).json({ message: 'MetaApi Account provisioned, syncing sequence deployed.', accountId: account!.id });
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || err.message });
  }
});

export default router;
