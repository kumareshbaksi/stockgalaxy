import config from "./config";

const checkUserStatus = async () => {
  try {
    const response = await fetch(`${config.API_BASE_URL}/api/status`, {
      method: "GET",
      credentials: "include", // Include cookies in the request
    });

    if (!response.ok) {
      const errorData = await response.json();
      window.location.href = "/logout";
      throw new Error(
        `Failed to check status: ${response.statusText} - ${errorData.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in authService checkUserStatus:", error);
    throw error;
  }
};

export default checkUserStatus;
