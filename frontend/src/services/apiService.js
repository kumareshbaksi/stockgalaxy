import config from "./config";

const fetchData = async (endpoint, method = "GET", body = null) => {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${config.API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      // Handle specific HTTP status codes for redirection
      if (response.status === 401 || response.status === 403) {
        // If the user is not authorized, redirect to the login page
        window.location.href = "/";
      }
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in ApiService:", error);
    // Redirect to the login page if an error occurs
    throw error; // Re-throw the error for additional handling if needed
  }
};

export default {
  fetchData,
};
