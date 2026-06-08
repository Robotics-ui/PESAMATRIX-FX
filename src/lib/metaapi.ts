// filename: src/lib/metaapi.ts
import MetaApi from 'metaapi.cloud-sdk';
import dotenv from 'dotenv';
import { copyTradeQueue } from './queue/definitions.js';

dotenv.config();

const token = process.env.META_API_TOKEN || '';
export const metaApi = new MetaApi.default(token);

export async function listenToMasterAccount(metaApiAccountId: string, providerId: string) {
  try {
    const account = await metaApi.metatraderAccountApi.getAccount(metaApiAccountId);
    await account.waitConnected();
    const connection = account.getRPCConnection();
    await connection.connect();
    
    console.log(`System established runtime tracking for MetaAPI stream: ${metaApiAccountId}`);
    
    account.addSynchronizationListener({
      onPositionUpdated: async (instanceIndex, position) => {
        await copyTradeQueue.add('process-open', {
          providerId,
          action: 'OPEN',
          ticket: position.id,
          symbol: position.symbol,
          type: position.type,
          volume: position.volume,
          price: position.openPrice
        });
      },
      onPositionCompleted: async (instanceIndex, positionId) => {
        await copyTradeQueue.add('process-close', {
          providerId,
          action: 'CLOSE',
          ticket: positionId
        });
      },
      onBrokerConnectionStatusChanged: () => {},
      onSynchronizationStatusChanged: () => {},
      onHealthStatusChanged: () => {},
      onAccountInformationUpdated: () => {},
      onPositionsReplaced: () => {},
      onPendingOrdersReplaced: () => {},
      onPendingOrderUpdated: () => {},
      onPendingOrderCompleted: () => {},
      onHistoryOrdersReplaced: () => {},
      onHistoryOrdersTotalUpdated: () => {},
      onHistoryDealsByTicketUpdated: () => {}
    });
  } catch (err) {
    console.error(`Tracking pipeline connection initialization dropped for account ${metaApiAccountId}:`, err);
  }
}
