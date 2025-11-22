// Initialize Particles.js
particlesJS('particles-js', {
    particles: {
        number: {
            value: 80,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: "#4cc9f0"
        },
        shape: {
            type: "circle"
        },
        opacity: {
            value: 0.5,
            random: true
        },
        size: {
            value: 3,
            random: true
        },
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
            onhover: {
                enable: true,
                mode: "repulse"
            },
            onclick: {
                enable: true,
                mode: "push"
            },
            resize: true
        }
    }
});

// Digital Rain Effect
function createDigitalRain() {
    const container = document.getElementById('digitalRain');
    const columns = Math.floor(container.offsetWidth / 20);
    
    for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'rain-column';
        column.style.left = `${i * 20}px`;
        column.style.animationDelay = `${Math.random() * 20}s`;
        
        // Generate random characters
        let content = '';
        const length = Math.floor(Math.random() * 15) + 10;
        for (let j = 0; j < length; j++) {
            const chars = '01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            content += chars.charAt(Math.floor(Math.random() * chars.length)) + '<br>';
        }
        
        column.innerHTML = content;
        container.appendChild(column);
    }
}

// Neural Network Visualization
function createNeuralNetwork() {
    const container = document.getElementById('neuralNetwork');
    container.innerHTML = '';
    
    // Create layers
    const layers = [5, 8, 6, 4];
    const layerPositions = [];
    
    // Calculate node positions
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
    
    // Create connections between layers
    for (let l = 0; l < layers.length - 1; l++) {
        for (let n1 = 0; n1 < layers[l]; n1++) {
            for (let n2 = 0; n2 < layers[l + 1]; n2++) {
                const start = layerPositions[l][n1];
                const end = layerPositions[l + 1][n2];
                
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
        }
    }
}

// Sticky header
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'none';
    }
});

// Add animation to feature cards when they come into view
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
});

// Observe steps
document.querySelectorAll('.step').forEach(step => {
    step.style.opacity = '0';
    step.style.transform = 'translateY(20px)';
    step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(step);
});

// Simple typing effect for demo text
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    
    function typing() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(typing, speed);
        }
    }
    
    typing();
}

// Initialize typing effect when demo section is in view
const demoObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const demoText = document.querySelector('.text-result');
            const text = "This is the extracted text from the image. You can now copy, edit, or export this text to various formats.\n\nThe OCR technology accurately recognizes characters and preserves formatting where possible.";
            
            typeWriter(demoText, text);
            demoObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const demoSection = document.querySelector('.demo');
if (demoSection) {
    demoObserver.observe(demoSection);
}

// Add click effect to buttons
document.querySelectorAll('.btn, .cta-button, .app-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add dynamic scan effect
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

// Handle window resize
window.addEventListener('resize', function() {
    document.getElementById('digitalRain').innerHTML = '';
    createDigitalRain();
    
    createNeuralNetwork();
});

// Initialize animations when page loads
window.addEventListener('load', function() {
    createDigitalRain();
    createNeuralNetwork();
});