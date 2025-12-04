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
