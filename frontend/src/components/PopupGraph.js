import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiService from "../services/apiService"; // Import centralized API service

const PopupGraph = ({ stockName, suffix, onClose }) => {
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("1m"); // Default timeframe: 1M
  const popupRef = useRef(null); // Ref for the popup container

  // Determine exchange based on suffix
  const exchange =
    suffix === "NS" ? "NSE" : suffix === "BO" ? "BSE" : "Unknown";

  const fetchGraphData = async (period) => {
    try {
      setLoading(true);
      const data = await apiService.fetchData(
        `/api/stock/history/${stockName}?period=${period}&suffix=${suffix}`
      );
      setGraphData(data.data || []);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData(timeframe);
  }, [stockName, suffix, timeframe]);

  // Handle clicks outside the popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose(); // Dismiss the modal
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={popupRef} // Attach ref to the popup container
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)", // Center the popup
        width: "90%", // Adjust for smaller screens
        maxWidth: "600px", // Limit the width for larger screens
        height: "50%", // Adjust to fit the screen
        maxHeight: "90%", // Limit height for larger screens
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "white",
        zIndex: 1000,
        borderRadius: "10px",
        padding: "20px",
        overflow: "auto",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Add shadow for better aesthetics
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem", // Responsive font size
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        {stockName} ({exchange})
      </h2>
      <div
        style={{
          marginBottom: "20px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: "10px", // Add space between buttons
          flexWrap: "wrap", // Wrap buttons for small screens
        }}
      >
        <button
          onClick={() => setTimeframe("1m")}
          disabled={timeframe === "1m"}
          style={{
            backgroundColor: timeframe === "1m" ? "gray" : "white",
            color: timeframe === "1m" ? "white" : "black",
            margin: "5px", // Reduced margin for mobile
            padding: "8px 12px", // Adjust padding for mobile
            border: "none",
            borderRadius: "5px",
            cursor: timeframe === "1m" ? "not-allowed" : "pointer",
          }}
        >
          1M
        </button>
        <button
          onClick={() => setTimeframe("1y")}
          disabled={timeframe === "1y"}
          style={{
            backgroundColor: timeframe === "1y" ? "gray" : "white",
            color: timeframe === "1y" ? "white" : "black",
            margin: "5px",
            padding: "8px 12px",
            border: "none",
            borderRadius: "5px",
            cursor: timeframe === "1y" ? "not-allowed" : "pointer",
          }}
        >
          1Y
        </button>
        <button
          onClick={() => setTimeframe("5y")}
          disabled={timeframe === "5y"}
          style={{
            backgroundColor: timeframe === "5y" ? "gray" : "white",
            color: timeframe === "5y" ? "white" : "black",
            margin: "5px",
            padding: "8px 12px",
            border: "none",
            borderRadius: "5px",
            cursor: timeframe === "5y" ? "not-allowed" : "pointer",
          }}
        >
          5Y
        </button>
      </div>
      {loading ? (
        <p style={{ textAlign: "center" }}>Loading graph...</p>
      ) : (
        <ResponsiveContainer width="100%" height="60%">
          <LineChart data={graphData}>
            <XAxis
              dataKey="date"
              tickFormatter={(tick) => tick}
              tick={{ fontSize: "0.8rem" }} // Adjust tick size for smaller screens
            />
            <YAxis tick={{ fontSize: "0.8rem" }} />
            <Tooltip
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: "#ffffff", // Background color
                border: "1px solid #cccccc", // Border color
                borderRadius: "8px", // Rounded corners
                padding: "10px", // Padding inside the tooltip
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", // Subtle shadow
              }}
              itemStyle={{
                color: "#333333", // Text color for items
                fontSize: "0.9rem", // Font size for items
              }}
              labelStyle={{
                color: "#555555", // Text color for the label
                fontSize: "1rem", // Font size for the label
                fontWeight: "bold", // Bold label text
              }}
            />
            <Line
              type="monotone"
              dataKey="close"
              name="Price"
              stroke="#82ca9d"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "transparent", // Transparent background
          color: "red",
          border: "none",
          fontSize: "1.5rem", // Larger font size for visibility
          fontWeight: "bold",
          cursor: "pointer",
          padding: "5px",
        }}
      >
        &times; {/* Cross symbol */}
      </button>
    </div>
  );
};

export default PopupGraph;
