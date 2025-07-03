import { TextureLoader } from 'three';
import { RepeatWrapping, LinearFilter, NearestFilter } from 'three';

// Texture cache to prevent reloading
const textureCache = new Map();

// Performance tiers for texture quality
const TEXTURE_TIERS = {
  LOW: { 
    maxSize: 512, 
    format: 'webp', 
    quality: 0.7,
    generateMipmaps: false,
    minFilter: LinearFilter,
    magFilter: LinearFilter
  },
  MEDIUM: { 
    maxSize: 1024, 
    format: 'webp', 
    quality: 0.8,
    generateMipmaps: true,
    minFilter: LinearFilter,
    magFilter: LinearFilter
  },
  HIGH: { 
    maxSize: 2048, 
    format: 'webp', 
    quality: 0.9,
    generateMipmaps: true,
    minFilter: LinearFilter,
    magFilter: LinearFilter
  }
};

// Detect performance tier
const getPerformanceTier = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 4;
  const hasHighDPR = window.devicePixelRatio > 2;
  
  if (isMobile || isLowEnd) return TEXTURE_TIERS.LOW;
  if (hasHighDPR) return TEXTURE_TIERS.MEDIUM;
  return TEXTURE_TIERS.HIGH;
};

// Optimize texture URL based on performance tier
const optimizeTextureUrl = (originalUrl, options = {}) => {
  const tier = getPerformanceTier();
  const { format = tier.format, quality = tier.quality } = options;
  
  // If already optimized, return as is
  if (originalUrl.includes('.webp') || originalUrl.includes('optimized')) {
    return originalUrl;
  }
  
  // For local textures, we could implement server-side optimization
  // For now, return the original URL
  return originalUrl;
};

// Enhanced texture loader with caching and optimization
export const useOptimizedTexture = (url, options = {}) => {
  const optimizedUrl = optimizeTextureUrl(url, options);
  const tier = getPerformanceTier();
  
  // Check cache first
  if (textureCache.has(optimizedUrl)) {
    return textureCache.get(optimizedUrl);
  }
  
  // Load texture with optimization settings
  const textureLoader = new TextureLoader();
  const texture = textureLoader.load(optimizedUrl);
  
  // Apply optimization settings
  texture.generateMipmaps = tier.generateMipmaps;
  texture.minFilter = tier.minFilter;
  texture.magFilter = tier.magFilter;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  
  // Set maximum texture size
  if (texture.image) {
    const maxSize = tier.maxSize;
    if (texture.image.width > maxSize || texture.image.height > maxSize) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions maintaining aspect ratio
      const aspectRatio = texture.image.width / texture.image.height;
      let newWidth, newHeight;
      
      if (aspectRatio > 1) {
        newWidth = maxSize;
        newHeight = maxSize / aspectRatio;
      } else {
        newHeight = maxSize;
        newWidth = maxSize * aspectRatio;
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw resized image
      ctx.drawImage(texture.image, 0, 0, newWidth, newHeight);
      
      // Create new texture from canvas
      const resizedTexture = new TextureLoader().load(canvas.toDataURL());
      resizedTexture.generateMipmaps = tier.generateMipmaps;
      resizedTexture.minFilter = tier.minFilter;
      resizedTexture.magFilter = tier.magFilter;
      resizedTexture.wrapS = resizedTexture.wrapT = RepeatWrapping;
      
      // Cache the resized texture
      textureCache.set(optimizedUrl, resizedTexture);
      return resizedTexture;
    }
  }
  
  // Cache the original texture
  textureCache.set(optimizedUrl, texture);
  return texture;
};

// Preload textures for better performance
export const preloadTextures = (textureUrls) => {
  const promises = textureUrls.map(url => {
    return new Promise((resolve, reject) => {
      const texture = useOptimizedTexture(url);
      if (texture.image && texture.image.complete) {
        resolve(texture);
      } else {
        texture.addEventListener('load', () => resolve(texture));
        texture.addEventListener('error', reject);
      }
    });
  });
  
  return Promise.all(promises);
};

// Clear texture cache
export const clearTextureCache = () => {
  textureCache.forEach(texture => {
    if (texture.dispose) {
      texture.dispose();
    }
  });
  textureCache.clear();
};

// Get texture cache stats
export const getTextureCacheStats = () => {
  return {
    size: textureCache.size,
    urls: Array.from(textureCache.keys())
  };
};

// Texture LOD system for distance-based quality
export const useTextureLOD = (url, distance, options = {}) => {
  const { nearDistance = 5, farDistance = 20 } = options;
  
  // Calculate LOD level based on distance
  let lodLevel = 'HIGH';
  if (distance > farDistance) {
    lodLevel = 'LOW';
  } else if (distance > nearDistance) {
    lodLevel = 'MEDIUM';
  }
  
  const tier = TEXTURE_TIERS[lodLevel];
  return useOptimizedTexture(url, { ...options, ...tier });
}; 