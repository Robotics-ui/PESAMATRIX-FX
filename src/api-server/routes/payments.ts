// filename: src/api-server/routes/payments.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db/index.js';
import { payments, subscriptionPlans, subscriptions } from '../../lib/db/schema.js';
import { authenticateJWT } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';

const router = Router();

async function getMpesaToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const response = await fetch('https://safaricom.co.ke', {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

router.post('/stkpush', authenticateJWT, async (req: Request, res: Response) => {
  const stkSchema = z.object({ planId: z.string(), phoneNumber: z.string().regex(/^254\d{9}$/) });
  try {
    const { planId, phoneNumber } = stkSchema.parse(req.body);
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
    if (!plan) return res.status(404).json({ error: 'Plan target parameters not resolved' });

    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-T:Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_LNM_PASSKEY}${timestamp}`).toString('base64');

    const mpesaResponse = await fetch('https://safaricom.co.ke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(Number(plan.price)),
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: 'PMATRIX-COPY',
        TransactionDesc: `Plan ${plan.name}`
      })
    });

    const data = await mpesaResponse.json() as { ResponseCode: string; MerchantRequestID: string; CheckoutRequestID: string };
    if (data.ResponseCode === '0') {
      await db.insert(payments).values({
        userId: req.user!.userId,
        planId: plan.id,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        amount: plan.price,
        status: 'PENDING'
      });
      return res.json({ message: 'STK Push generated to client pipeline.', checkoutRequestId: data.CheckoutRequestID });
    }
    return res.status(500).json({ error: 'Daraja internal error logic bypass triggered', info: data });
  } catch (err: any) {
    return res.status(400).json({ error: err.errors || err.message });
  }
});

router.post('/mpesa-callback', async (req: Request, res: Response) => {
  try {
    const { Body } = req.body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;

    const [paymentRecord] = await db.select().from(payments).where(eq(payments.checkoutRequestId, CheckoutRequestID)).limit(1);
    if (!paymentRecord) return res.status(404).send('System signature payment context mismatch');

    if (ResultCode === 0) {
      const metadataItems = Body.stkCallback.CallbackMetadata.Item;
      const receipt = metadataItems.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;

      await db.update(payments).set({ status: 'SUCCESS', mpesaReceiptNumber: receipt }).where(eq(payments.id, paymentRecord.id));
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, paymentRecord.planId)).limit(1);
      
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(startsAt.getDate() + plan!.durationDays);

      await db.insert(subscriptions).values({
        userId: paymentRecord.userId,
        planId: plan!.id,
        startsAt,
        expiresAt,
        status: 'ACTIVE'
      });
    } else {
      await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, paymentRecord.id));
    }
    return res.status(200).send({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    return res.status(500).send('Internal validation hook critical mismatch error');
  }
});

export default router;
