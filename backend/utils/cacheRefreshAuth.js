const getCacheRefreshToken = () => process.env.CACHE_REFRESH_TOKEN || '';

const isRefreshRequested = (req) => {
  const raw = String(req.query.refresh || req.query.force || '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
};

const isCacheRefreshAuthorized = (req) => {
  const token = getCacheRefreshToken();
  if (!token) {
    return false;
  }
  const headerToken = req.get('x-cache-refresh-token') || '';
  return headerToken === token;
};

const shouldForceRefresh = (req) => isRefreshRequested(req) && isCacheRefreshAuthorized(req);

module.exports = {
  shouldForceRefresh,
};
