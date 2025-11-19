const axios = require('axios');

// Utility to fetch company logo using Clearbit Logo API
const fetchCompanyLogo = async (domain) => {
  try {
    const sanitizedDomain = domain.trim().replace(/\/+$/, ''); // Clearbit rejects trailing slashes
    const logoUrl = `https://logo.clearbit.com/${sanitizedDomain}`;
    const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      // Return logo URL if reachable.
      return logoUrl;
    }
    return null;
  } catch (error) {
    // Return null if logo is not found.
    return null;
  }
};

module.exports = fetchCompanyLogo;
