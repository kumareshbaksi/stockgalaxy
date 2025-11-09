import React, { useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { Button, MenuItem } from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import { Link } from "react-router-dom";
import LoadingBar from "react-top-loading-bar";
import Navbar from "../components/Navbar";
import GeneralFooter from "../components/GeneralFooter";
import "../styles/Dashboard.css";
import { UserContext } from "../Context/UserContext";
import apiService from "../services/apiService";

const Dashboard = () => {
  const { user, setUser } = useContext(UserContext);
  const [portfolioId, setPortfolioId] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [portfolioName, setPortfolioName] = useState("");
  const [stockDetails, setStockDetails] = useState({});
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadingBarRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get("id");
    if (id) {
      setPortfolioId(id);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const statusResponse = await apiService.fetchData("/api/status");
        if (statusResponse.isLoggedIn) {
          const userData = await apiService.fetchData("/api/user");
          setUser({
            name: userData.name,
            email: userData.email,
            profilePicture: userData.profilePicture,
          });
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          navigate("/logout");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
      } finally {
        setIsUserLoading(false);
      }
    };

    checkLoginStatus();
  }, [navigate, setUser]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (isUserLoading) return;
      loadingBarRef.current.continuousStart();
      setIsLoading(true);
      try {
        const [stockData, watchlistData] = await Promise.all([
          fetchStocks(),
          fetchWatchlist(),
        ]);
        const stockMap = stockData.reduce((acc, stock) => {
          acc[stock.symbol] = stock.companyName;
          return acc;
        }, {});
        setStockDetails(stockMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        loadingBarRef.current.complete();
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [navigate, isUserLoading]);

  const fetchStocks = async () => {
    try {
      const response = await apiService.fetchData("/api/stocks/all");
      if (!response?.data || !Array.isArray(response.data)) {
        throw new Error("Unexpected response format for stock list");
      }
      setStocks(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching stocks from API:", error);
      setStocks([]);
      return [];
    }
  };

  const fetchWatchlist = async () => {
    try {
      const data = await apiService.fetchData(`/api/portfolio/stocks?portfolioid=${portfolioId}&suffix=NS`);
      if (data.portfolioName) {
        setPortfolioName(data.portfolioName);
      }
      if (Array.isArray(data.stocks)) {
        const symbols = data.stocks.map((stock) => stock.symbol);
        setSelectedStocks(symbols);
        return data.stocks;
      } else {
        console.error("Unexpected API response format for watchlist stocks");
        setSelectedStocks([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching watchlist stocks:", error);
      setSelectedStocks([]);
      return [];
    }
  };

  const handleStockSelect = async (stock) => {
    if (!selectedStocks.includes(stock.symbol)) {
      const updatedStocks = [stock.symbol, ...selectedStocks];
      loadingBarRef.current.continuousStart();
      setIsLoading(true);
      try {
        await updateWatchlist(updatedStocks);
      } catch (error) {
        console.error("Error updating watchlist during selection:", error);
      } finally {
        loadingBarRef.current.complete();
        setIsLoading(false);
      }
    }
  };

  const handleStockRemove = async (stock) => {
    const updatedStocks = selectedStocks.filter((s) => s !== stock);
    loadingBarRef.current.continuousStart();
    setIsLoading(true);
    try {
      await updateWatchlist(updatedStocks);
    } catch (error) {
      console.error("Error updating watchlist during removal:", error);
    } finally {
      loadingBarRef.current.complete();
      setIsLoading(false);
    }
  };

  const updateWatchlist = async (updatedStocks) => {
    try {
      const response = await apiService.fetchData(`/api/portfolio/update?portfolioid=${portfolioId}`, "POST", { stocks: updatedStocks });
      const updatedSymbols = response.portfolio.stocks.map((stock) => stock.symbol);
      setSelectedStocks(updatedSymbols);
    } catch (error) {
      console.error("Error updating watchlist:", error);
    }
  };

  const filterStock = (query, stock) => {
    const normalizedQuery = query.toLowerCase();
    const companyName = stock.companyName ? stock.companyName.toLowerCase() : "";
    const symbol = stock.symbol ? stock.symbol.toLowerCase() : "";
    return companyName.includes(normalizedQuery) || symbol.includes(normalizedQuery);
  };

  const renderStock = (stock, { handleClick }) => (
    <MenuItem key={stock.symbol} text={`${stock.companyName} (${stock.symbol})`} onClick={handleClick} />
  );

  if (isUserLoading) {
    return (
      <div className="fullscreen-loader">
        <LoadingBar ref={loadingBarRef} color="#00ff00" height={4} />
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="root" className="dashboard">
      <LoadingBar ref={loadingBarRef} color="#00ff00" height={4} />
      <Navbar />
      <div className="dashboard-container">
        <h1>Manage Your <span className="red">{portfolioName || "Loading..."}</span> Portfolio</h1>
        {user?.email && <p>Logged in as: {user.email}</p>}
        <div className="stocks-selection">
          <div className="select-form">
            {stocks.length > 0 ? (
              isLoading ? (
                <div className="loading-indicator">Loading...</div>
              ) : (
                <Select2 items={stocks} itemRenderer={renderStock} onItemSelect={handleStockSelect} disabled={isLoading} itemPredicate={filterStock} filterable>
                  <Button text="Select a stock" rightIcon="double-caret-vertical" />
                </Select2>
              )
            ) : (
              <p className="no-stocks-message">Stocks are not available</p>
            )}
            <Link to={`/watchlist?portfolioid=${portfolioId}`} className={`my-watchlist ${isLoading ? "disabled-link" : ""}`}>Open {portfolioName || "Loading..."}</Link>
          </div>
          <div className="selected-stocks-list">
            {selectedStocks.length > 0 ? (
              <ul>
                {selectedStocks.map((stock, index) => (
                  <li key={index} title={stockDetails[stock] || stock}>
                    {stock}
                    <button className="red-cross" onClick={() => handleStockRemove(stock)}>✖</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-selected-stocks">
                {isLoading ? "Fetching your watchlist... ⏳" : "Watchlist is empty. Add stocks to get started!"}
              </p>
            )}
          </div>
        </div>
      </div>
      <GeneralFooter />
    </div>
  );
};

export default Dashboard;
