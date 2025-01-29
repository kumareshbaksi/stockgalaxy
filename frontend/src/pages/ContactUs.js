// src/pages/ContactUs.js
import React from "react";
import GeneralFooter from "../components/GeneralFooter";
import Navbar from "../components/Navbar";
import "../styles/StaticPages.css";

function ContactUs() {
  return (
    <div>
      <Navbar />
      <div className="content">
        <h1>Contact Us</h1>
        <p>If you have any questions or need assistance, feel free to reach out to us at:</p>
        <p>Email: <a href="mailto:baksikumaresh@gmail.com">baksikumaresh@gmail.com</a></p>
        <p>Phone: +91 8101400577</p>
        <p>Address: Howrah, West Bengal, India 711312</p>
      </div>
      <GeneralFooter />
    </div>
  );
}


export default ContactUs;
