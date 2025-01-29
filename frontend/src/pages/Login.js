import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import checkUserStatus from "../services/authService"; // Import the auth service
import config from "../services/config"; // Import the config for dynamic base URL

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const data = await checkUserStatus(); // Check if the user is logged in
        if (data.isLoggedIn) {
          navigate("/dashboard"); // Redirect to dashboard if logged in
        }
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };

    checkUserLoggedIn();
  }, [navigate]);

  const handleGoogleAuth = () => {
    window.location.href = `${config.API_BASE_URL}/api/auth/google`; // Redirect to Google OAuth
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <button className="google-button" onClick={handleGoogleAuth}>
          <img
            src="/images/google.png"
            alt="Google Icon"
            className="google-icon"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
