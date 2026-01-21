import React, { useState, useEffect } from "react";
import apiService from "../services/apiService"; // Centralized API service
import "../styles/Footer.css"; // Add CSS styling for the footer
import { FaCodeBranch } from "react-icons/fa";

const Footer = () => {
  const [niftyData, setNiftyData] = useState(null);
  const [sensexData, setSensexData] = useState(null);
  const [bankNiftyData, setBankNiftyData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const fetchLiveData = async () => {
    try {
      const [nifty, sensex, bankNifty] = await Promise.all([
        apiService.fetchData("/api/live-index/nifty50"),
        apiService.fetchData("/api/live-index/sensex"),
        apiService.fetchData("/api/live-index/banknifty"),
      ]);

      setNiftyData({
        price: nifty.price,
        change: nifty.change,
        changePercent: nifty.changePercent,
      });

      setSensexData({
        price: sensex.price,
        change: sensex.change,
        changePercent: sensex.changePercent,
      });

      setBankNiftyData({
        price: bankNifty.price,
        change: bankNifty.change,
        changePercent: bankNifty.changePercent,
      });
    } catch (error) {
      console.error("Error fetching live index data:", error);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Check if device width is mobile
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderIndexData = (label, data) => (
    <p>
      <strong>{label}:</strong>{" "}
      {data ? (
        <>
          {data.price.toFixed(2)} (
          <span style={{ color: data.change > 0 ? "green" : "red" }}>
            {data.change.toFixed(2)} / {data.changePercent.toFixed(2)}%
          </span>
          )
        </>
      ) : (
        "Loading..."
      )}
    </p>
  );

  return (
    <footer className="footer">
      <p className="footer-text">© 2025 stockgalaxy.in. All rights reserved.</p>
      <div className="footer-live-data">
        {isMobile ? (
          <>
            {renderIndexData("NIFTY 50", niftyData)}
            <button
              className="footer-more-button"
              onClick={() => setShowPopup(true)}
            >
              + 2 More
            </button>
            {showPopup && (
              <div className="footer-popup">
                <div className="popup-content">
                  <button
                    className="popup-close"
                    onClick={() => setShowPopup(false)}
                  >
                    &times;
                  </button>
                  <ul className="popup-list">
                    <li>{renderIndexData("SENSEX", sensexData)}</li>
                    <li>{renderIndexData("BANK NIFTY", bankNiftyData)}</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {renderIndexData("NIFTY 50", niftyData)}
            {renderIndexData("SENSEX", sensexData)}
            {renderIndexData("BANK NIFTY", bankNiftyData)}
          </>
        )}
      </div>
      <p className="git-version">
        <a
          href="https://github.com/kumareshbaksi/stockgalaxy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <FaCodeBranch /> v1.1.0
        </a>
      </p>
    </footer>
  );
};

export default Footer;
