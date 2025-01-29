// src/pages/PrivacyPolicy.js
import React from "react";
import GeneralFooter from "../components/GeneralFooter";
import Navbar from "../components/Navbar";
import "../styles/StaticPages.css";

function PrivacyPolicy() {
  return (
    <div>
      <Navbar />
      <div className="content">
        <h1>Privacy Policy</h1>
        <p>
          At Stock Galaxy, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data to ensure transparency and trust.
        </p>
        <p>
          <strong>1. Data Collection:</strong> We collect information such as your name, email address, profile picture, and usage patterns to enhance your experience on our platform. Additionally, we gather data about your portfolio selections, preferences, and settings to provide a more personalized service. This data is collected when you register, access our services, or communicate with us.
        </p>
        <p>
          The data we collect is categorized as follows:
          <ul>
            <li>Personal Identifiable Information (PII): Name, email address, profile picture.</li>
            <li>Usage Data: Interaction logs, portfolio selections, settings preferences.</li>
            <li>Technical Data: IP addresses, browser type, and device information.</li>
          </ul>
        </p>
        <p>
          <strong>2. Data Usage:</strong> The information collected is used for the following purposes:
          <ul>
            <li>To improve our platform’s functionality and provide a seamless user experience.</li>
            <li>To offer personalized content and tailored recommendations based on your interests and portfolio.</li>
            <li>To send updates, alerts, and notifications related to your activities on the platform.</li>
            <li>To analyze usage patterns and enhance our features to meet user demands.</li>
          </ul>
          We do not sell or share your personal data with third parties without your explicit consent.
        </p>
        <p>
          <strong>3. Data Security:</strong> Protecting your data is a top priority for us. We implement robust security measures, including encryption, firewalls, and access controls, to protect your information from unauthorized access, disclosure, or loss. While we strive to ensure data security, please note that no online platform can guarantee absolute security.
        </p>
        <p>
          In the event of a data breach, we will notify affected users and take immediate action to mitigate risks and prevent further breaches.
        </p>
        <p>
          <strong>4. Cookies:</strong> Our platform uses cookies to enhance your browsing experience. Cookies help us understand user preferences and improve platform performance. By continuing to use our platform, you consent to our use of cookies. You may adjust your browser settings to decline cookies, though some features may not function as intended.
        </p>
        <p>
          <strong>5. Third-Party Links:</strong> Stock Galaxy may include links to third-party websites for your convenience. Please note that these websites are governed by their own privacy policies, and we are not responsible for their practices. We encourage you to review their privacy policies before sharing your information.
        </p>
        <p>
          <strong>6. Data Retention:</strong> We retain your personal data for as long as necessary to fulfill the purposes outlined in this Privacy Policy. Once the data is no longer required, it is securely deleted or anonymized. Users may request data deletion at any time by contacting our support team.
        </p>
        <p>
          <strong>7. Changes to Policy:</strong> We reserve the right to update this Privacy Policy at any time to reflect changes in our practices or legal requirements. Users will be notified of significant changes via email or platform notifications. We encourage users to review this page regularly to stay informed.
        </p>
        <p>
          <strong>8. User Rights:</strong> Users have the right to:
          <ul>
            <li>Access the personal data we hold about them.</li>
            <li>Request corrections to inaccurate or incomplete data.</li>
            <li>Request data deletion under certain circumstances.</li>
            <li>Withdraw consent for data processing activities.</li>
          </ul>
          To exercise these rights, please contact us at <a href="mailto:baksikumaresh@gmail.com">baksikumaresh@gmail.com</a>.
        </p>
        <p>
          <strong>9. International Users:</strong> Stock Galaxy is based in India and complies with Indian data protection laws. Users accessing our platform from other regions acknowledge that their data may be transferred and processed in India. We ensure that adequate safeguards are in place for international data transfers.
        </p>
        <p>
          <strong>10. Contact Us:</strong> If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <a href="mailto:baksikumaresh@gmail.com">baksikumaresh@gmail.com</a>.
        </p>
        <p>
          Thank you for trusting Stock Galaxy. We are committed to safeguarding your privacy and providing a secure and personalized experience.
        </p>
      </div>
      <GeneralFooter />
    </div>
  );
}

export default PrivacyPolicy;