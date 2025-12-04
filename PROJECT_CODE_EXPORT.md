# SnapDaddy Complete Code Export
Generated: 2025-12-04

## Project Structure
```
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── App.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── ui/ (50+ shadcn components)
│   │   ├── CategoryManager.tsx
│   │   ├── CategoryView.tsx
│   │   ├── DashboardGreeting.tsx
│   │   ├── EmailLink.tsx
│   │   ├── Footer.tsx
│   │   ├── GoogleSettings.tsx
│   │   ├── ManageBillingButton.tsx
│   │   ├── MigrateData.tsx
│   │   ├── MonthlyView.tsx
│   │   ├── NavLink.tsx
│   │   ├── Onboarding.tsx
│   │   ├── PhoneUploadQR.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ReceiptCategoryEditor.tsx
│   │   ├── ReceiptImage.tsx
│   │   ├── ReceiptUpload.tsx
│   │   ├── SheetSelector.tsx
│   │   └── YearlyView.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useReceiptSignedUrl.ts
│   │   └── useSubscription.tsx
│   ├── integrations/supabase/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── lib/
│   │   ├── dateUtils.ts
│   │   └── utils.ts
│   └── pages/
│       ├── AccessCode.tsx
│       ├── Auth.tsx
│       ├── Dashboard.tsx
│       ├── Index.tsx
│       ├── Landing.tsx
│       ├── LogoGenerator.tsx
│       ├── NotFound.tsx
│       ├── PhoneUpload.tsx
│       ├── Privacy.tsx
│       ├── Profile.tsx
│       ├── Subscribe.tsx
│       └── Terms.tsx
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── _shared/refreshGoogleToken.ts
│       ├── check-subscription/index.ts
│       ├── create-checkout/index.ts
│       ├── create-upload-session/index.ts
│       ├── customer-portal/index.ts
│       ├── generate-logo/index.ts
│       ├── google-drive-upload/index.ts
│       ├── google-sheets-sync/index.ts
│       ├── microsoft-excel-sync/index.ts
│       ├── microsoft-onedrive-upload/index.ts
│       ├── migrate-sheets-to-supabase/index.ts
│       ├── phone-upload/index.ts
│       ├── process-receipt/index.ts
│       ├── setup-google-storage/index.ts
│       ├── stripe-webhook/index.ts
│       └── verify-access-code/index.ts
├── public/
├── index.html
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    
    <!-- Primary Meta Tags -->
    <title>SnapDaddy – AI Receipt Scanner & Automatic Expense Tracker</title>
    <meta name="title" content="SnapDaddy – AI Receipt Scanner & Automatic Expense Tracker" />
    <meta name="description" content="SnapDaddy is an AI-powered receipt scanner that organizes your expenses automatically. Upload receipts, track spending, sync with Google Drive, OneDrive, QuickBooks & Xero. Never lose a receipt again." />
    <meta name="keywords" content="AI receipt scanner, receipt tracking app, scan receipts online, AI expense tracker, automatic bookkeeping app, upload receipts online, manage expenses easily, smart tax prep tool, sync receipts with Google Drive, sync receipts with QuickBooks, Xero integration, receipt OCR, digital receipt storage" />
    <meta name="author" content="SnapDaddy" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://snapdaddy.app/" />

    <!-- Favicon / Browser Tab Icons -->
    <link rel="icon" type="image/png" href="/favicon.png?v=4" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=4" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=4" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
    <link rel="manifest" href="/site.webmanifest" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://snapdaddy.app/" />
    <meta property="og:title" content="SnapDaddy – AI Receipt Scanner & Expense Tracker" />
    <meta property="og:description" content="SnapDaddy is an AI-powered receipt scanner that organizes your expenses automatically. Upload receipts, track spending, sync with Drive, OneDrive, QuickBooks, and Xero." />
    <meta property="og:image" content="https://snapdaddy.app/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:site_name" content="SnapDaddy" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://snapdaddy.app/" />
    <meta name="twitter:title" content="SnapDaddy – AI Receipt Scanner & Expense Tracker" />
    <meta name="twitter:description" content="AI-powered receipt scanning & automatic expense tracking." />
    <meta name="twitter:image" content="https://snapdaddy.app/favicon.png" />

    <!-- Apple Mobile Web App -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="SnapDaddy" />

    <!-- Theme Color -->
    <meta name="theme-color" content="#6366f1" />

    <!-- Structured Data - JSON-LD Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SnapDaddy",
      "url": "https://snapdaddy.app",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web",
      "description": "AI-powered receipt scanner and automatic expense tracker with support for Google Drive, OneDrive, QuickBooks, and Xero.",
      "image": "https://snapdaddy.app/favicon.png",
      "offers": {
        "@type": "Offer",
        "price": "5.00",
        "priceCurrency": "GBP",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "127"
      },
      "featureList": [
        "AI Receipt Scanning",
        "Automatic Categorization",
        "Expense Tracking",
        "Cloud Backup",
        "Google Drive Integration",
        "OneDrive Integration",
        "Google Sheets Sync",
        "QuickBooks Sync",
        "Xero Sync",
        "Monthly & Yearly Reports",
        "Category Management"
      ],
      "author": {
        "@type": "Person",
        "name": "L"
      }
    }
    </script>

    <!-- Organization Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "SnapDaddy",
      "url": "https://snapdaddy.app",
      "logo": "https://snapdaddy.app/favicon.png",
      "sameAs": [
        "https://www.instagram.com/snapdaddyapp",
        "https://www.facebook.com/snapdaddyapp"
      ]
    }
    </script>
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

---

## src/main.tsx
```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## src/App.tsx
```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PhoneUpload from "./pages/PhoneUpload";
import NotFound from "./pages/NotFound";
import Subscribe from "./pages/Subscribe";
import AccessCode from "./pages/AccessCode";
import LogoGenerator from "./pages/LogoGenerator";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/access-code" element={<AccessCode />} />
              <Route 
                path="/logo-generator"
                element={
                  <ProtectedRoute>
                    <LogoGenerator />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/upload/:sessionId" element={<PhoneUpload />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
```

---

## src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* SnapDaddy Brand Colors - White & Purple Theme */
    --background: 0 0% 100%;
    --foreground: 270 30% 15%;

    --card: 0 0% 100%;
    --card-foreground: 270 30% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 270 30% 15%;

    /* Purple brand gradient */
    --primary: 270 70% 65%;
    --primary-foreground: 0 0% 100%;
    
    --primary-dark: 270 70% 50%;
    --primary-light: 270 60% 85%;
    --primary-glow: 270 70% 75%;

    --secondary: 270 50% 95%;
    --secondary-foreground: 270 70% 65%;

    --muted: 270 30% 97%;
    --muted-foreground: 270 15% 50%;

    --accent: 280 70% 70%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;

    --border: 270 20% 92%;
    --input: 270 20% 92%;
    --ring: 270 70% 65%;

    --radius: 1rem;
    
    /* Custom shadows and effects */
    --shadow-soft: 0 2px 8px rgba(167, 139, 250, 0.1);
    --shadow-medium: 0 4px 16px rgba(167, 139, 250, 0.15);
    --shadow-strong: 0 8px 32px rgba(167, 139, 250, 0.2);
    --gradient-primary: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
    --gradient-soft: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(var(--secondary)) 100%);

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 270 40% 8%;
    --foreground: 270 20% 95%;

    --card: 270 35% 12%;
    --card-foreground: 270 20% 95%;

    --popover: 270 35% 12%;
    --popover-foreground: 270 20% 95%;

    --primary: 270 70% 65%;
    --primary-foreground: 0 0% 100%;

    --secondary: 270 30% 20%;
    --secondary-foreground: 270 20% 95%;

    --muted: 270 30% 20%;
    --muted-foreground: 270 15% 65%;

    --accent: 280 70% 70%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 62.8% 50%;
    --destructive-foreground: 270 20% 95%;

    --border: 270 30% 20%;
    --input: 270 30% 20%;
    --ring: 270 70% 65%;
    
    --sidebar-background: 270 35% 12%;
    --sidebar-foreground: 270 20% 95%;
    --sidebar-primary: 270 70% 65%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 270 30% 20%;
    --sidebar-accent-foreground: 270 20% 95%;
    --sidebar-border: 270 30% 20%;
    --sidebar-ring: 270 70% 65%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

---

## src/contexts/AuthContext.tsx
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearSupabaseAuthStorage = () => {
  try {
    const keysToRemove = Object.keys(localStorage).filter((key) =>
      key.startsWith('sb-') || key.toLowerCase().includes('supabase')
    );
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log('[AuthContext] Cleared Supabase auth storage keys:', keysToRemove);
  } catch (error) {
    console.error('[AuthContext] Error clearing Supabase auth storage:', error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    console.log("[AuthContext] Signing out...");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthContext] Sign out error (will clear local state anyway):", error);
    } finally {
      setSession(null);
      setUser(null);
      clearSupabaseAuthStorage();
      console.log("[AuthContext] Local auth state cleared");
    }
  };

  useEffect(() => {
    console.log("[AuthContext] Initializing auth context");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthContext] Auth state change:", event, !!session?.user);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const validateSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthContext] Initial session check:", !!session?.user);
        
        if (session) {
          const { data: { user }, error } = await supabase.auth.getUser();
          console.log("[AuthContext] Session validation:", { hasUser: !!user, error: error?.message });
          
          if (error || !user) {
            console.log("[AuthContext] Stale session detected, clearing...");
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error("[AuthContext] Error signing out stale session:", error);
            } finally {
              clearSupabaseAuthStorage();
              setSession(null);
              setUser(null);
            }
          } else {
            setSession(session);
            setUser(user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error("[AuthContext] Session validation error:", error);
        clearSupabaseAuthStorage();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();

    const timeout = setTimeout(() => {
      console.log("[AuthContext] Auth timeout - forcing loaded state");
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

---

## src/components/ProtectedRoute.tsx
```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription(user);

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-primary-light/10">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            {authLoading ? "Checking authentication..." : "Verifying subscription..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (!subscribed) {
    console.log("[ProtectedRoute] User not subscribed, redirecting to /subscribe");
    return <Navigate to="/subscribe" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
```

---

## src/hooks/useSubscription.tsx
```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_status: string;
  has_free_access?: boolean;
  subscription_end?: string;
  trial_end?: string;
  loading: boolean;
  checkedForUserId: string | null;
  authError: boolean;
}

export const useSubscription = (user: User | null) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_status: "inactive",
    loading: true,
    checkedForUserId: null,
    authError: false,
  });

  const isActuallyLoading = status.loading || (user?.id != null && status.checkedForUserId !== user.id);

  const checkSubscription = async () => {
    console.log("[useSubscription] checkSubscription called", { userId: user?.id });
    
    if (!user) {
      console.log("[useSubscription] No user, marking as not subscribed");
      setStatus({
        subscribed: false,
        subscription_status: "inactive",
        loading: false,
        checkedForUserId: null,
        authError: false,
      });
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true }));
    console.log("[useSubscription] Starting subscription check for user:", user.id);

    const fallbackFromProfile = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("has_free_access, subscription_status")
          .eq("user_id", user.id)
          .single();

        console.log("useSubscription: fallback profile response:", { profile, profileError });

        if (profileError) {
          const isAuthError = profileError.message?.includes("JWT") || 
                             profileError.message?.includes("session") ||
                             profileError.code === "PGRST301";
          
          setStatus({
            subscribed: false,
            subscription_status: "inactive",
            loading: false,
            checkedForUserId: user.id,
            authError: isAuthError,
          });
          return;
        }

        if (!profile) {
          setStatus({
            subscribed: false,
            subscription_status: "inactive",
            loading: false,
            checkedForUserId: user.id,
            authError: false,
          });
          return;
        }

        const isSubscribed =
          profile.has_free_access ||
          ["active", "trialing"].includes(profile.subscription_status || "");

        setStatus({
          subscribed: !!isSubscribed,
          subscription_status: profile.subscription_status || "inactive",
          has_free_access: !!profile.has_free_access,
          loading: false,
          checkedForUserId: user.id,
          authError: false,
        });
      } catch (profileErr: any) {
        console.error("Error in fallback profile check:", profileErr);
        const isAuthError = profileErr.message?.includes("JWT") || 
                           profileErr.message?.includes("session");
        
        setStatus({
          subscribed: false,
          subscription_status: "inactive",
          loading: false,
          checkedForUserId: user.id,
          authError: isAuthError,
        });
      }
    };

    try {
      console.log("[useSubscription] Attempting edge function check...");
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.log("[useSubscription] Edge function timeout after 3s");
          reject(new Error('Subscription check timeout'));
        }, 3000)
      );
      
      const checkPromise = supabase.functions.invoke("check-subscription");
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]) as any;

      console.log("[useSubscription] Edge function response:", { data, error });

      if (error || !data) {
        console.error("[useSubscription] Error or no data, using fallback:", error);
        await fallbackFromProfile();
        return;
      }

      console.log("[useSubscription] Success! Setting status:", { ...data });
      setStatus({
        ...data,
        loading: false,
        checkedForUserId: user.id,
      });
    } catch (error) {
      console.error("[useSubscription] Exception caught, using fallback:", error);
      await fallbackFromProfile();
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user?.id]);

  return { ...status, loading: isActuallyLoading, refresh: checkSubscription };
};
```

---

## src/lib/utils.ts
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## src/lib/dateUtils.ts
```typescript
import { format as dateFnsFormat } from "date-fns";

export type DateFormatPreference = "DD/MM/YYYY" | "MM/DD/YYYY";

export const getDateFormatPreference = (): DateFormatPreference => {
  const stored = localStorage.getItem("dateFormat");
  return (stored as DateFormatPreference) || "DD/MM/YYYY";
};

export const formatDate = (
  date: Date | string | number,
  formatType: "short" | "medium" | "long" = "short"
): string => {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const preference = getDateFormatPreference();

  if (formatType === "short") {
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd/MM/yy")
      : dateFnsFormat(dateObj, "MM/dd/yy");
  }

  if (formatType === "medium") {
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd MMM yyyy")
      : dateFnsFormat(dateObj, "MMM dd, yyyy");
  }

  if (formatType === "long") {
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd MMMM yyyy")
      : dateFnsFormat(dateObj, "MMMM dd, yyyy");
  }

  return dateFnsFormat(dateObj, "dd/MM/yy");
};

export const formatMonthYear = (date: Date | string | number): string => {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return dateFnsFormat(dateObj, "MMM yyyy");
};
```

---

## src/integrations/supabase/client.ts
```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## src/components/Footer.tsx
```typescript
import { Instagram, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="container mx-auto px-4 py-8 border-t border-border/50">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <a 
          href="/privacy"
          className="hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Privacy Policy
        </a>
        <span className="hidden sm:inline">•</span>
        <a 
          href="/terms"
          className="hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Terms of Service
        </a>
        <span className="hidden sm:inline">•</span>
        <a 
          href="mailto:snapdaddyapp@gmail.com"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <Mail className="h-4 w-4" />
          <span>Contact</span>
        </a>
        <span className="hidden sm:inline">•</span>
        <a 
          href="https://www.instagram.com/snapdaddyapp/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
          aria-label="Follow us on Instagram"
        >
          <Instagram className="h-5 w-5" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
```

---

**NOTE: This export includes the main files. The project contains additional files including:**
- 50+ UI components in src/components/ui/
- 16 Edge Functions in supabase/functions/
- Additional components (CategoryManager, MonthlyView, YearlyView, etc.)
- Full page components (Landing, Auth, Dashboard, Profile, Subscribe, Privacy, Terms, etc.)

**The complete project is available in the Lovable editor.**
