/**
 * TSVP — The Smart Vascular Predictor
 * Futuristic Medical AI Interactive System
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Interactive Canvas Particle System
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    const PARTICLE_COUNT = 75;

    // Mouse coordinates for gentle interactive repulsion/depth
    const mouse = {
        x: -9999,
        y: -9999,
        targetX: -9999,
        targetY: -9999,
        isActive: false
    };

    function initCanvasDimensions() {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 10;
            this.size = Math.random() * 2.0 + 0.8;
            this.baseAlpha = Math.random() * 0.45 + 0.2;
            this.alpha = this.baseAlpha;
            this.vy = -(Math.random() * 0.35 + 0.15); // Gently drifts upwards
            this.vx = (Math.random() - 0.5) * 0.25;
            this.pulseSpeed = Math.random() * 0.02 + 0.01;
            this.pulseAngle = Math.random() * Math.PI * 2;

            // Palette: Electric Cyan, Ice Blue, and Occasional Scarlet Glow Dust
            const rand = Math.random();
            if (rand < 0.7) {
                // Electric Cyan
                this.color = { r: 0, g: 243, b: 255 };
            } else if (rand < 0.9) {
                // Pale Ice Blue
                this.color = { r: 165, g: 243, b: 252 };
            } else {
                // Subtle Vascular Crimson Spark
                this.color = { r: 255, g: 30, b: 66 };
                this.size = Math.random() * 1.5 + 0.6;
            }
        }

        update() {
            this.pulseAngle += this.pulseSpeed;
            this.alpha = this.baseAlpha + Math.sin(this.pulseAngle) * 0.15;
            this.alpha = Math.max(0.05, Math.min(1, this.alpha));

            this.x += this.vx;
            this.y += this.vy;

            // Mouse proximity influence (gentle magnetic drift)
            if (mouse.isActive) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 130;

                if (dist < maxDist && dist > 0) {
                    const force = (1 - dist / maxDist) * 1.2;
                    this.x += (dx / dist) * force;
                    this.y += (dy / dist) * force;
                }
            }

            // Wrap around edges
            if (this.y < -20) {
                this.reset(false);
            }
            if (this.x < -20) this.x = width + 20;
            if (this.x > width + 20) this.x = -20;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
            ctx.shadowBlur = this.size * 5;
            ctx.fill();
        }
    }

    function createParticleSystem() {
        particles = [];
        const count = width < 768 ? Math.floor(PARTICLE_COUNT * 0.55) : PARTICLE_COUNT;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function renderParticles() {
        ctx.clearRect(0, 0, width, height);

        // Smooth mouse coords easing
        if (mouse.isActive) {
            mouse.x += (mouse.targetX - mouse.x) * 0.1;
            mouse.y += (mouse.targetY - mouse.y) * 0.1;
        }

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            // Subtle connecting neural filaments between close particles
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 75) {
                    const lineAlpha = (1 - dist / 75) * 0.12 * Math.min(particles[i].alpha, particles[j].alpha);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 243, 255, ${lineAlpha})`;
                    ctx.lineWidth = 0.75;
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(renderParticles);
    }

    // -------------------------------------------------------------------------
    // 2. Holographic Parallax on Mouse Movement
    // -------------------------------------------------------------------------
    const heartWrapper = document.getElementById('heartWrapper');
    const hudRings = document.getElementById('hudRings');
    let tiltX = 0;
    let tiltY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;

    function handleMouseMove(e) {
        mouse.isActive = true;
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;

        // Subtle 3D perspective tilt
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const normX = (e.clientX - centerX) / centerX;
        const normY = (e.clientY - centerY) / centerY;

        targetTiltX = -normY * 8; // degrees
        targetTiltY = normX * 8;
    }

    function handleMouseLeave() {
        mouse.isActive = false;
        targetTiltX = 0;
        targetTiltY = 0;
    }

    function updateParallax() {
        tiltX += (targetTiltX - tiltX) * 0.08;
        tiltY += (targetTiltY - tiltY) * 0.08;

        if (heartWrapper) {
            heartWrapper.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
        }
        if (hudRings) {
            hudRings.style.transform = `translate(-50%, -50%) rotateX(${(tiltX * 0.6).toFixed(2)}deg) rotateY(${(tiltY * 0.6).toFixed(2)}deg)`;
        }

        requestAnimationFrame(updateParallax);
    }

    // -------------------------------------------------------------------------
    // 3. Subtle Cardiac Telemetry Variation
    // -------------------------------------------------------------------------
    const bpmDisplay = document.getElementById('hud-bpm-display');
    if (bpmDisplay) {
        let currentBpm = 72;
        setInterval(() => {
            // Realistic subtle sinus heart-rate variability (70 - 74 BPM)
            const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.65 ? 1 : 0);
            currentBpm = Math.max(70, Math.min(74, currentBpm + delta));
            bpmDisplay.innerHTML = `${currentBpm} BPM &bull; SINUS RHYTHM`;
        }, 4000);
    }

    // -------------------------------------------------------------------------
    // 4. Window Event Listeners
    // -------------------------------------------------------------------------
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initCanvasDimensions();
            createParticleSystem();
        }, 150);
    });

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Initializer
    initCanvasDimensions();
    createParticleSystem();
    renderParticles();
    updateParallax();

})();
