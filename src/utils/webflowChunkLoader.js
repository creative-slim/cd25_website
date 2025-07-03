// Webflow Chunk Loader Utility
// Handles dynamic loading of chunks in Webflow environment

class WebflowChunkLoader {
  constructor() {
    this.loadedChunks = new Set();
    this.loadingChunks = new Map();
    this.chunkBaseUrl = ''; // Will be set by the main bundle
    this.chunkManifest = {}; // Will be populated with chunk mappings
  }

  // Set the base URL for chunks (usually the Webflow asset URL)
  setChunkBaseUrl(baseUrl) {
    this.chunkBaseUrl = baseUrl.replace(/\/[^\/]*$/, '/js/');
  }

  // Set the chunk manifest (mapping of chunk names to filenames)
  setChunkManifest(manifest) {
    this.chunkManifest = manifest;
  }

  // Load a chunk dynamically
  async loadChunk(chunkName) {
    // Check if already loaded
    if (this.loadedChunks.has(chunkName)) {
      return Promise.resolve();
    }

    // Check if currently loading
    if (this.loadingChunks.has(chunkName)) {
      return this.loadingChunks.get(chunkName);
    }

    // Get chunk filename from manifest
    const chunkFilename = this.chunkManifest[chunkName];
    if (!chunkFilename) {
      console.warn(`Chunk manifest not found for: ${chunkName}`);
      return Promise.resolve();
    }

    // Create loading promise
    const loadPromise = this.loadScript(`${this.chunkBaseUrl}${chunkFilename}`);
    this.loadingChunks.set(chunkName, loadPromise);

    try {
      await loadPromise;
      this.loadedChunks.add(chunkName);
      this.loadingChunks.delete(chunkName);
      console.log(`✅ Chunk loaded: ${chunkName}`);
    } catch (error) {
      this.loadingChunks.delete(chunkName);
      console.error(`❌ Failed to load chunk: ${chunkName}`, error);
      throw error;
    }
  }

  // Load multiple chunks
  async loadChunks(chunkNames) {
    const promises = chunkNames.map(chunkName => this.loadChunk(chunkName));
    return Promise.all(promises);
  }

  // Load script dynamically
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.type = 'text/javascript';
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      
      document.head.appendChild(script);
    });
  }

  // Preload chunks (load in background)
  preloadChunks(chunkNames) {
    chunkNames.forEach(chunkName => {
      if (!this.loadedChunks.has(chunkName) && !this.loadingChunks.has(chunkName)) {
        this.loadChunk(chunkName).catch(() => {
          // Silent fail for preloading
        });
      }
    });
  }

  // Get loading status
  getLoadingStatus() {
    return {
      loaded: Array.from(this.loadedChunks),
      loading: Array.from(this.loadingChunks.keys()),
      total: this.loadedChunks.size + this.loadingChunks.size
    };
  }

  // Check if chunk is loaded
  isChunkLoaded(chunkName) {
    return this.loadedChunks.has(chunkName);
  }

  // Clear loaded chunks (for testing)
  clearLoadedChunks() {
    this.loadedChunks.clear();
    this.loadingChunks.clear();
  }
}

// Create global instance
window.WebflowChunkLoader = new WebflowChunkLoader();

// Export for module usage
export default window.WebflowChunkLoader; 