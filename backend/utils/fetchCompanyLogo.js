// Utility to return a Google S2 favicon URL for a company domain.
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
    const hostname = parsed.hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      hostname
    )}&sz=128`;
  } catch (error) {
    return null;
  }
};

module.exports = fetchCompanyLogo;
