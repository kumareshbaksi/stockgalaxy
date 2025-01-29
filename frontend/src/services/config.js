const config = {
  API_BASE_URL:
    process.env.NODE_ENV === "production"
      ? "https://stockgalaxy.in" // Production URL
      : "http://localhost:5000", // Local URL
};

export default config;
