const getWindowOrigin = () => {
  if (typeof window === "undefined") {
    return "https://stockgalaxy.in";
  }
  return window.location.origin;
};

const config = {
  API_BASE_URL:
    process.env.REACT_APP_API_BASE_URL ||
    (process.env.NODE_ENV === "production"
      ? getWindowOrigin()
      : "http://localhost:5000"),
};

export default config;
