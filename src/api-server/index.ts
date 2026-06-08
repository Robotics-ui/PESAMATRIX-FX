// filename: src/api-server/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import { db } from '../lib/db/index.js';
import { providers, mt5Accounts } from '../lib/db/schema.js';
import { listenToMasterAccount } from '../lib/metaapi.js';
import { eq } from 'drizzle-orm';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`PMATRIX Real-Time Processing System Engine active on internal interface port: ${PORT}`);
  
  try {
    const activeMasters = await db.select({
      providerId: providers.id,
      metaApiAccountId: mt5Accounts.metaApiAccountId
    })
    .from(providers)
    .innerJoin(mt5Accounts, eq(providers.mt5AccountId, mt5Accounts.id))
    .where(eq(providers.isActive, true));

    for (const master of activeMasters) {
      await listenToMasterAccount(master.metaApiAccountId, master.providerId);
    }
  } catch (error) {
    console.error('Boot phase streaming sync framework down, runtime validation failed:', error);
  }
});
