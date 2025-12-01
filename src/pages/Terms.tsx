import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EmailLink } from "@/components/EmailLink";

const Terms = () => {
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
          <h1 className="text-4xl font-bold mb-8">SnapDaddy Terms of Service</h1>
          
          <div className="space-y-6">
            <p>
              Welcome to SnapDaddy. These Terms govern your use of the SnapDaddy platform ("the Service"). By using the Service, you agree to these Terms.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Eligibility & Accounts</h2>
            <p>You must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be 16 or older</li>
              <li>Provide accurate account info</li>
              <li>Use the service legally and ethically</li>
            </ul>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload harmful, illegal, or fraudulent content</li>
              <li>Attempt to hack, exploit, or overload the service</li>
              <li>Share your login credentials</li>
              <li>Reverse-engineer SnapDaddy</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Receipt Scanning & AI Processing</h2>
            <p>SnapDaddy uses AI to extract data from receipts you upload, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Merchant name</li>
              <li>Items</li>
              <li>Tax amounts</li>
              <li>Totals</li>
              <li>Date of purchase</li>
            </ul>
            <p>AI predictions may contain errors. You are responsible for reviewing extracted data.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Cloud Storage Integrations</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Google Services</h3>
            <p>By connecting Google Drive or Sheets, you allow SnapDaddy to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access files/folders you select</li>
              <li>Create/update Sheets you choose</li>
              <li>Store processed receipt data in your Google account</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Microsoft Services</h3>
            <p>By connecting OneDrive or Excel, you allow SnapDaddy to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the folders you approve</li>
              <li>Generate or edit Excel files you choose</li>
              <li>Sync receipt data you approve</li>
            </ul>
            <p>You can revoke Google/Microsoft permissions at any time.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Accounting Integrations</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">4.1 QuickBooks</h3>
            <p>By connecting QuickBooks, you grant SnapDaddy permission to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Read your chart of accounts</li>
              <li>Read categories and accounts</li>
              <li>Create or update expense entries you manually confirm</li>
            </ul>
            <p className="font-semibold">SnapDaddy does not handle:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payroll</li>
              <li>Bank feeds</li>
              <li>VAT submissions</li>
              <li>Invoice generation</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Xero</h3>
            <p>By connecting Xero, you grant SnapDaddy permission to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Read accounts, categories, and ledgers</li>
              <li>Create or update expense entries you approve</li>
            </ul>
            <p>SnapDaddy does not access financial components unless authorised.</p>
            <p className="font-semibold">You retain full responsibility for all accounting submissions.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Subscriptions & Billing</h2>
            <p>SnapDaddy uses Stripe for billing.</p>
            <p>By subscribing, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recurring charges</li>
              <li>Automatic renewal until cancelled</li>
              <li>Billing cycles shown at checkout</li>
            </ul>
            <p>Refunds are handled through Stripe's refund system and our internal policies.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data & Privacy</h2>
            <p>Your data is processed according to our Privacy Policy:<br />
            👉 <a href="https://snapdaddy.app/privacy" className="text-primary hover:underline">https://snapdaddy.app/privacy</a></p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms.</p>
            <p>You may delete your account at any time.</p>
            <p>Termination does not remove synced data already stored in your external services (Drive, OneDrive, QuickBooks, Xero).</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimer & Limitation of Liability</h2>
            <p>SnapDaddy is provided "as is".<br />
            We are not responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Incorrect AI extraction</li>
              <li>Loss of data</li>
              <li>Issues caused by Google, Microsoft, QuickBooks, Xero, or Stripe outages</li>
              <li>Financial or tax errors</li>
              <li>HMRC submissions</li>
              <li>User mistakes</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use means you accept the changes.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact</h2>
            <p>For questions about these Terms:<br />
            📧 <EmailLink email="snapdaddyapp@gmail.com" className="text-primary hover:underline" /></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
