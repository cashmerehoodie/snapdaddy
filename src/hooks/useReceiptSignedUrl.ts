import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReceiptSignedUrl = (imageUrl: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!imageUrl) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Extract the file path from the full URL
        const urlParts = imageUrl.split('/receipts/');
        if (urlParts.length < 2) {
          throw new Error('Invalid image URL format');
        }
        
        const filePath = urlParts[1].split('?')[0]; // Remove any query params

        // Generate signed URL with 1 hour expiry
        const { data, error: signError } = await supabase.storage
          .from('receipts')
          .createSignedUrl(filePath, 3600);

        if (signError) throw signError;

        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        console.error('Error generating signed URL:', err);
        setError(err.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [imageUrl]);

  return { signedUrl, loading, error };
};
