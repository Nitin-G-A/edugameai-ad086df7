import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for a file in Supabase storage
 * The signed URL expires after the specified duration (default 1 hour)
 */
export const useSignedUrl = (fileUrl: string | null, expiresIn: number = 3600) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!fileUrl) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Extract the file path from the URL
        // URLs can be either public URLs or just the path
        let filePath = fileUrl;
        
        // If it's a full URL, extract just the path after /uploads/
        if (fileUrl.includes('/uploads/')) {
          const match = fileUrl.match(/\/uploads\/(.+)$/);
          if (match) {
            filePath = match[1];
          }
        }
        
        // Handle URL-encoded paths
        filePath = decodeURIComponent(filePath);
        
        const { data, error: signError } = await supabase.storage
          .from('uploads')
          .createSignedUrl(filePath, expiresIn);

        if (signError) throw signError;
        
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error creating signed URL:', err);
        setError(err as Error);
        // Fall back to original URL if signing fails
        setSignedUrl(fileUrl);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [fileUrl, expiresIn]);

  return { signedUrl, loading, error };
};

/**
 * Utility function to upload a file and return the storage path (not public URL)
 */
export const uploadFileToStorage = async (
  file: File,
  userId: string,
  folder: string = ''
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = folder 
    ? `${folder}/${userId}/${Date.now()}.${fileExt}`
    : `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Return just the file path, not a public URL
  return fileName;
};
