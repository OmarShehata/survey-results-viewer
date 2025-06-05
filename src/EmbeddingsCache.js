export class EmbeddingsCache {
    constructor(dbName = 'EmbeddingsDB', version = 1) {
      this.dbName = dbName;
      this.version = version;
      this.db = null;
    }
  
    // Initialize the database
    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains('embeddings')) {
            const store = db.createObjectStore('embeddings', { keyPath: 'text' });
            // Optional: create index for faster lookups by hash if needed
            store.createIndex('textHash', 'textHash', { unique: false });
          }
        };
      });
    }
  
    // Generate a simple hash for the text (optional, for indexing)
    hashText(text) {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString();
    }
  
    // Check if embeddings exist for given text
    async hasEmbeddings(text) {
      const transaction = this.db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      
      return new Promise((resolve, reject) => {
        const request = store.get(text);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    // Get embeddings for text (returns null if not found)
    async getEmbeddings(text) {
      const transaction = this.db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      
      return new Promise((resolve, reject) => {
        const request = store.get(text);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.embeddings : null);
        };
        request.onerror = () => reject(request.error);
      });
    }
  
    // Store embeddings for text
    async storeEmbeddings(text, embeddings) {
      const transaction = this.db.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');
      
      const data = {
        text: text,
        embeddings: embeddings,
        textHash: this.hashText(text),
        timestamp: Date.now()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    // Get embeddings with caching logic - the main method you'll use
    async getOrCreateEmbeddings(text, generateEmbeddingsFn) {
      try {
        // Check if we already have embeddings
        const cached = await this.getEmbeddings(text);
        if (cached) {
          console.log('Using cached embeddings for:', text.substring(0, 50) + '...');
          return cached;
        }
        
        // Generate new embeddings
        console.log('Generating new embeddings for:', text.substring(0, 50) + '...');
        const embeddings = await generateEmbeddingsFn(text);
        
        // Store for future use
        await this.storeEmbeddings(text, embeddings);
        
        return embeddings;
      } catch (error) {
        console.error('Error in getOrCreateEmbeddings:', error);
        throw error;
      }
    }
  
    // Clear all cached embeddings
    async clearCache() {
      const transaction = this.db.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  
    // Get cache statistics
    async getCacheStats() {
      const transaction = this.db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => {
          resolve({
            totalEntries: request.result,
            dbName: this.dbName
          });
        };
        request.onerror = () => reject(request.error);
      });
    }
  }
  
  // Usage example:
  async function example() {
    // Initialize the cache
    const cache = new EmbeddingsCache();
    await cache.init();
    
    // Your embedding generation function (replace with your actual implementation)
    async function generateEmbeddings(text) {
      // This is where you'd call your actual embedding API/model
      // For demo purposes, return a fake embedding
      return new Array(768).fill(0).map(() => Math.random());
    }
    
    // Use the cache
    const text1 = "The quick brown fox jumps over the lazy dog";
    const text2 = "Machine learning is transforming technology";
    
    // First call will generate and cache
    const embeddings1 = await cache.getOrCreateEmbeddings(text1, generateEmbeddings);
    console.log('Embeddings length:', embeddings1.length);
    
    // Second call will use cache
    const embeddings1Cached = await cache.getOrCreateEmbeddings(text1, generateEmbeddings);
    console.log('Same embeddings?', embeddings1 === embeddings1Cached); // false (different arrays) but same values
    
    // Different text will generate new embeddings
    const embeddings2 = await cache.getOrCreateEmbeddings(text2, generateEmbeddings);
    console.log('Different embeddings length:', embeddings2.length);
    
    // Check cache stats
    const stats = await cache.getCacheStats();
    console.log('Cache stats:', stats);
  }
  
  // Uncomment to run example:
  // example();