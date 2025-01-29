import React, { useEffect, useRef, useContext, useState } from "react";
import "../styles/UserProfile.css";
import { FaHome, FaSignOutAlt, FaBriefcase, FaCog } from 'react-icons/fa';
import { UserContext } from "../Context/UserContext";
import config from "../services/config";
import { useNavigate } from "react-router-dom";

const UserProfile = ({ onClose }) => {
  const { user, setUser } = useContext(UserContext);
  const popupRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // React Router Hook for navigation.
  const navigate = useNavigate();

  // **Navigate Functions**
  const goToPortfolios = () => navigate("/portfolios");
  const goToHome = () => navigate("/");
  const handleSettingsClick = () => navigate("/settings");

  // **Close Popup on Outside Click**
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // **Fetch User Details and Plan Status**
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [setUser]);

  // **Logout Function**
  const handleLogoutClick = () => {
    setUser(null); // Clear user context
    setIsLoggedIn(false); // Update logged-in state
    window.location.href = "/logout"; // Redirect to logout
  };

  // **Google Authentication**
  const handleGoogleAuth = () => {
    window.location.href = `${config.API_BASE_URL}/api/auth/google`;
  };

  return (
    <div className="user-profile-overlay">
      <div className="user-profile-popup" ref={popupRef}>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        {isLoggedIn ? (
          <>
            {/* Profile Picture */}
            <img
              src={user?.profilePicture || "/images/user-avatar.png"}
              alt="User Avatar"
              className="user-profile-avatar"
              onError={(e) => {
                e.target.src = "/images/user-avatar.png"; // Fallback image
              }}
            />
            <h2 className="user-profile-name">{user?.name || "Guest"}</h2>
            <p className="user-profile-email">{user?.email || "Not logged in"}</p>

            {/* Links Section */}
            <div className="user-profile-links">
              <button className="profile-link" onClick={goToHome}>
                <FaHome className="profile-icon" /> Home
              </button>
              <button className="portfolios-button" onClick={goToPortfolios}>
                <FaBriefcase className="profile-icon" /> Portfolios
              </button>

              <button className="settings-button" onClick={handleSettingsClick}>
                <FaCog className="profile-icon" /> Settings
              </button>

              {/* Logout Option */}
              <button className="logout-button" onClick={handleLogoutClick}>
                <FaSignOutAlt className="profile-icon" /> Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <img
              src="/images/user-avatar.png"
              alt="Default Avatar"
              className="user-profile-avatar"
            />
            <h2 className="user-profile-name">Guest</h2>
            <div className="user-profile-links">
              <button className="google-button" onClick={handleGoogleAuth}>
                <img
                  src="/images/google.png"
                  alt="Google Icon"
                  className="google-icon"
                />
                Login with Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
