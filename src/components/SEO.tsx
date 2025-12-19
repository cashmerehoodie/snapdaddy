import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  noindex?: boolean;
}

const defaultTitle = "SnapDaddy – AI Receipt Scanner & Automatic Expense Tracker";
const defaultDescription = "SnapDaddy is an AI-powered receipt scanner that organizes your expenses automatically. Upload receipts, track spending, sync with Google Drive, OneDrive, QuickBooks & Xero.";

export const SEO = ({ title, description, noindex = false }: SEOProps) => {
  const location = useLocation();
  const canonicalUrl = `https://snapdaddy.app${location.pathname === '/' ? '' : location.pathname}`;
  
  return (
    <Helmet>
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};

export const SEOProvider = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);
