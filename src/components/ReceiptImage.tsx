import { useReceiptSignedUrl } from '@/hooks/useReceiptSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface ReceiptImageProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

export const ReceiptImage = ({ imageUrl, alt, className }: ReceiptImageProps) => {
  const { signedUrl, loading, error } = useReceiptSignedUrl(imageUrl);

  if (loading) {
    return <Skeleton className={className} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <div className="text-center p-4">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Failed to load image</p>
        </div>
      </div>
    );
  }

  return <img src={signedUrl} alt={alt} className={className} />;
};
