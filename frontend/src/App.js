import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BubbleChart from "./pages/BubbleChart";
import Dashboard from "./pages/Dashboard";
import WatchlistChart from "./pages/WatchlistChart";
import SettingsPage from "./pages/SettingsPage";
import Logout from "./pages/Logout";
import GoogleAnalytics from "./pages/GoogleAnalystics";
import ContactUs from "./pages/ContactUs";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import "./styles/Layout.css";
import { UserContext } from "./Context/UserContext"; // Context for managing user data
import { Helmet } from "react-helmet"; // Import react-helmet
import PortfoliosPage from './pages/PortfoliosPage';

function App() {
  const [user, setUser] = useState(() => {
    // Load user data from local storage
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Router>
        <div>
          <Routes>
            <Route path="/" element={<HomeWithHelmet />} />
            <Route path="/dashboard" element={<DashboardWithHelmet />} />
            <Route path="/watchlist" element={<WatchlistChartWithHelmet />} />
            <Route path="/logout" element={<LogoutWithHelmet />} />
            <Route path="/contact-us" element={<ContactUsWithHelmet />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsWithHelmet />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyWithHelmet />} />
            <Route path="/portfolios" element={<PortfoliosPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </Router>
    </UserContext.Provider>
  );
}

function HomeWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Stock Galaxy | Visualize Indian Market Trends</title>
        <meta
          name="description"
          content="Explore Indian stock market trends with dynamic bubble charts, filters, and a personalized dashboard. Start visualizing the market like never before!"
        />
        <meta
          name="keywords"
          content="Stock Galaxy, Indian Market, Bubble Charts, NIFTY50, SENSEX, Stock Watchlist, Visual Market Trends"
        />
        <meta property="og:title" content="Stock Galaxy | Visualize Indian Market Trends" />
        <meta
          property="og:description"
          content="Revolutionize how you experience the Indian stock market with dynamic visuals, filtering, and dashboards."
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta property="og:url" content="https://stockgalaxy.in/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Stock Galaxy | Visualize Indian Market Trends" />
        <meta
          name="twitter:description"
          content="Explore Indian stock market trends with dynamic visuals and personalized dashboards."
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </Helmet>
      <BubbleChart />
    </>
  );
}

function DashboardWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Dashboard | Stock Galaxy</title>
        <meta
          name="description"
          content="Access a clean and personalized dashboard tailored to your investment goals and stay ahead in the stock market."
        />
      </Helmet>
      <Dashboard />
    </>
  );
}

function WatchlistChartWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Watchlist | Stock Galaxy</title>
        <meta
          name="description"
          content="Seamlessly manage and monitor your favorite stocks with a personalized watchlist on Stock Galaxy."
        />
      </Helmet>
      <WatchlistChart />
    </>
  );
}

function LogoutWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Logging Out | Stock Galaxy</title>
        <meta
          name="description"
          content="Session expired. Logging you out securely from Stock Galaxy."
        />
      </Helmet>
      <Logout />
    </>
  );
}

function ContactUsWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Contact Us | Stock Galaxy</title>
        <meta
          name="description"
          content="Need assistance? Reach out to us through our contact page at Stock Galaxy."
        />
      </Helmet>
      <ContactUs />
    </>
  );
}

function TermsAndConditionsWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Terms and Conditions | Stock Galaxy</title>
        <meta
          name="description"
          content="Read the terms and conditions that govern your use of Stock Galaxy."
        />
      </Helmet>
      <TermsAndConditions />
    </>
  );
}

function PrivacyPolicyWithHelmet() {
  return (
    <>
      <GoogleAnalytics id="G-59BHHTTBGN" />
      <Helmet>
        <title>Privacy Policy | Stock Galaxy</title>
        <meta
          name="description"
          content="Understand how we handle your data with Stock Galaxy's privacy policy."
        />
      </Helmet>
      <PrivacyPolicy />
    </>
  );
}

export default App;
