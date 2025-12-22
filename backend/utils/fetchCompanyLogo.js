// Utility to return a Clearbit logo URL for a company domain.
const fetchCompanyLogo = async (domain) => {
  if (!domain || typeof domain !== 'string') {
    return null;
  }

  const trimmed = domain.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname) {
      return null;
    }
    // Return URL without server-side validation; client will fetch it.
    return `https://logo.clearbit.com/${parsed.hostname}`;
  } catch (error) {
    return null;
  }
};

module.exports = fetchCompanyLogo;
