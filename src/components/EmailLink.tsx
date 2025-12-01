interface EmailLinkProps {
  email: string;
  className?: string;
}

export const EmailLink = ({ email, className = "" }: EmailLinkProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Use window.open with a named target for better compatibility
    window.open(`mailto:${email}`, 'mail');
  };

  return (
    <a
      href={`mailto:${email}`}
      className={className}
      onClick={handleClick}
    >
      {email}
    </a>
  );
};
