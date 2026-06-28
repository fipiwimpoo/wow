export function pointInPolygon(point: {x: number, y: number}, polygon: {x: number, y: number}[]) {
  let isInside = false;
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if ((pi.y > point.y) !== (pj.y > point.y) &&
        point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x) {
      isInside = !isInside;
    }
    j = i;
  }
  return isInside;
}

export function getBoundingBox(polygon: {x: number, y: number}[]) {
  if (!polygon || polygon.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = 100, minY = 100, maxX = 0, maxY = 0;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function getCentroid(polygon: {x: number, y: number}[]) {
  const bb = getBoundingBox(polygon);
  return { x: bb.minX + (bb.maxX - bb.minX) / 2, y: bb.minY + (bb.maxY - bb.minY) / 2 };
}

// Pseudo-random generator based on a seed string
export function getPseudoRandomPosition(seed: string, polygon: {x: number, y: number}[], tokenSize: number) {
  if (!polygon || polygon.length < 3) return { x: 50, y: 50 };
  
  const bb = getBoundingBox(polygon);
  
  // Simple hash function for the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  
  // Try up to 20 times to find a point inside the polygon
  for (let attempt = 0; attempt < 20; attempt++) {
    // Generate deterministic pseudo-random numbers between 0 and 1
    const r1 = Math.abs(Math.sin(hash + attempt * 12.9898) * 43758.5453) % 1;
    const r2 = Math.abs(Math.cos(hash + attempt * 78.233) * 43758.5453) % 1;
    
    // Add margin to avoid edges
    const margin = tokenSize / 2;
    const x = bb.minX + margin + r1 * (bb.maxX - bb.minX - tokenSize);
    const y = bb.minY + margin + r2 * (bb.maxY - bb.minY - tokenSize);
    
    if (pointInPolygon({ x, y }, polygon)) {
      return { x, y };
    }
  }
  
  // Fallback to centroid
  return getCentroid(polygon);
}
