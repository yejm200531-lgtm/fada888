export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initAllSchedulers } = await import('./lib/scheduler');
    initAllSchedulers();
    console.log('[AutoPromoter] Scheduler initialized on server start');
  }
}
