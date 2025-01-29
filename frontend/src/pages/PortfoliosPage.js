import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import LoadingBar from "react-top-loading-bar";
import apiService from "../services/apiService";
import "../styles/PortfoliosPage.css";

const PortfoliosPage = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [error, setError] = useState("");
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "updatedAt", direction: "desc" }); // Sorting config
  const loadingRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false); // Added loading state

  const isMounted = useRef(true);

  useEffect(() => {
    fetchPortfolios();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetState = (action) => {
    if (isMounted.current) {
      action();
    }
  };

  const fetchPortfolios = async () => {
    setIsLoading(true); // Start loading
    if (!loadingRef.current) return;
    loadingRef.current.continuousStart();
    try {
      const response = await apiService.fetchData("/api/portfolios");
      safeSetState(() => {
        setPortfolios(response.portfolios || []);
        setIsLoading(false); // Stop loading after data is fetched
      });
    } catch (error) {
      safeSetState(() => {
        setError("Failed to fetch portfolios");
        setIsLoading(false); // Stop loading if there's an error
      });
    } finally {
      loadingRef.current.complete();
    }
  };

  // **Add Portfolio**
  const addPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      setError("Portfolio name is required.");
      return;
    }

    try {
      loadingRef.current.continuousStart();
      const response = await apiService.fetchData("/api/portfolio/create", "POST", {
        name: newPortfolioName,
        stocks: [],
      }, true);

      // Add the new portfolio at the top of the list
      setPortfolios([response.portfolio, ...portfolios]);
      setNewPortfolioName("");
    } catch (error) {
      setError("Failed to add new portfolio.");
    } finally {
      loadingRef.current.complete();
    }
  };

  const startEditing = (id, name) => {
    setEditingPortfolioId(id);
    setEditingName(name);
  };

  const updatePortfolioName = async (id) => {
    if (!editingName.trim()) {
      setError("Portfolio name cannot be empty.");
      return;
    }
    try {
      loadingRef.current.continuousStart();
      await apiService.fetchData(`/api/portfolio/update/name?id=${id}`, "PATCH", { name: editingName });
      setPortfolios(portfolios.map(p => p.id === id ? { ...p, name: editingName } : p));
      setEditingPortfolioId(null);
    } catch (error) {
      setError("Failed to update portfolio name.");
    } finally {
      loadingRef.current.complete();
    }
  };

  const requestDeletePortfolio = (id) => {
    setSelectedPortfolioId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      loadingRef.current.continuousStart();
      await apiService.fetchData(`/api/portfolio/delete?id=${selectedPortfolioId}`, "DELETE");
      setPortfolios(portfolios.filter(p => p.id !== selectedPortfolioId));
      setShowDeleteConfirm(false);
    } catch (error) {
      setError("Failed to delete portfolio.");
    } finally {
      loadingRef.current.complete();
    }
  };

  const sortTable = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedPortfolios = [...portfolios].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setPortfolios(sortedPortfolios);
  };

  const DeleteConfirmationPopup = ({ onConfirm, onCancel }) => {
    const popupRef = useRef(null); // Reference for the popup element
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (popupRef.current && !popupRef.current.contains(event.target)) {
          onCancel();
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onCancel]);
  
    return (
      <div className="popup-overlay">
        <div className="popup-content" ref={popupRef}>
          <h2>Confirm Deletion</h2>
          <p>Are you sure you want to delete this portfolio? This process cannot be undone.</p>
          <div className="actions">
            <button onClick={onConfirm}>Delete</button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };
  

  const redirectToDashboard = (id) => {
    window.location.href = `/Dashboard?id=${id}`;
  };

  const redirectToWatchlist = (id) => {
    window.location.href = `/watchlist?portfolioid=${id}`;
  };

  return (
    <div>
      <Navbar />
      <LoadingBar ref={loadingRef} color="#00ff00" height={4} />
      <div className="portfolios-container">
        <h1>My Portfolios</h1>
        <div className="portfolio-input">
          <input
            type="text"
            placeholder="Enter portfolio name (Max 100 characters)"
            value={newPortfolioName}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                setNewPortfolioName(e.target.value);
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newPortfolioName.length > 0) {
                addPortfolio();
              }
            }}
            maxLength={100}
          />
          <button onClick={addPortfolio} disabled={newPortfolioName.length === 0}>Add Portfolio</button>
        </div>
        {error && <p className="error">{error}</p>}
  
        {isLoading ? (
          <p className="loading-message">Loading portfolios...</p>
        ) : portfolios.length === 0 ? (
          <p className="empty-message">No portfolios available. Start by adding a new portfolio!</p>
        ) : (
          <table className="portfolios-table">
            <thead>
              <tr>
                <th onClick={() => sortTable("updatedAt")}>Updated Date</th>
                <th onClick={() => sortTable("name")}>Name</th>
                <th onClick={() => sortTable("stockCount")}>Stock Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((portfolio) => (
                <tr key={portfolio.id}>
                  <td>{new Date(portfolio.updatedAt).toLocaleString()}</td>
                  <td onDoubleClick={() => startEditing(portfolio.id, portfolio.name)}>
                    {editingPortfolioId === portfolio.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => updatePortfolioName(portfolio.id)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updatePortfolioName(portfolio.id);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      portfolio.name
                    )}
                  </td>
                  <td>{portfolio.stockCount}</td>
                  <td>
                    <button className="btn-edit" onClick={() => redirectToDashboard(portfolio.id)}>Edit</button>
                    <button className="btn-view" onClick={() => redirectToWatchlist(portfolio.id)}>View</button>
                    <button className="btn-delete" onClick={() => requestDeletePortfolio(portfolio.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {showDeleteConfirm && (
          <DeleteConfirmationPopup
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </div>
  );  
  
};

export default PortfoliosPage;
