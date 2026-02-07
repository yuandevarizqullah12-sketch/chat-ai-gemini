// Chat application
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatHistory = document.getElementById('chat-history');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const chatMode = document.getElementById('chat-mode');
    const clearHistoryBtn = document.getElementById('clear-history');
    
    // State variables
    let currentImage = null;
    let isProcessing = false;
    let chatMessages = [];
    
    // Load chat history from localStorage
    loadChatHistory();
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Send message on Enter (without Shift)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    sendButton.addEventListener('click', sendMessage);
    
    // Image upload handler
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/jpg')) {
                alert('Hanya file JPEG, JPG, atau PNG yang diizinkan.');
                this.value = '';
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file maksimal 5MB.');
                this.value = '';
                return;
            }
            
            // Preview image
            const reader = new FileReader();
            reader.onload = function(event) {
                currentImage = {
                    data: event.target.result,
                    name: file.name,
                    type: file.type
                };
                
                // Show preview
                imagePreview.innerHTML = `
                    <img src="${event.target.result}" class="preview-image" alt="Preview">
                    <div class="preview-info">
                        <div>${file.name}</div>
                        <div>${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button class="remove-image" id="remove-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                // Add remove image handler
                document.getElementById('remove-image').addEventListener('click', removeImage);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Clear history button
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('Apakah Anda yakin ingin menghapus semua riwayat chat?')) {
            localStorage.removeItem('chatMessages');
            chatMessages = [];
            chatHistory.innerHTML = '';
            addWelcomeMessage();
        }
    });
    
    // Functions
    function sendMessage() {
        const message = messageInput.value.trim();
        
        // Don't send empty messages
        if (!message && !currentImage) return;
        
        // Disable send button while processing
        isProcessing = true;
        sendButton.disabled = true;
        
        // Add user message to chat
        const userMessageId = addMessageToChat('user', message, currentImage);
        
        // Clear input and preview
        messageInput.value = '';
        messageInput.style.height = 'auto';
        removeImage();
        
        // Show typing indicator
        showTypingIndicator();
        
        // Prepare data for API
        const payload = {
            message: message,
            mode: chatMode.value
        };
        
        // Add image data if present
        if (currentImage) {
            payload.image = currentImage.data;
        }
        
        // Send to backend API
        fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add AI response to chat
            addMessageToChat('ai', data.response, null, data.searchUsed);
            
            // Save updated chat history
            saveChatHistory();
            
            // Re-enable send button
            isProcessing = false;
            sendButton.disabled = false;
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Show error message
            addMessageToChat('ai', `Maaf, terjadi kesalahan: ${error.message}. Silakan coba lagi.`, null, false);
            
            // Save chat history (including error)
            saveChatHistory();
            
            // Re-enable send button
            isProcessing = false;
            sendButton.disabled = false;
        });
    }
    
    function addMessageToChat(sender, message, image = null, searchUsed = false) {
        const messageId = Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date().toISOString();
        
        let messageHTML = `
            <div class="message ${sender}-message" id="message-${messageId}">
                <div class="message-header">
                    <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                    <span class="sender">${sender === 'user' ? 'Anda' : 'AI Assistant'}</span>
                    <span class="time">${time}</span>
                </div>
                <div class="message-content">${formatMessage(message)}</div>
        `;
        
        // Add image if present
        if (image && sender === 'user') {
            messageHTML += `<img src="${image.data}" class="message-image" alt="Uploaded image">`;
        }
        
        // Add disclaimer for AI messages
        if (sender === 'ai') {
            messageHTML += `
                <div class="disclaimer-text">
                    <i class="fas fa-info-circle"></i>
                    This AI is powered by Google Gemini API.
                    ${searchUsed ? ' (Mode AI + Search aktif)' : ''}
                </div>
            `;
        }
        
        messageHTML += '</div>';
        
        // Remove welcome message if it's the first user message
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && sender === 'user') {
            welcomeMessage.remove();
        }
        
        // Append message to chat history
        chatHistory.insertAdjacentHTML('beforeend', messageHTML);
        
        // Add to chatMessages array for saving
        const messageData = {
            id: messageId,
            sender: sender,
            message: message,
            image: image ? image.data : null,
            timestamp: date,
            searchUsed: searchUsed || false
        };
        
        chatMessages.push(messageData);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        return messageId;
    }
    
    function formatMessage(text) {
        // Convert newlines to <br>
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }
    
    function showTypingIndicator() {
        const typingHTML = `
            <div class="typing-indicator" id="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        chatHistory.insertAdjacentHTML('beforeend', typingHTML);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    function removeImage() {
        currentImage = null;
        imagePreview.innerHTML = '';
        imageUpload.value = '';
    }
    
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('chatMessages');
        
        if (savedHistory) {
            try {
                const parsedData = JSON.parse(savedHistory);
                
                // Clear chat history
                chatHistory.innerHTML = '';
                
                // Check if data is in old format (the problematic format)
                if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                    // This is the problematic format like {"ai-only": [...]}
                    console.log('Detected old chat format, converting...');
                    
                    // Try to extract messages from the object
                    const keys = Object.keys(parsedData);
                    chatMessages = [];
                    
                    keys.forEach(key => {
                        if (Array.isArray(parsedData[key])) {
                            parsedData[key].forEach(msg => {
                                if (msg.content && typeof msg.content === 'string') {
                                    const messageData = {
                                        id: Date.now() + Math.random(),
                                        sender: msg.isUser ? 'user' : 'ai',
                                        message: msg.content,
                                        image: null,
                                        timestamp: msg.timestamp || new Date().toISOString(),
                                        searchUsed: false
                                    };
                                    chatMessages.push(messageData);
                                }
                            });
                        }
                    });
                    
                    // Render all messages
                    renderAllMessages();
                } 
                // Check if data is in the correct format (array)
                else if (Array.isArray(parsedData)) {
                    chatMessages = parsedData;
                    renderAllMessages();
                } 
                else {
                    // Invalid format, start fresh
                    console.error('Invalid chat history format');
                    addWelcomeMessage();
                    chatMessages = [];
                }
                
            } catch (error) {
                console.error('Error loading chat history:', error);
                addWelcomeMessage();
                chatMessages = [];
            }
        } else {
            addWelcomeMessage();
        }
    }
    
    function renderAllMessages() {
        // Clear chat history
        chatHistory.innerHTML = '';
        
        if (chatMessages.length === 0) {
            addWelcomeMessage();
            return;
        }
        
        // Sort messages by timestamp (oldest first)
        chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Render each message
        chatMessages.forEach(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let messageHTML = `
                <div class="message ${msg.sender}-message" id="message-${msg.id}">
                    <div class="message-header">
                        <i class="fas ${msg.sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                        <span class="sender">${msg.sender === 'user' ? 'Anda' : 'AI Assistant'}</span>
                        <span class="time">${time}</span>
                    </div>
                    <div class="message-content">${formatMessage(msg.message)}</div>
            `;
            
            // Add image if present
            if (msg.image && msg.sender === 'user') {
                messageHTML += `<img src="${msg.image}" class="message-image" alt="Uploaded image">`;
            }
            
            // Add disclaimer for AI messages
            if (msg.sender === 'ai') {
                messageHTML += `
                    <div class="disclaimer-text">
                        <i class="fas fa-info-circle"></i>
                        This AI is powered by Google Gemini API.
                        ${msg.searchUsed ? ' (Mode AI + Search aktif)' : ''}
                    </div>
                `;
            }
            
            messageHTML += '</div>';
            
            chatHistory.insertAdjacentHTML('beforeend', messageHTML);
        });
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function saveChatHistory() {
        // Don't save if no messages
        if (chatMessages.length === 0) {
            localStorage.removeItem('chatMessages');
            return;
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
        } catch (error) {
            console.error('Error saving chat history:', error);
            
            // If storage is full, keep only the last 20 messages
            if (error.name === 'QuotaExceededError') {
                alert('Penyimpanan browser penuh. Hanya menyimpan 20 pesan terakhir.');
                chatMessages = chatMessages.slice(-20);
                localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
            }
        }
    }
    
    function addWelcomeMessage() {
        // Check if welcome message already exists
        const existingWelcome = document.querySelector('.welcome-message');
        if (!existingWelcome) {
            chatHistory.innerHTML = `
                <div class="welcome-message">
                    <h2><i class="fas fa-comments"></i> Selamat Datang di AI Chat</h2>
                    <p>Pilih mode chat dan mulai percakapan dengan AI. Semua percakapan disimpan di browser Anda.</p>
                    <div class="features">
                        <div class="feature">
                            <i class="fas fa-keyboard"></i>
                            <span>Kirim pesan teks</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-image"></i>
                            <span>Upload gambar (jpeg, png)</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-search"></i>
                            <span>Mode AI + Search untuk info terbaru</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
});