import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecureFileLinkProps {
  filePath: string | null;
  variant?: 'view' | 'download' | 'both';
  size?: 'sm' | 'default';
  expiresIn?: number;
}

/**
 * Component that displays secure links to files in private storage buckets
 * Uses signed URLs that expire after a specified duration
 */
export const SecureFileLink = ({ 
  filePath, 
  variant = 'both', 
  size = 'sm',
  expiresIn = 3600 
}: SecureFileLinkProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSignedUrl = async () => {
    if (!filePath) return null;
    
    setLoading(true);
    try {
      // Extract just the path if it's a full URL (for backwards compatibility)
      let path = filePath;
      if (filePath.includes('/uploads/')) {
        const match = filePath.match(/\/uploads\/(.+)$/);
        if (match) {
          path = decodeURIComponent(match[1]);
        }
      }
      
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error creating signed URL:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (action: 'view' | 'download') => {
    const url = await getSignedUrl();
    if (url) {
      if (action === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // For download, create a temporary link
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  if (!filePath) return null;

  const buttonSize = size === 'sm' ? 'sm' : 'default';

  return (
    <div className="flex gap-2">
      {(variant === 'view' || variant === 'both') && (
        <Button 
          variant="outline" 
          size={buttonSize} 
          onClick={() => handleClick('view')}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-1" />
          )}
          View
        </Button>
      )}
      {(variant === 'download' || variant === 'both') && (
        <Button 
          variant="outline" 
          size={buttonSize}
          onClick={() => handleClick('download')}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          Download
        </Button>
      )}
    </div>
  );
};
