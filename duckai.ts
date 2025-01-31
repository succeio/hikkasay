import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ModelMap {
    [key: string]: string;
}

class DDGS {
    private proxy: string | null;
    private headers: Record<string, string>;
    private client: AxiosInstance;
    private _chatMessages: ChatMessage[];
    private _chatTokensCount: number;
    private _chatVqd: string;
    private _impersonates: string[];
    private _exceptionEvent: boolean;

    constructor(headers: Record<string, string> | null = null, proxy: string | null = null, timeout: number = 10000) {
        this.proxy = proxy;
        this.headers = headers || {};
        this.headers['Referer'] = 'https://duckduckgo.com/';
        this.client = axios.create({
            headers: this.headers,
            proxy: proxy ? { host: proxy, port: 80 } : false, // Добавьте порт
            timeout: timeout,
        });
        this._chatMessages = [];
        this._chatTokensCount = 0;
        this._chatVqd = '';
        this._impersonates = [
            "chrome_100", "chrome_108", "chrome_127", "safari_ios_17.4.1", "edge_122", "safari_18"
        ];
        this._exceptionEvent = false;
    }

    async enter(): Promise<DDGS> {
        return this;
    }

    async exit(): Promise<void> {
        return;
    }

    async getVqd(keywords: string): Promise<string> {
        if (this._exceptionEvent) throw new Error('Exception occurred in previous call.');
        try {
            const resp: AxiosResponse<string> = await this.client.post('https://duckduckgo.com', { q: keywords });
            return this._extractVqd(resp.data, keywords);
        } catch (error) {
            this._exceptionEvent = true;
            throw new Error(`Failed to get vqd: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async chat(keywords: string, model: string = 'gpt-4o-mini', timeout: number = 30000): Promise<string> {
        const models: ModelMap = {
            'claude-3-haiku': 'claude-3-haiku-20240307',
            'gpt-4o-mini': 'gpt-4o-mini',
            'llama-3.1-70b': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            'mixtral-8x7b': 'mistralai/Mixtral-8x7B-Instruct-v0.1'
        };

        try {
            if (!this._chatVqd) {
                const statusResp: AxiosResponse = await this.client.get('https://duckduckgo.com/duckchat/v1/status', {
                    headers: { 'x-vqd-accept': '1' }
                });
                this._chatVqd = statusResp.headers['x-vqd-4'] || '';
            }

            this._chatMessages.push({ role: 'user', content: keywords });
            this._chatTokensCount += Math.max(Math.floor(keywords.length / 4), 1);

            const jsonData = {
                model: models[model],
                messages: this._chatMessages,
            };

            const chatResp: AxiosResponse<string> = await this.client.post(
                'https://duckduckgo.com/duckchat/v1/chat',
                jsonData,
                {
                    headers: { 'x-vqd-4': this._chatVqd },
                    timeout: timeout,
                }
            );

            this._chatVqd = chatResp.headers['x-vqd-4'] || '';

            const messages = this._processChatResponse(chatResp.data);

            this._chatMessages.push({ role: 'assistant', content: messages });
            this._chatTokensCount += messages.length;

            return messages;
        } catch (error) {
            throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private _processChatResponse(data: string): string {
        const lines = data.replace('data: ', '').split('\n\n');
        const results: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                try {
                    const jsonLine = trimmedLine.replace(/^\s*data:\s*/, '').trim();
                    const parsedLine = JSON.parse(jsonLine);
                    if (parsedLine.message) {
                        results.push(parsedLine.message);
                    }
                } catch (error) {
                    //console.error(`Failed to parse response: ${trimmedLine}`, error);
                }
            }
        }

        return results.join('');
    }

    private _extractVqd(responseData: string, keywords: string): string {
        const match = /vqd=([\d-]+)/.exec(responseData);
        return match ? match[1] : '';
    }
}

export default DDGS;