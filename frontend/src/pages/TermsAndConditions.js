import React from "react";
import GeneralFooter from "../components/GeneralFooter";
import Navbar from "../components/Navbar";
import "../styles/StaticPages.css";

function TermsAndConditions() {
  return (
    <div>
      <Navbar />
      <div className="content">
        <h1>Terms and Conditions</h1>
        <p>
          Welcome to Stock Galaxy! By accessing and using our platform, you agree to comply with and be bound by the following terms and conditions. Please review these terms carefully before using our services, as they affect your legal rights and obligations.
        </p>
        <p><strong>1. Usage of Our Service:</strong> Stock Galaxy provides a variety of financial tools and resources intended solely for personal, non-commercial use. You agree to use these services only for lawful purposes, and you are prohibited from misusing any service or content provided on our platform.</p>
        <p><strong>2. Account Responsibility:</strong> When you create an account with Stock Galaxy, you agree to maintain the security and confidentiality of your login credentials and are fully responsible for all activities that occur under your account. You must notify us immediately if you become aware of any unauthorized use of your account or any other security breach.</p>
        <p><strong>3. Content Ownership and Copyright:</strong> All content provided on Stock Galaxy, including text, graphics, logos, images, and software, is the property of Stock Galaxy or its licensors and is protected by international copyright and intellectual property laws.</p>
        <p><strong>4. Links to Third-Party Websites:</strong> Our Service may include links to external websites or services that Stock Galaxy does not control. We are not responsible for the content or privacy practices of these external websites.</p>
        <p><strong>6. Disclaimer of Warranties:</strong> The services are provided "as is" and "as available" without any warranties of any kind, including that the service will operate error-free or that the service, its servers, or the content are free of computer viruses or similar contamination or destructive features.</p>
        <p><strong>7. Limitation of Liability:</strong> Stock Galaxy, its directors, employees, partners, agents, suppliers, or affiliates, will not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to, use of, or inability to access or use the services.</p>
        <p><strong>8. Governing Law:</strong> These terms are governed by and construed in accordance with the laws of the jurisdiction in which our company is registered, without giving effect to any principles of conflicts of law.</p>
        <p>
          We reserve the right to modify these terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. Your continued use of our services after such changes will constitute your acceptance of the new terms.
        </p>
        <p>
          If you have any questions about these Terms, please contact us at <a href="mailto:baksikumaresh@gmail.com">baksikumaresh@gmail.com</a>.
        </p>
        <p>
          This business is operated by Kumaresh Baksi.
        </p>
      </div>
      <GeneralFooter />
    </div>
  );
}

export default TermsAndConditions;
