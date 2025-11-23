// =======================================================================
// === OCR APPLICATION - MAIN SCRIPT ===
// =======================================================================

/**
 * i2t OCR - Main Application Script
 * Handles OCR functionality, UI interactions, and animations
 */

// =======================================================================
// === CONFIGURATION CONSTANTS ===
// =======================================================================

const OCR_API_CONFIG = {
    ENDPOINT: 'http://5.75.197.39:8000/ocr',
    MIN_LOADING_TIME_MS: 3000,
    TESSERACT_CONFIG: '--psm 4'
};

// =======================================================================
// === ELEMENT SELECTORS ===
// =======================================================================

// OCR Tool Elements
const elements = {
    // File Upload
    imageUpload: document.getElementById('imageUpload'),
    uploadArea: document.getElementById('uploadArea'),
    
    // Preview & Results
    toolComparison: document.getElementById('toolComparison'),
    imagePreview: document.getElementById('imagePreview'),
    extractedText: document.getElementById('extractedText'),
    
    // Controls
    processControls: document.getElementById('processControls'),
    processButton: document.getElementById('processButton'),
    copyButton: document.getElementById('copyButton'),
    resetButton: document.getElementById('resetButton'),
    
    // Modal
    languageModalBackdrop: document.getElementById('languageModalBackdrop'),
    modalOcrLang: document.getElementById('modalOcrLang'),
    confirmLangButton: document.getElementById('confirmLangButton'),
    cancelLangButton: document.getElementById('cancelLangButton'),
    
    // CTA
    iosAppCta: document.getElementById('iosAppCta'),
    
    // Sections
    ocrToolSection: document.getElementById('ocr-tool'),
    neuralNetwork: document.getElementById('neuralNetwork'),
    digitalRain: document.getElementById('digitalRain')
};

// =======================================================================
// === INITIALIZATION ===
// =======================================================================

/**
 * Initialize the application when DOM is loaded
 */
function initializeApp() {
    initializeEventListeners();
    initializeAnimations();
    setCurrentYear();
}

/**
 * Set current year in footer
 */
function setCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    initializeOcrEventListeners();
    initializeModalEventListeners();
    initializeCtaEventListeners();
    initializeScrollEffects();
}

/**
 * Initialize OCR tool event listeners
 */
function initializeOcrEventListeners() {
    if (!elements.ocrToolSection) return;

    // File selection and drag/drop
    elements.imageUpload.addEventListener('change', handleFileSelect);
    
    if (elements.uploadArea) {
        elements.uploadArea.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                elements.imageUpload.click();
            }
        });
        
        // Drag and drop handlers
        ['dragover', 'dragleave', 'drop'].forEach(event => {
            elements.uploadArea.addEventListener(event, handleDragEvent);
        });
    }

    // OCR process buttons
    if (elements.processButton) {
        elements.processButton.addEventListener('click', handleOcrProcess);
    }

    if (elements.resetButton) {
        elements.resetButton.addEventListener('click', handleReset);
    }

    if (elements.copyButton) {
        elements.copyButton.addEventListener('click', copyTextToClipboard);
    }
}

/**
 * Initialize modal event listeners
 */
function initializeModalEventListeners() {
    if (elements.confirmLangButton) {
        elements.confirmLangButton.addEventListener('click', handleLanguageConfirm);
    }
    
    if (elements.cancelLangButton) {
        elements.cancelLangButton.addEventListener('click', closeLanguageModal);
    }
}

/**
 * Initialize CTA event listeners
 */
function initializeCtaEventListeners() {
    if (elements.iosAppCta) {
        elements.iosAppCta.addEventListener('click', () => {
            alert('The iOS App is Coming Soon! Stay tuned for updates.');
        });
    }
}

/**
 * Initialize scroll effects and observers
 */
function initializeScrollEffects() {
    // Sticky header shadow
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = 'none';
        }
    });

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe feature cards and steps
    document.querySelectorAll('.feature-card, .step').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(element);
    });
}

// =======================================================================
// === DRAG AND DROP HANDLERS ===
// =======================================================================

/**
 * Handle drag and drop events
 */
function handleDragEvent(e) {
    e.preventDefault();
    
    switch(e.type) {
        case 'dragover':
            elements.uploadArea.style.borderColor = 'var(--primary)';
            break;
        case 'dragleave':
            elements.uploadArea.style.borderColor = 'var(--success)';
            break;
        case 'drop':
            elements.uploadArea.style.borderColor = 'var(--success)';
            elements.imageUpload.files = e.dataTransfer.files;
            handleFileSelect();
            break;
    }
}

// =======================================================================
// === FILE HANDLING ===
// =======================================================================

/**
 * Handle file selection and display preview
 */
function handleFileSelect() {
    const file = elements.imageUpload.files[0];
    
    if (!file) return;

    // Update UI state
    elements.uploadArea.style.display = 'none';
    elements.toolComparison.style.display = 'grid';
    elements.processControls.style.display = 'flex';
    elements.extractedText.value = '';
    
    // Reset process button
    elements.processButton.disabled = false;
    elements.processButton.innerHTML = '<i class="fas fa-robot"></i> Run OCR';

    // Display image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Image Preview">`;
    };
    reader.readAsDataURL(file);
}

// =======================================================================
// === OCR PROCESSING ===
// =======================================================================

/**
 * Handle OCR process initiation
 */
function handleOcrProcess() {
    applyClickAnimation(elements.processButton);
    openLanguageModal();
}

/**
 * Create loading overlay element
 */
function createLoadingOverlay(message) {
    const overlay = document.createElement('div');
    overlay.className = 'ai-loader-overlay';
    overlay.id = 'ocrLoadingOverlay';

    overlay.innerHTML = `
        <div class="ai-loader-container">
            <div class="ai-loader">
                <div></div>
                <div></div>
                <div></div>
            </div>
            <p>${message}</p>
        </div>
    `;

    return overlay;
}

/**
 * Simulate minimum loading time
 */
function simulateLoading() {
    return new Promise(resolve => {
        setTimeout(resolve, OCR_API_CONFIG.MIN_LOADING_TIME_MS);
    });
}

/**
 * Send OCR request to API
 */
async function sendOcrApiRequest(file, selectedLang) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', selectedLang);
    formData.append('config', OCR_API_CONFIG.TESSERACT_CONFIG);
    
    const response = await fetch(OCR_API_CONFIG.ENDPOINT, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.detail || `HTTP Error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
    }
    
    return data;
}

/**
 * Submit OCR request and handle response
 */
async function submitOcrRequest(selectedLang) {
    const file = elements.imageUpload.files[0];
    if (!file) return;

    // Show loading state
    const loadingOverlay = createLoadingOverlay('<i class="fas fa-microchip"></i> Analyzing Image...');
    elements.toolComparison.appendChild(loadingOverlay);
    elements.processButton.disabled = true;

    try {
        // Run API request and minimum loading time concurrently
        const [ocrData] = await Promise.all([
            sendOcrApiRequest(file, selectedLang),
            simulateLoading()
        ]);

        loadingOverlay.remove();
        
        // Handle response
        if (ocrData.status === "success" && ocrData.data?.text) {
            elements.extractedText.value = ocrData.data.text;
        } else {
            elements.extractedText.value = "Unknown response format from service.";
        }

    } catch (error) {
        loadingOverlay.remove();
        console.error('OCR Error:', error);
        elements.extractedText.value = `Error: ${error.message}`;
    } finally {
        // Reset button state
        elements.processButton.innerHTML = '<i class="fas fa-robot"></i> Run OCR';
        elements.processButton.disabled = false;
    }
}

// =======================================================================
// === MODAL HANDLING ===
// =======================================================================

/**
 * Open language selection modal
 */
function openLanguageModal() {
    if (!elements.imageUpload.files[0]) {
        alert("Please select an image first before choosing the language.");
        return;
    }
    elements.languageModalBackdrop.classList.add('is-visible');
    elements.modalOcrLang.value = '';
}

/**
 * Close language selection modal
 */
function closeLanguageModal() {
    elements.languageModalBackdrop.classList.remove('is-visible');
}

/**
 * Handle language confirmation
 */
function handleLanguageConfirm() {
    if (elements.modalOcrLang.value) {
        applyClickAnimation(elements.confirmLangButton);
        closeLanguageModal();
        submitOcrRequest(elements.modalOcrLang.value);
    } else {
        alert("Please select a language.");
    }
}

// =======================================================================
// === UTILITY FUNCTIONS ===
// =======================================================================

/**
 * Reset OCR tool to initial state
 */
function handleReset() {
    applyClickAnimation(elements.resetButton);
    
    elements.imageUpload.value = '';
    elements.toolComparison.style.display = 'none';
    elements.processControls.style.display = 'none';
    elements.imagePreview.innerHTML = '';
    elements.extractedText.value = '';
    elements.copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
    elements.uploadArea.style.display = 'block';
}

/**
 * Copy text to clipboard
 */
function copyTextToClipboard() {
    if (!elements.extractedText.value) return;

    elements.extractedText.select();
    elements.extractedText.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(elements.extractedText.value);
        elements.copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            elements.copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
        }, 2000);
    } catch (err) {
        alert('Could not copy automatically. Please copy the text manually.');
    }
}

/**
 * Apply click animation to button
 */
function applyClickAnimation(buttonElement) {
    if (!buttonElement) return;
    
    buttonElement.classList.add('animating');
    setTimeout(() => {
        buttonElement.classList.remove('animating');
    }, 200);
}

// =======================================================================
// === ANIMATIONS & VISUALIZATIONS ===
// =======================================================================

/**
 * Initialize all animations
 */
function initializeAnimations() {
    initializeParticles();
    initializeDigitalRain();
    initializeNeuralNetwork();
    initializeButtonEffects();
    initializeScanEffect();
}

/**
 * Initialize particles.js background
 */
function initializeParticles() {
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: "#4cc9f0" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: "#4cc9f0",
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "repulse" },
                    onclick: { enable: true, mode: "push" },
                    resize: true
                }
            }
        });
    }
}

/**
 * Initialize digital rain effect
 */
function initializeDigitalRain() {
    createDigitalRain();
    window.addEventListener('resize', createDigitalRain);
}

/**
 * Create digital rain animation
 */
function createDigitalRain() {
    const container = elements.digitalRain;
    if (!container) return;
    
    container.innerHTML = '';
    const columns = Math.floor(container.offsetWidth / 20);
    
    for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'rain-column';
        column.style.left = `${i * 20}px`;
        column.style.animationDelay = `${Math.random() * 20}s`;
        
        let content = '';
        const length = Math.floor(Math.random() * 15) + 10;
        const chars = '01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        for (let j = 0; j < length; j++) {
            content += chars.charAt(Math.floor(Math.random() * chars.length)) + '<br>';
        }
        
        column.innerHTML = content;
        container.appendChild(column);
    }
}

/**
 * Initialize neural network visualization
 */
function initializeNeuralNetwork() {
    createNeuralNetwork();
    window.addEventListener('resize', createNeuralNetwork);
}

/**
 * Create neural network animation
 */
function createNeuralNetwork() {
    const container = elements.neuralNetwork;
    if (!container) return;
    
    container.innerHTML = '';
    const layers = [5, 8, 6, 4];
    const layerPositions = [];
    
    // Create nodes
    for (let l = 0; l < layers.length; l++) {
        const layerNodes = layers[l];
        layerPositions[l] = [];
        
        for (let n = 0; n < layerNodes; n++) {
            const x = (l + 1) * (container.offsetWidth / (layers.length + 1));
            const y = (n + 1) * (container.offsetHeight / (layerNodes + 1));
            
            const node = document.createElement('div');
            node.className = 'node';
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(node);
            
            layerPositions[l][n] = { x, y };
        }
    }
    
    // Create connections
    for (let l = 0; l < layers.length - 1; l++) {
        for (let n1 = 0; n1 < layers[l]; n1++) {
            for (let n2 = 0; n2 < layers[l + 1]; n2++) {
                createConnection(layerPositions[l][n1], layerPositions[l + 1][n2], container);
            }
        }
    }
}

/**
 * Create connection between nodes
 */
function createConnection(start, end, container) {
    const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    
    const connection = document.createElement('div');
    connection.className = 'connection';
    connection.style.left = `${start.x}px`;
    connection.style.top = `${start.y}px`;
    connection.style.width = `${length}px`;
    connection.style.transform = `rotate(${angle}deg)`;
    connection.style.animationDelay = `${Math.random() * 3}s`;
    container.appendChild(connection);
}

/**
 * Initialize button effects
 */
function initializeButtonEffects() {
    document.querySelectorAll('.btn:not(#copyButton), .cta-button, .app-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            // Skip buttons with custom animations
            if (['processButton', 'resetButton', 'confirmLangButton', 'cancelLangButton'].includes(this.id)) {
                return;
            }
            createRippleEffect(this, e);
        });
    });
}

/**
 * Create ripple effect on button click
 */
function createRippleEffect(button, e) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

/**
 * Initialize scan area effect
 */
function initializeScanEffect() {
    const scanArea = document.querySelector('.scan-area');
    if (scanArea) {
        scanArea.addEventListener('click', function() {
            const scanLine = document.querySelector('.scan-line');
            scanLine.style.animation = 'none';
            setTimeout(() => {
                scanLine.style.animation = 'scan 2s ease-in-out infinite';
            }, 10);
        });
    }
}

// =======================================================================
// === APPLICATION START ===
// =======================================================================

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Reinitialize animations when page fully loads
window.addEventListener('load', () => {
    createDigitalRain();
    createNeuralNetwork();
});