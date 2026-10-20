import { Connection, ClientSession } from 'mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('MongoTransactionHelper');

/**
 * Runs an asynchronous operation inside a MongoDB transaction.
 * If replica sets are not available (e.g., in standalone CI/local mock),
 * gracefully executes without session so development and testing proceed safely.
 */
export async function withTransaction<T>(
  connection: Connection,
  operation: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  let session: ClientSession | null = null;
  let isTransactionActive = false;

  try {
    session = await connection.startSession();
    session.startTransaction();
    isTransactionActive = true;
  } catch (err: any) {
    logger.warn(
      `MongoDB transactions not supported on this node (${err.message}). Executing in non-transactional mode.`,
    );
    session = null;
  }

  try {
    const result = await operation(session);
    if (session && isTransactionActive) {
      await session.commitTransaction();
    }
    return result;
  } catch (error: any) {
    if (
      session &&
      (error?.message?.includes('replica set') ||
        error?.message?.includes('Transaction numbers are only allowed') ||
        error?.codeName === 'IllegalOperation')
    ) {
      logger.warn(
        `MongoDB is running in standalone mode without replica set (${error.message}). Retrying operation in non-transactional mode.`,
      );
      try {
        await session.endSession();
      } catch {}
      session = null;
      isTransactionActive = false;
      return operation(null);
    }

    if (session && isTransactionActive) {
      try {
        await session.abortTransaction();
      } catch {}
    }
    throw error;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {}
    }
  }
}
