interface EmailLinkProps {
  email: string;
  className?: string;
}

export const EmailLink = ({ email, className = "" }: EmailLinkProps) => {
  return (
    <a
      href={`mailto:${email}`}
      className={className}
      target="_self"
      rel="noopener"
    >
      {email}
    </a>
  );
};
