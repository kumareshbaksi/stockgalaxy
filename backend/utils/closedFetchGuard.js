const CLOSED_FETCH_COOLDOWN_MS =
  Number.parseInt(process.env.CLOSED_FETCH_COOLDOWN_MS || '600000', 10) || 600000;

const lastClosedFetchAttempt = new Map();

const canAttemptClosedFetch = (key) => {
  const lastAttempt = lastClosedFetchAttempt.get(key) || 0;
  return Date.now() - lastAttempt >= CLOSED_FETCH_COOLDOWN_MS;
};

const markClosedFetchAttempt = (key) => {
  lastClosedFetchAttempt.set(key, Date.now());
};

module.exports = {
  canAttemptClosedFetch,
  markClosedFetchAttempt,
};
