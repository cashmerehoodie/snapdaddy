interface EmailLinkProps {
  email: string;
  className?: string;
}

export const EmailLink = ({ email, className = "" }: EmailLinkProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Use location.href to properly trigger the OS email protocol handler
    window.location.href = `mailto:${email}`;
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
