import mongoose from 'mongoose';

let cachedTransactionSupport: boolean | null = null;

function isTransactionUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Transaction numbers are only allowed on a replica set member or mongos');
}

async function supportsTransactions(): Promise<boolean> {
  if (cachedTransactionSupport !== null) {
    return cachedTransactionSupport;
  }

  const db = mongoose.connection.db;
  if (!db) {
    cachedTransactionSupport = false;
    return cachedTransactionSupport;
  }

  try {
    const hello = await db.admin().command({ hello: 1 });
    cachedTransactionSupport = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
  } catch {
    cachedTransactionSupport = false;
  }

  return cachedTransactionSupport;
}

export async function startTransactionSession(): Promise<mongoose.ClientSession | null> {
  if (!(await supportsTransactions())) {
    return null;
  }

  let session: mongoose.ClientSession | null = null;

  try {
    session = await mongoose.startSession();
    await session.startTransaction();
    return session;
  } catch (error) {
    if (session) {
      await session.endSession();
    }

    if (isTransactionUnsupportedError(error)) {
      cachedTransactionSupport = false;
      return null;
    }

    throw error;
  }
}