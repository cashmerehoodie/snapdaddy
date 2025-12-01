interface EmailLinkProps {
  email: string;
  className?: string;
}

export const EmailLink = ({ email, className = "" }: EmailLinkProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Method 1: Try window.open with _blank (most reliable in web apps/iframes)
    try {
      const newWindow = window.open(`mailto:${email}`, '_blank');
      
      // If window.open is blocked or returns null, try direct assignment
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Method 2: Direct location assignment as fallback
        window.location.assign(`mailto:${email}`);
      }
    } catch (error) {
      // Method 3: Final fallback - direct href navigation
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <a
      href={`mailto:${email}`}
      className={className}
      onClick={handleClick}
      role="link"
    >
      {email}
    </a>
  );
};
