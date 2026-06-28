import React, { useState, useEffect, useRef } from 'react';

interface SheetCanvasFrameProps {
  imageUrl: string;
  children?: React.ReactNode;
  className?: string;
  onImageLoad?: (dimensions: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => void;
}

/**
 * A shared container for character sheets that ensures the overlay matches the image bounds perfectly.
 * Uses object-fit: contain logic but wraps it in a relative box that matches the "contain" result.
 */
export function SheetCanvasFrame({ imageUrl, children, className = "", onImageLoad }: SheetCanvasFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [frameStyle, setFrameStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const updateFrame = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.complete || img.naturalWidth === 0) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const imageAspectRatio = img.naturalWidth / img.naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth, renderedHeight;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container relative to height
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
    } else {
      // Image is taller than container relative to width
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
    }

    setFrameStyle({
      width: renderedWidth,
      height: renderedHeight,
      position: 'relative',
      opacity: 1
    });

    if (onImageLoad) {
      onImageLoad({
        width: renderedWidth,
        height: renderedHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    }
  };

  useEffect(() => {
    const observer = new ResizeObserver(() => updateFrame());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateFrame);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFrame);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* The Hidden Master Image for measurements */}
      <img 
        ref={imgRef}
        src={imageUrl} 
        alt=""
        className="hidden"
        onLoad={updateFrame}
        referrerPolicy="no-referrer"
      />

      {/* The Styled Frame that exactly matches the contained image */}
      <div style={frameStyle} className="transition-opacity duration-300">
        <img 
          src={imageUrl} 
          alt="Character Sheet" 
          className="w-full h-full block select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
        
        {/* The Absolute Overlay Layer - Always 100% of the image box */}
        <div className="absolute inset-0 z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
