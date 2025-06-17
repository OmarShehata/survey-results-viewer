import { EmbeddingsCache } from './EmbeddingsCache';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
env.allowLocalModels = false;
const model_name = 'nomic-ai/nomic-embed-text-v1.5'

export class SemanticEmbedding {
    constructor({ openaiKey } = {}) {
        this.openaiKey = openaiKey
        this.cache = new EmbeddingsCache()
    }

    async init() {
        await this.cache.init()
    }

    async clearCache() {
        await this.cache.clearCache()
    }

    async initLocalEmbedder(progress_callback) {
        const embedder = await pipeline('feature-extraction', model_name,
        {
            quantized: true,
            progress_callback: data => {
                const { progress, loaded, total } = data
                if (progress) {
                    const totalMB = Math.round(total / (1024 * 1024))
                    const loadedMB = Math.round(loaded / (1024 * 1024))
                    progress_callback({ progress, loadedMB, totalMB})                    
                }
            }
        });

        this.embedder = embedder
    }

    async embed(textArray) {
        console.log({ textArray })
        if (this.openaiKey) {
            console.log("Embedding using OpenAI")
            return await this.embedOpenAI(textArray)
        }

        const { embedder, cache } = this
        const result = []
        for (let text of textArray) {
            const storedVector = await cache.getEmbeddings(text)
            if (storedVector != null) {
                result.push(storedVector)
                continue
            }

            const embeddingVector = (await embedder(text, {pooling: 'mean', normalize: true})).data
            result.push(embeddingVector)
            cache.storeEmbeddings(text, embeddingVector)
        }
        return result
    }

    async embedOpenAI(textArray) {
        const { openaiKey, cache } = this

        let filteredTextArray = []
        let finalVectors = {}
        for (let i = 0; i < textArray.length; i++) {
            const text = textArray[i]
            const storedVector = await cache.getEmbeddings(text)
            if (storedVector != null) {
                finalVectors[i] = storedVector
                continue
            } else {
                filteredTextArray.push({ index: i, text })
            }
        }

        if (filteredTextArray.length == 0) {
            const result = []
            for (let i = 0; i < textArray.length; i++) {
                result.push(finalVectors[i])
            }
            return result
        }

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + openaiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'input': filteredTextArray.map(item => item.text),
                'model': 'text-embedding-3-large',
                'encoding_format': 'float'
            })
        });
        const data = await response.json();
        const vectors = data.data.map(item => item.embedding)

        // Map the new vectors back to their original indices and cache them
        for (let i = 0; i < filteredTextArray.length; i++) {
            const originalIndex = filteredTextArray[i].index
            const text = filteredTextArray[i].text
            const vector = vectors[i]
            
            // Store in cache for future use
            await cache.storeEmbeddings(text, vector)
            
            // Add to final results
            finalVectors[originalIndex] = vector
        }
        
        // Convert object back to array in original order
        const result = []
        for (let i = 0; i < textArray.length; i++) {
            result.push(finalVectors[i])
        }
        
        return result
    }
}