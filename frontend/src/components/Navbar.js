import React, { useContext, useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import $ from "jquery";
import "select2";
import "select2/dist/css/select2.css";
import UserProfile from "./UserProfile";
import { UserContext } from "../Context/UserContext";
import "../styles/Navbar.css";
import { FaChartBar } from "react-icons/fa"; // Import icons
import apiService from "../services/apiService";
const DEFAULT_INDEX_OPTIONS = [
  { id: "NIFTY_50", text: "NIFTY 50" },
  { id: "SENSEX", text: "SENSEX" },
  { id: "BANK_NIFTY", text: "BANK NIFTY" },
];

const Navbar = ({
  setSelectedIndex,
  selectedExchange,
  setSelectedExchange,
  onSearch,
}) => {
  const { user } = useContext(UserContext); // Access user context
  const location = useLocation(); // Get current path

  const [stockIndexes] = useState(DEFAULT_INDEX_OPTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false); // Profile popup state
  const [defaultPortfolioId, setDefaultPortfolioId] = useState('');
  const [defaultPortfolioName, setDefaultPortfolioName] = useState('');

  // useEffect(() => {
  //   const fetchStockIndexes = async () => {
  //     try {
  //       const data = await apiService.fetchData("/api/sectors", "GET");
  //       const additionalSectors = data.sectors.map((sector) => ({
  //         id: sector.replace(/ /g, "_").replace(/\//g, "-"),
  //         text: sector,
  //       }));

  //       setStockIndexes((prevIndexes) => [
  //         ...prevIndexes,
  //         ...additionalSectors,
  //       ]);
  //     } catch (error) {
  //       console.error("Error fetching stock indexes:", error.message);
  //     }
  //   };

  //   fetchStockIndexes();
  // }, []);

  // Initialize Select2 for the dropdown
  useEffect(() => {
    const $select = $("#stock-dropdown");
    $select.select2({
      data: stockIndexes,
      placeholder: "Select Stock Index",
      allowClear: false,
    });

    // Handle selection changes
    $select.on("select2:select", (e) => {
      const selectedId = e.params.data.id;
      setSelectedIndex(selectedId);
    });

    // Cleanup on unmount
    return () => {
      $select.select2("destroy");
    };
  }, [stockIndexes, setSelectedIndex]);

  const handleSearch = (e) => {
    const query = e.target.value.toUpperCase();
    setSearchQuery(query);
    onSearch(query);
  };

  const handleUserProfileClick = () => {
    setIsUserProfileOpen(true);
  };

  const renderContentBasedOnPage = () => {
    if (location.pathname === "/dashboard") {
      return null; // Only user icon is displayed on the dashboard
    }

    if (location.pathname === "/watchlist") {
      return (
        <>
          <input
            type="text"
            className="search-bar"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={handleSearch}
          />
          <div className="dropdown-container">
            <select
              className="dropdown-select"
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>
        </>
      );
    }

    if (location.pathname === "/") {
      return (
        <>
          <input
            type="text"
            className="search-bar"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={handleSearch}
          />
          <select id="stock-dropdown" style={{ width: "100%" }}></select>
          <div className="dropdown-container">
            <select
              className="dropdown-select"
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>
        </>
      );
    }

    return null;
  };

  
  useEffect(() => {
    if (!user) {
      setDefaultPortfolioId('');
      setDefaultPortfolioName('');
      return;
    }

    const cachedId = localStorage.getItem('defaultPortfolioId');
    const cachedName = localStorage.getItem('defaultPortfolioName');
    if (cachedId) {
      setDefaultPortfolioId(cachedId);
      setDefaultPortfolioName(cachedName || 'My Watchlist');
    }

    const fetchSettings = async () => {
      try {
        const settings = await apiService.fetchData('/api/user/settings');
        if (settings.defaultPortfolioId) {
          setDefaultPortfolioId(settings.defaultPortfolioId);
          setDefaultPortfolioName(settings.defaultPortfolioDetails?.name || 'My Watchlist');
          localStorage.setItem('defaultPortfolioId', settings.defaultPortfolioId);
          localStorage.setItem('defaultPortfolioName', settings.defaultPortfolioDetails?.name || 'My Watchlist');
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
      }
    };

    fetchSettings();
  }, [user]);
    
  return (
    <nav className="navbar">
      <div className="nav-container">
        <a href="/" className="logo">
          <span className="green">Stock </span>
          <span className="red">Galaxy</span>
        </a>
        {location.pathname !== "/dashboard" && (
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? "✖" : "☰"}
          </button>
        )}
        <div
          className={`search-nav-container ${
            mobileMenuOpen ? "mobile-menu-open" : ""
          }`}
        >
          {renderContentBasedOnPage()}
          {user && defaultPortfolioId && (
            <div className="shortcut-icons">
              <Link
                to={`/watchlist?portfolioid=${defaultPortfolioId}`}
                className="portfolio-shortcut"
                title={`Open ${defaultPortfolioName || 'default portfolio'}`}
              >
                <FaChartBar />
                <span>{defaultPortfolioName || 'My Watchlist'}</span>
              </Link>
            </div>
          )}
          <div className="user-icon-container">
            <img
              src={user?.profilePicture || "/images/user-avatar.png"}
              height="40px"
              width="40px"
              alt="User Avatar"
              className="user-avatar clickable"
              onClick={handleUserProfileClick}
              onError={(e) => {
                e.target.src = "/images/user-avatar.png"; // Fallback image
              }}
            />
          </div>
        </div>
      </div>
      {isUserProfileOpen && (
        <UserProfile onClose={() => setIsUserProfileOpen(false)} />
      )}
    </nav>
  );
};

export default Navbar;
