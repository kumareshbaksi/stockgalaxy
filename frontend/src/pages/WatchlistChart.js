import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import LoadingBar from "react-top-loading-bar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Bubble from "../components/Bubble";
import checkUserStatus from "../services/authService";
import apiService from "../services/apiService";
import "../styles/Navbar.css";
import "../styles/WatchListChart.css";

const WatchListChart = () => {
  const [selectedIndex] = useState("WATCHLIST");
  const [portfolioId, setPortfolioId] = useState(null); // State to store the portfolio ID
  const [selectedExchange, setSelectedExchange] = useState("NSE");
  const [stockData, setStockData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [countdown, setCountdown] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const loadingBarRef = useRef(null);
  const [highlightedStock, setHighlightedStock] = useState(null);
  const countdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

    useEffect(() => {
      // Function to parse query parameters
      const queryParams = new URLSearchParams(location.search);
      const id = queryParams.get('portfolioid'); // Get the 'id' query parameter
      if (id) {
        setPortfolioId(id); // Set the portfolio ID if available
      } else {
        navigate('/'); // Redirect if ID is not found
      }
    }, [location, navigate]);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const data = await checkUserStatus();
        if (!data.isLoggedIn) {
          navigate("/logout");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };

    checkUserLoggedIn();
  }, [navigate]);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setHighlightedStock(null);
      return;
    }

    const matchingStocks = stockData.filter((stock) =>
      stock.name?.toLowerCase().startsWith(query.toLowerCase())
    );

    setHighlightedStock(matchingStocks.length > 0 ? matchingStocks : null);
  };

  const updateItemsPerPage = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1200) {
      setItemsPerPage(25);
    } else if (width >= 768) {
      setItemsPerPage(20);
    } else {
      setItemsPerPage(15);
    }
  }, []);

  useEffect(() => {
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, [updateItemsPerPage]);

  const fetchWatchlistData = useCallback(
    async (showProgress = false, suffix = "NS") => {
      if (!portfolioId) {
        console.error("Invalid portfolioId: ", portfolioId);
        return; // Exit the function if portfolioId is null
      }
  
      try {
        if (showProgress && loadingBarRef.current) {
          loadingBarRef.current.continuousStart();
        }
  
        const data = await apiService.fetchData(
          `/api/portfolio/stocks?portfolioid=${portfolioId}&suffix=${suffix}`,
          "GET",
          null,
          true
        );
  
        const enrichedData = (data.stocks || []).map((stock) => ({
          name: stock.symbol,
          change: stock.changePercent || 0,
          logoUrl: stock.logo || null,
          suffix: stock.suffix || null,
        }));
  
        setStockData(enrichedData);
      } catch (error) {
        console.error("Error fetching watchlist data:", error);
      } finally {
        if (showProgress && loadingBarRef.current) {
          loadingBarRef.current.complete();
        }
      }
    },
    [portfolioId] // Added portfolioId as a dependency for useCallback
  );
  
  useEffect(() => {
    if (selectedIndex === "WATCHLIST") {
      setIsLoading(true);
      fetchWatchlistData(true, selectedExchange) // Pass the `selectedExchange` as the suffix
        .then(() => setIsLoading(false))
        .catch((error) => {
          console.error("Error during data fetch:", error);
          setIsLoading(false);
        });
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [fetchWatchlistData, selectedIndex, selectedExchange]);

  const paginatedData = useMemo(
    () =>
      stockData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [stockData, currentPage, itemsPerPage]
  );

  const totalPages = Math.ceil(stockData.length / itemsPerPage);

  return (
    <>
      <LoadingBar color="#00ff00" height={4} ref={loadingBarRef} />
      <Navbar
        selectedExchange={selectedExchange}
        setSelectedExchange={setSelectedExchange}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        countdownWatchlist={countdown}
        onSearch={handleSearch}
      />
      <div className="bubble-chart-container">
        {isLoading ? (
          <div className="no-stocks-message">
            <p>
              Loading data... <span role="img" aria-label="loading">⏳</span>
            </p>
          </div>
        ) : stockData.length > 0 ? (
          <Bubble data={paginatedData} highlightedStock={highlightedStock} />
        ) : (
          <div className="no-stocks-message">
            <p>No stocks in your watchlist. Please add stocks to get started.</p>
            <Link to="/portfolios" className="dashboard-link">
              Go to Portfolio
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default WatchListChart;
