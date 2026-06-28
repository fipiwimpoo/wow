import { useState, useEffect } from 'react';
import { CharacterSheetAsset } from '../../core/models/layouts';
import { getSheetImage } from '../../core/utils/db';

export function useCharacterSheetImage(asset: CharacterSheetAsset | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      if (!asset) {
        setImageUrl(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Reset state when a new asset is provided
      setImageUrl(null);
      setError(null);
      setIsLoading(true);

      // If it has a standard imageUrl (official assets), use it directly
      if (asset.imageUrl && !asset.imageUrl.startsWith('data:')) {
        setImageUrl(asset.imageUrl);
        setIsLoading(false);
        return;
      }

      // If it's custom and has an assetId, load from IndexedDB
      if (asset.imageAssetId) {
        try {
          const blob = await getSheetImage(asset.imageAssetId);
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          } else if (active) {
            setError("No se pudo encontrar la imagen en la base de datos local.");
          }
        } catch (err) {
          if (active) setError("Error al cargar la hoja desde IndexedDB.");
          console.error(err);
        } finally {
          if (active) setIsLoading(false);
        }
        return;
      }

      // Fallback: If it's a legacy base64 in imageUrl, use it (we'll migrate this soon)
      if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
        setImageUrl(asset.imageUrl);
        setIsLoading(false);
        return;
      }

      setImageUrl(null);
      setIsLoading(false);
    }

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [asset?.id, asset?.imageAssetId, asset?.imageUrl]);

  return { imageUrl, isLoading, error };
}
