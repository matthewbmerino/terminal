import config from '/static/js/config.js';

class AIChat {
    constructor() {
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-message');
        this.modelSelect = document.getElementById('model-select');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatStatus = document.querySelector('.chat-status');
        this.loadingSpinner = document.querySelector('.loading-spinner');
        this.buttonText = document.querySelector('.button-text');
        
        // Add null checks for required elements
        if (!this.chatInput || !this.sendButton || !this.chatMessages) {
            console.error('Required chat elements not found in DOM');
            return;
        }
        
        // Make loading elements optional
        this.hasLoadingElements = this.loadingSpinner && this.buttonText && this.chatStatus;
        
        // Update to use local endpoint
        this.API_URL = '/api/chat';  // This will call your Flask backend
        this.API_KEY = config.PERPLEXITY_API_KEY;
        
        this.setupEventListeners();
        
        // Add expand button handler
        this.chatBox = document.querySelector('.right-panel .box:has(#chat-wrapper)');
        this.expandButton = document.getElementById('chat-expand');
        this.isExpanded = false;
        
        if (this.expandButton) {
            this.expandButton.addEventListener('click', () => this.toggleExpand());
        }
    }

    setupEventListeners() {
        this.chatInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.chatInput.value.trim();
            this.autoResizeInput();
        });

        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.sendButton.disabled) {
                    this.sendMessage();
                }
            }
        });
    }

    autoResizeInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.addMessageToChat('user', message);
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.sendButton.disabled = true;
        this.setLoadingState(true);

        try {
            await this.streamPerplexityAPI(message);
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToChat('ai', 'Sorry, there was an error processing your request.');
        }

        this.setLoadingState(false);
    }

    async streamPerplexityAPI(message) {
        const model = this.modelSelect.value;
        
        try {
            const requestBody = {
                model: model,
                messages: [{
                    role: 'user',
                    content: message
                }],
                stream: true
            };

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            let aiMessage = document.createElement('div');
            aiMessage.className = 'chat-message ai-message';
            this.chatMessages.appendChild(aiMessage);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = line.slice(6).trim(); // Remove 'data: ' prefix and trim
                            if (data === '[DONE]') continue;
                            
                            // Log the data for debugging
                            console.log('Parsing data:', data);
                            
                            const parsed = JSON.parse(data);
                            if (parsed.choices && 
                                parsed.choices[0] && 
                                parsed.choices[0].delta && 
                                parsed.choices[0].delta.content) {
                                aiMessage.textContent += parsed.choices[0].delta.content;
                                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                            }
                        } catch (parseError) {
                            console.warn('Error parsing chunk:', {
                                line: line,
                                error: parseError,
                                data: line.slice(6).trim()
                            });
                            continue;
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error details:', error);
            throw error;
        }
    }

    addMessageToChat(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;
        messageDiv.textContent = content;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setLoadingState(isLoading) {
        // Only manipulate loading elements if they exist
        if (this.hasLoadingElements) {
            this.loadingSpinner.style.display = isLoading ? 'block' : 'none';
            this.buttonText.style.display = isLoading ? 'none' : 'block';
            this.chatStatus.style.display = isLoading ? 'block' : 'none';
        }
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            this.chatBox.classList.add('expanded');
            this.expandButton.querySelector('.expand-icon').textContent = '⤡';
        } else {
            this.chatBox.classList.remove('expanded');
            this.expandButton.querySelector('.expand-icon').textContent = '⤢';
        }
    }

    cleanApiResponse(rawText) {
        if (!rawText) return '';
        
        // Remove markdown code blocks and backticks
        let cleaned = rawText.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`/g, '');
        
        // Remove horizontal rules
        cleaned = cleaned.replace(/---/g, '');
        
        // Format headers with proper spacing
        cleaned = cleaned.replace(/#{1,3}\s*\*?\*?([^*\n]+)\*?\*?/g, (match, title) => {
            const level = (match.match(/#/g) || []).length;
            const indent = '  '.repeat(level - 1);
            return `\n${indent}${title.trim()}:\n`;
        });
        
        // Format bullet points with proper indentation
        cleaned = cleaned.replace(/^-\s*(.+)$/gm, (match, content) => {
            if (content.includes(':')) {
                return `\n• ${content.trim()}\n`;
            }
            return `  • ${content.trim()}`;
        });
        
        // Format sections
        cleaned = cleaned.replace(/(Problem Statement|Solution Overview|Key Features|Market Opportunity|Potential Impact):/g, '\n$1:\n');
        
        // Clean up multiple newlines and spaces
        cleaned = cleaned
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ ]{2,}/g, ' ')
            .trim();
        
        // Handle reasoning/explanation blocks
        const sections = cleaned.split(/(Reasoning:|Explanation:)/i);
        let mainResponse = sections[0];
        let reasoning = '';
        
        if (sections.length > 1) {
            reasoning = sections.slice(1).join('');
            reasoning = `\nReasoning:\n${reasoning.trim().split('\n').map(line => `  ${line.trim()}`).join('\n')}`;
        }
        
        // Compose final response with proper spacing
        let final = mainResponse
            .replace(/\n{3,}/g, '\n\n')
            .replace(/([.!?])\s+/g, '$1\n')  // Add line break after sentences
            .replace(/(Step \d+:)/g, '\n$1\n');
            
        if (reasoning) {
            final += `\n${reasoning}`;
        }
        
        return final.slice(0, 1500);
    }
}

class ChatUI {
    constructor() {
        this.wrapper = document.getElementById('chat-wrapper');
        this.expandButton = document.getElementById('expand-chat');
        this.isExpanded = false;
        
        this.initialize();
    }
    
    initialize() {
        this.expandButton.addEventListener('click', () => this.toggleExpand());
        
        // Add keyboard shortcut (Esc) to collapse
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.toggleExpand();
            }
        });
    }
    
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        this.wrapper.classList.toggle('expanded');
        
        // Update icon
        const icon = this.expandButton.querySelector('i');
        icon.classList.toggle('fa-expand');
        icon.classList.toggle('fa-compress');
        
        // Scroll chat to bottom after expansion
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize the chat when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIChat();
    new ChatUI();
}); 