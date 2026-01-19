import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [loading, setLoading] = useState(false); // Track loading state
  const loadingBarRef = useRef(null);
  const [highlightedStock, setHighlightedStock] = useState(null);
  const refreshIntervalRef = useRef(null);

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
        } else if (selectedIndex === "BANK_NIFTY") {
          endpoint = `/api/index/banknifty?suffix=${suffix}`;
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
      }
    },
    [selectedIndex, selectedExchange]
  );

  useEffect(() => {
    fetchStockData(true);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    refreshIntervalRef.current = setInterval(() => {
      fetchStockData(true);
    }, 20000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchStockData]);

  return (
    <>
      <LoadingBar color="#00ff00" height={4} ref={loadingBarRef} />
      <Navbar
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        selectedExchange={selectedExchange}
        setSelectedExchange={setSelectedExchange}
        onSearch={handleSearch}
      />
      <div className="bubble-chart-container">
        <Bubble data={stockData} highlightedStock={highlightedStock} />
      </div>
      <Footer />
    </>
  );
};

export default BubbleChart;
