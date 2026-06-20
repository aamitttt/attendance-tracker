import mongoose from 'mongoose';

// Runs `work(session)` inside a transaction when the server supports them (replica set),
// and falls back to running `work(null)` without a session on standalone mongod.
// This keeps the app runnable on a default local MongoDB while still being race-safe
// on a proper cluster.
export async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    // Transaction numbers / multi-doc txns unsupported on standalone → retry sessionless.
    const msg = String(err && err.message);
    const unsupported =
      err?.code === 20 ||
      err?.codeName === 'IllegalOperation' ||
      /Transaction numbers are only allowed/i.test(msg) ||
      /replica set/i.test(msg) ||
      /not support transactions/i.test(msg);
    if (unsupported) {
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
