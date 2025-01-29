import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import LoadingBar from "react-top-loading-bar";
import apiService from "../services/apiService";
import "../styles/Dashboard.css";
import "../styles/Settings.css"; // Ensure this contains the updated CSS styles
import axios from "axios"; // Ensure axios is imported

const Dashboard = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [defaultPortfolio, setDefaultPortfolio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    fetchPortfolios();
  }, []);

  const fetchSettings = async () => {
    try {
      const settings = await apiService.fetchData("/api/user/settings");
      if (settings.defaultPortfolioId) {
        setDefaultPortfolio(settings.defaultPortfolioId);
      }
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
    }
  };

  const fetchPortfolios = async () => {
    loadingRef.current.continuousStart();
    try {
      const response = await apiService.fetchData("/api/portfolios");
      setPortfolios(response.portfolios || []);
    } catch (error) {
      console.error("Failed to fetch portfolios:", error);
    } finally {
      loadingRef.current.complete();
      setIsLoading(false);
    }
  };

  const handlePortfolioChange = async (event) => {
    const newDefaultPortfolio = event.target.value;
    setDefaultPortfolio(newDefaultPortfolio);
    updateDefaultPortfolio(newDefaultPortfolio);
  };

  const updateDefaultPortfolio = async (portfolioId) => {
    try {
      const response = await apiService.fetchData(
        "/api/user/default-portfolio",
        "POST",
        { portfolioId }
      );

      // Check if the HTTP response status code is 200
      if (response) {
        // Since the endpoint specifically returns success via status code,
        // you can assume success if the status is 200 and then refresh the page
        console.log("Refreshing page to reflect changes...");
        window.location.reload();
      } else {
        console.log(
          `Failed to update default portfolio: HTTP status ${response.status}`
        );
      }
    } catch (error) {
      console.error("Failed to update default portfolio:", error.message);
    }
  };

  const baseURL = process.env.NODE_ENV === 'production' ? 'https://stockgalaxy.in' : 'http://localhost:5000';

  const handleDownloadInvoice = async (transactionId) => {
    try {
      const response = await axios({
        url: `${baseURL}/api/payments/invoices/download/${transactionId}`,
        method: "GET",
        responseType: "blob", // Force to receive data in a Blob Format
        withCredentials: true, // Include cookies in the request
      });

      const file = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${transactionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      console.log("Download initiated successfully!");
    } catch (error) {
      console.error("Failed to download invoice:", error);
    }
  };

  // Function to calculate the end date based on the plan type
  const calculateEndDate = (startDate, planType) => {
    const date = new Date(startDate);
    if (planType === "monthly") {
      date.setMonth(date.getMonth() + 1);
    } else if (planType === "yearly") {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toLocaleDateString(); // Returns the date as a string in local date format
  };

  return (
    <div id="root" className="dashboard">
      <LoadingBar ref={loadingRef} color="#00ff00" height={4} />
      <Navbar />
      <div className="dashboard-content">
        <h1>Settings</h1>
        <h3>Set Portfolio Shortcut</h3>
        {isLoading ? (
          <p className="loading-message">Loading...</p>
        ) : (
          <>
            {portfolios.length > 0 ? (
              <form className="portfolio-form">
                <label htmlFor="defaultPortfolio">Choose a portfolio:</label>
                <select
                  id="defaultPortfolio"
                  value={defaultPortfolio}
                  onChange={handlePortfolioChange}
                  disabled={isLoading}
                  className="select-portfolio"
                >
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </form>
            ) : (
              <p className="empty-message">No portfolios available.</p>
            )}
          </>
        )}
      </div>
    </div>
  );  
};

export default Dashboard;
