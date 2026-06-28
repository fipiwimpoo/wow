import React, { useState, useEffect } from 'react';
import { getCardImage } from '../../../core/utils/db';

// Global memory cache of Blob URLs for ultra-fast, stutter-free rendering
const blobUrlCache = new Map<string, string>();

/**
 * Force clear the cache for a specific card or all cards.
 * Use this when an asset is updated to force reload the new version.
 */
export function clearBlobImageCache(cardId?: string) {
  if (cardId) {
    const cached = blobUrlCache.get(cardId);
    if (cached) {
      URL.revokeObjectURL(cached);
      blobUrlCache.delete(cardId);
    }
  } else {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
  }
}

interface BlobImageProps {
  cardId: string;
  className?: string;
  alt?: string;
}

export function BlobImage({ cardId, className, alt }: BlobImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    // Check global cache first for instant sub-millisecond retrieval
    const cachedUrl = blobUrlCache.get(cardId);
    if (cachedUrl) {
      setUrl(cachedUrl);
      return;
    }
    
    getCardImage(cardId).then(blob => {
      if (active) {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          blobUrlCache.set(cardId, objectUrl);
          setUrl(objectUrl);
        } else {
          setUrl(""); // Mark as empty/failed so we don't keep checking
        }
      }
    });

    return () => {
      active = false;
    };
  }, [cardId]);

  if (url === null) {
    return <div className={`bg-neutral-800 animate-pulse ${className}`} />;
  }

  if (url === "") {
    return (
      <div className={`bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 text-[10px] font-bold ${className}`}>
        ?
      </div>
    );
  }

  return <img src={url} alt={alt || cardId} className={className} referrerPolicy="no-referrer" />;
}
