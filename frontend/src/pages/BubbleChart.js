import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Bubble from "../components/Bubble";
import LoadingBar from "react-top-loading-bar";
import apiService from "../services/apiService";
import "../styles/Footer.css";
import "../styles/Navbar.css";

const BubbleChart = () => {
  const [selectedIndex, setSelectedIndex] = useState("NIFTY_50"); // Default stock index
  const [selectedExchange, setSelectedExchange] = useState("NSE"); // Default exchange
  const [stockData, setStockData] = useState([]); // Holds the bubble data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30); // Dynamically adjusted
  const [countdown, setCountdown] = useState(20); // Countdown timer for refresh
  const [loading, setLoading] = useState(false); // Track loading state
  const loadingBarRef = useRef(null);
  const [highlightedStock, setHighlightedStock] = useState(null);
  const countdownRef = useRef(null); // Ref for countdown interval

  const handleSearch = (query) => {
    if (!query.trim()) {
      setHighlightedStock(null);
      return;
    }
  
    // Ensure case-insensitive comparison and match all stocks starting with the query
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

  const fetchStockData = useCallback(
    async (showProgress = false) => {
      try {
        if (showProgress) {
          setLoading(true);
          if (loadingBarRef.current) {
            loadingBarRef.current.continuousStart();
          }
        }

        let endpoint = "";
        const suffix = selectedExchange === "NSE" ? "NS" : "BO";

        if (selectedIndex === "NIFTY_50") {
          endpoint = `/api/index/nifty50?suffix=${suffix}`;
        } else if (selectedIndex === "SENSEX") {
          endpoint = `/api/index/sensex?suffix=${suffix}`;
        } else {
          endpoint = `/api/sector/${selectedIndex}?suffix=${suffix}`;
        }

        const data = await apiService.fetchData(endpoint);

        const formattedData = data
          .filter((stock) => stock.price !== null && stock.change !== null)
          .map((stock) => ({
            name: stock.symbol?.replace(".NS", "").replace(".BO", "") || "Unknown",
            change: stock.change || 0,
            logoUrl: stock.logo,
            suffix: stock.suffix || "",
            price: stock.price || 0,
          }));

        setStockData(formattedData);
      } catch (error) {
        console.error(`Error fetching ${selectedIndex} data:`, error);
      } finally {
        if (showProgress) {
          setLoading(false);
          if (loadingBarRef.current) {
            loadingBarRef.current.complete();
          }
        }
        startCountdown(); // Start countdown when data is loaded
      }
    },
    [selectedIndex, selectedExchange]
  );

  const startCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current); // Clear any existing intervals
    }

    setCountdown(20); // Reset the countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          fetchStockData(true); // Fetch new data when countdown ends
          return 20; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    fetchStockData(true);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current); // Cleanup interval on unmount
      }
    };
  }, [fetchStockData]);

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
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        selectedExchange={selectedExchange}
        setSelectedExchange={setSelectedExchange}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        countdownHome={countdown}
        onSearch={handleSearch}
      />
      <div className="bubble-chart-container">
        <Bubble data={paginatedData} highlightedStock={highlightedStock} />
      </div>
      <Footer />
    </>
  );
};

export default BubbleChart;
