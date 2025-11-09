import React from "react";
import "../styles/GeneralFooter.css";
import { FaCodeBranch } from "react-icons/fa";

const GeneralFooter = () => {
  return (
    <footer className="general-footer">
      <div className="footer-container">
        <p>© 2025 stockgalaxy.in All Rights Reserved.</p>
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

export default GeneralFooter;
