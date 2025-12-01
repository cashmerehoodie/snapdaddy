import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">SnapDaddy Privacy Policy</h1>
          
          <div className="space-y-6">
            <p>
              SnapDaddy ("we", "our", "us") provides an AI-powered platform that scans receipts, organizes expenses, syncs data to cloud services, and integrates with accounting software. This Privacy Policy explains how we collect, use, store, and protect your information.
            </p>
            <p>
              By using SnapDaddy, you agree to this Privacy Policy.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Information You Provide</h3>
            <p>We may collect and store:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Display name or username</li>
              <li>Uploaded images (receipts, invoices, documents)</li>
              <li>Expense categories, tags, notes, or custom fields you enter</li>
              <li>Preferences and settings</li>
              <li>Connected account details (Google, Microsoft, QuickBooks, Xero)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Automatically Collected Information</h3>
            <p>We may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Device and browser type</li>
              <li>Interactions with features</li>
              <li>Diagnostic logs</li>
              <li>Error reports</li>
            </ul>
            <p>This helps improve performance and security.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.3 Google Services (Drive & Sheets)</h3>
            <p>When you connect Google services, we may request permission to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Read basic profile information (email, name)</li>
              <li>Access Google Drive folders and files you choose</li>
              <li>Create or update Google Sheets you authorize</li>
            </ul>
            <p>We do NOT access your entire Google Drive — only the specific files/folders you grant.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.4 Microsoft Services (OneDrive & Excel)</h3>
            <p>When you connect Microsoft services, we may request permission to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Read your account profile (name, email)</li>
              <li>Access selected OneDrive folders</li>
              <li>Create, modify, or update Excel files you explicitly choose</li>
            </ul>
            <p>Again, SnapDaddy can only interact with content you authorize.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.5 Accounting Integrations (QuickBooks & Xero)</h3>
            <p>When you connect QuickBooks or Xero, we may access:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account profile (business name, email)</li>
              <li>Chart of accounts</li>
              <li>Expense categories</li>
              <li>Ledgers relevant to recording expenses</li>
              <li>Transaction entries you choose to sync</li>
            </ul>
            <p className="font-semibold">SnapDaddy does not access:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Bank feeds</li>
              <li>Payroll</li>
              <li>Invoice creation</li>
              <li>Sensitive financial documents not permitted by the integration</li>
            </ul>
            <p>You may disconnect integrations at any time.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process and analyze receipts using AI</li>
              <li>Extract merchant, total, date, tax, and item data</li>
              <li>Store receipts in your connected cloud service</li>
              <li>Sync expenses to QuickBooks, Xero, Sheets, or Excel</li>
              <li>Provide spending summaries and analytics</li>
              <li>Authenticate your login securely (OAuth 2.0)</li>
              <li>Improve system performance and reliability</li>
              <li>Prevent misuse or fraudulent activity</li>
            </ul>
            <p className="font-semibold">We never sell your data.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Receipt images stay until you delete them</li>
              <li>Account data remains until your account is deleted</li>
              <li>Logs and diagnostics may be kept for security</li>
              <li>Synced data stored in your external services remains under your control</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
            <p>We protect your data using:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (HTTPS/SSL)</li>
              <li>Secure cloud storage</li>
              <li>Access scope limitations (OAuth)</li>
              <li>Role-based and permission-based access</li>
              <li>Regular internal security reviews</li>
            </ul>
            <p>Your external storage (Drive, OneDrive) remains governed by those platforms' security measures.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Sharing of Information</h2>
            <p>We do NOT sell or trade your data.</p>
            <p>We only share data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google APIs, Microsoft Graph, QuickBooks API, or Xero API you choose to connect</li>
              <li>Backend service providers strictly necessary to run SnapDaddy</li>
              <li>Law enforcement, but only when legally required</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights (GDPR & UK GDPR)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account</li>
              <li>Request deletion of receipts or personal data</li>
              <li>Export your data</li>
              <li>Withdraw permissions from Google, Microsoft, QuickBooks, or Xero</li>
              <li>Lodge a complaint with ICO (UK)</li>
            </ul>
            <p>To request any of these, contact: 📧 <a
              href="mailto:snapdaddyapp@gmail.com"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "mailto:snapdaddyapp@gmail.com";
              }}
            >
              snapdaddyapp@gmail.com
            </a></p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Third-Party Services</h2>
            <p>SnapDaddy integrates with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google Drive</li>
              <li>Google Sheets</li>
              <li>Microsoft OneDrive</li>
              <li>Microsoft Excel</li>
              <li>QuickBooks</li>
              <li>Xero</li>
              <li>Stripe for payments</li>
            </ul>
            <p>Your use of these services is subject to their own policies.</p>
            <p>Use of Google user data adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
            <p>SnapDaddy is not intended for users under 16.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Updates to This Policy</h2>
            <p>We may update this Privacy Policy periodically. Continued use of the service constitutes acceptance of the updated terms.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact</h2>
            <p>For any privacy questions: 📧 <a
              href="mailto:snapdaddyapp@gmail.com"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "mailto:snapdaddyapp@gmail.com";
              }}
            >
              snapdaddyapp@gmail.com
            </a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
