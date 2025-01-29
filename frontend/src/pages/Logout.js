import React, { useEffect, useState } from "react";
import apiService from "../services/apiService"; // Centralized API service

const Logout = ({ setUser, setIsLoggedIn }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    const performLogout = async () => {
      try {

        const statusResponse = await apiService.fetchData("/api/status");
        if (!statusResponse.isLoggedIn) {
          window.location.href = "/";
        }
        // Clear local storage
        localStorage.removeItem("user");
        localStorage.removeItem("sectors");
        localStorage.removeItem("bubblePositions");
        localStorage.removeItem("authToken");

        // Send a request to the logout endpoint
        await apiService.fetchData("/api/auth/logout", "POST", {}, true);

        // Reset user state
        setUser(null);
        setIsLoggedIn(false);

        // Hard refresh to the home page
        setTimeout(() => {
          window.location.href = "/";
        }, 2000); // Allow animation to complete before redirecting
      } catch (error) {
        console.error("Error during logout:", error);

        // Redirect to the home page even if logout fails
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } finally {
        setIsLoggingOut(false); // End the animation
      }
    };

    performLogout();
  }, [setUser, setIsLoggedIn]);

  return (
    <div className={`logout-container ${isLoggingOut ? "fade-out" : ""}`}>
      <h1 class="logout">Session Expired, Logging out...</h1>
      <div className="spinner"></div>
    </div>
  );
};

export default Logout;
