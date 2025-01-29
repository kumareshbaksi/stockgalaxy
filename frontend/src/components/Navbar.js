import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import $ from "jquery";
import "select2";
import "select2/dist/css/select2.css";
import UserProfile from "./UserProfile";
import { UserContext } from "../Context/UserContext";
import "../styles/Navbar.css";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import * as XLSX from "xlsx";
import sectorsFile from "../assets/UniqueSectors.xlsx";
import { FaChartBar } from "react-icons/fa"; // Import icons
import apiService from "../services/apiService";

const Navbar = ({
  setSelectedIndex,
  selectedExchange,
  setSelectedExchange,
  currentPage,
  totalPages,
  setCurrentPage,
  countdownHome,
  countdownWatchlist,
  onSearch,
}) => {
  const { user } = useContext(UserContext); // Access user context
  const location = useLocation(); // Get current path

  const [stockIndexes, setStockIndexes] = useState([
    { id: "NIFTY_50", text: "NIFTY 50" },
    { id: "SENSEX", text: "SENSEX" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false); // Profile popup state
  const [defaultPortfolioId, setDefaultPortfolioId] = useState('');

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

  useEffect(() => {
    const fetchStockIndexes = async () => {
      try {
        const response = await fetch(sectorsFile); // Use the imported file
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // Read the workbook
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        // Extract the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Map and transform the sectors
        const additionalSectors = sheetData.map((row) => ({
          id: row.SECTOR.replace(/ /g, "_").replace(/\//g, "-"),
          text: row.SECTOR,
        }));

        // Update state with stock indexes
        setStockIndexes(additionalSectors);
      } catch (error) {
        console.error("Error fetching stock indexes from XLSX file:", error.message);
      }
    };

    fetchStockIndexes();
  }, []);

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
          <div className="countdown-timer">{countdownWatchlist}s</div>
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
          <div className="countdown-timer">{countdownHome}s</div>
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
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  fontSize: "1.2rem", // Adjust the size of the arrow
                }}
              >
                <FaArrowLeft />
              </button>
              <span>
                {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  fontSize: "1.2rem", // Adjust the size of the arrow
                }}
              >
                <FaArrowRight />
              </button>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  
  useEffect(() => {
      if (user) {
      const fetchSettings = async () => {
        try {
          const settings = await apiService.fetchData('/api/user/settings');
          if (settings.defaultPortfolioId) {
            console.log(settings.defaultPortfolioId)
            setDefaultPortfolioId(settings.defaultPortfolioId);
          }
        } catch (error) {
          console.error("Failed to fetch user settings:", error);
        }
      };
      
      fetchSettings();
    }
    }, []);
    
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
              <a href={`/watchlist?portfolioid=${defaultPortfolioId}`} title="Go to Default Portfolio">
                <FaChartBar />
              </a>
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
