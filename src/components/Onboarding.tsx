import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Upload, Cloud, BarChart3, FolderInput, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProps {
  userId: string;
}

const ONBOARDING_STEPS = [
  {
    title: "Welcome to SnapDaddy! 🎉",
    description: "Your smart receipt management system that makes expense tracking effortless.",
    icon: Receipt,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          SnapDaddy helps you capture, organize, and analyze your receipts with AI-powered processing.
        </p>
        <div className="grid gap-3 mt-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">AI-Powered Processing</p>
              <p className="text-sm text-muted-foreground">Automatically extract merchant, amount, and date</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Google Integration</p>
              <p className="text-sm text-muted-foreground">Sync to Drive & Sheets automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Smart Analytics</p>
              <p className="text-sm text-muted-foreground">View spending by category, month, and year</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Upload Your First Receipt",
    description: "Start by uploading receipt images from your computer or phone.",
    icon: Upload,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The <span className="font-semibold text-foreground">Upload</span> tab is your starting point for adding receipts.
        </p>
        <div className="space-y-3 mt-6">
          <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Drag & Drop or Click to Select
            </h4>
            <p className="text-sm text-muted-foreground">Upload multiple receipt images at once (JPG, PNG, HEIC)</p>
          </div>
          <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              AI Processing
            </h4>
            <p className="text-sm text-muted-foreground">Our AI extracts merchant name, amount, date, and category</p>
          </div>
          <div className="p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              QR Code for Mobile
            </h4>
            <p className="text-sm text-muted-foreground">Scan the QR code to upload directly from your phone's camera</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Connect Google Accounts",
    description: "Automatically backup receipts to Drive and sync to Sheets (optional).",
    icon: Cloud,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Connect your Google account to enable automatic backups and spreadsheet sync.
        </p>
        <div className="space-y-3 mt-6">
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              Google Drive Backup
            </h4>
            <p className="text-sm text-muted-foreground">
              All receipt images are automatically uploaded to a dedicated folder in your Google Drive
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Google Sheets Sync
            </h4>
            <p className="text-sm text-muted-foreground">
              Receipt data is automatically added as rows in your chosen Google Sheet for easy analysis
            </p>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium text-foreground">Tip:</span> Click the Google settings button (top-right) to configure your connection
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "View Your Data",
    description: "Analyze your spending with powerful visualization tools.",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          SnapDaddy provides multiple ways to view and analyze your receipts.
        </p>
        <div className="grid gap-3 mt-6">
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <h4 className="font-semibold mb-1">📊 Categories View</h4>
            <p className="text-sm text-muted-foreground">
              See spending grouped by category (Food, Transport, Shopping, etc.)
            </p>
          </div>
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <h4 className="font-semibold mb-1">📅 Monthly View</h4>
            <p className="text-sm text-muted-foreground">
              Track expenses month-by-month with detailed breakdowns
            </p>
          </div>
          <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <h4 className="font-semibold mb-1">📈 Yearly View</h4>
            <p className="text-sm text-muted-foreground">
              Visualize annual spending trends and patterns
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            🎨 <span className="font-medium text-foreground">Customize:</span> Set your preferred currency and date format in Profile settings
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Migrate Existing Data",
    description: "Already have receipts in Google Sheets? Import them instantly.",
    icon: FolderInput,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          If you already track receipts in a Google Sheet, you can migrate them to SnapDaddy.
        </p>
        <div className="space-y-3 mt-6">
          <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
            <h4 className="font-semibold mb-2">📥 Migrate Tab</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Go to the Migrate tab to import your existing Google Sheets data
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Select your Google Sheet</li>
              <li>Choose the sheet and column mapping</li>
              <li>Click Migrate to import all records</li>
            </ul>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">⚠️ Date Format:</span> Make sure your dates are in DD/MM/YYYY format for proper import
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-center text-muted-foreground font-medium">
            You're all set! Start uploading receipts to get started. 🚀
          </p>
        </div>
      </div>
    ),
  },
];

export default function Onboarding({ userId }: OnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding-completed-${userId}`);
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [userId]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`onboarding-completed-${userId}`, "true");
    setIsOpen(false);
  };

  const handleDoNotShowAgain = () => {
    localStorage.setItem(`onboarding-completed-${userId}`, "true");
    setIsOpen(false);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 py-4">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{step.title}</h2>
              <p className="text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-2">{step.content}</div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 pt-4">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleDoNotShowAgain}
              className="text-muted-foreground hover:text-foreground"
            >
              Do not show again
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
