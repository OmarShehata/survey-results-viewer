import { EmbeddingsCache } from './EmbeddingsCache';

export class LLMPreprocess {
    constructor({ openaiKey, prompt }) {
        this.openaiKey = openaiKey
        this.prompt = prompt
        this.cache = new EmbeddingsCache('llm-preprocess')
        
    }

    async init() {
        await this.cache.init()
        let oldPrompt = await this.cache.getEmbeddings('prompt')
        if (oldPrompt != this.prompt) {
            this.promptHasChanged = true
            console.log('promptHasChanged = true')
            await this.clearCache()
            await this.cache.storeEmbeddings('prompt', this.prompt)
        }
        
    }

    async clearCache() {
        // TODO: make this get cleared when button is pressed
        await this.cache.clearCache()
    }

    async process(textArray) {
        // Get them from the cache, or run them through OpenAI
        let input = ''
        let cachedResult = []

        for (let i = 0; i < textArray.length; i++) {
            const text = textArray[i]
            const storedResult = await this.cache.getEmbeddings(text)
            if (storedResult) {
                cachedResult.push(storedResult)
            }

            input += `(${i+1}) ${text}`
        }

        if (cachedResult.length == textArray.length) {
            return cachedResult
        }

        const promptA = 
        `You are given the following inputs which are replies to a post on social media. Please summarize each concisely in a neutral tone of voice. Try to keep the content of the message but in a "normalized voice".

For example, if a message is really angry for reason X, and writes a lot of personal anecdotes, just say "angry message for reason X".`
const promptB = `You are given the following inputs which are replies to a post on social media. State concisely whether the statement appears to be in agreement or disagreement. Do not specify the reason. `

        // TODO use the given prompt
        const promptSubmission = `
${promptB}

Return the results each on a newline, starting with (n) as given in the input.

${input}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + this.openaiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'model': 'o4-mini',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a helpful assistant.'
                    },
                    {
                        'role': 'user',
                        'content': promptSubmission
                    }
                ],
                // 'max_tokens': 1000,  // optional: limit response length
                // 'temperature': 0.7   // optional: control randomness (0-2)
            })
        });
        
        const data = await response.json();
        // Extract the generated text
        const output = data.choices[0].message.content;
        const parsedOutput = output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^\(\d+\)\s*/, '').trim());

        for (let i = 0; i < textArray.length; i++) {
            const text = textArray[i]
            const output = parsedOutput[i]
            await this.cache.storeEmbeddings(text, output)
        }

        return parsedOutput
    }
}