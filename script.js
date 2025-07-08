document.addEventListener('DOMContentLoaded', function () {
    let arOpen = false;
    let animationStarted = false;
    let animationTimeout = null;
    let photoTaken = false;
    let stableStartTime = null;
    let lastOrientation = { beta: 0, gamma: 0, alpha: 0 };
    let lastMotion = { x: 0, y: 0, z: 0 };

    const bottomContainer = document.querySelector('.bottom-container');
    const captureArea = document.querySelector('.capture-area');
    const mapSection = document.querySelector('.map-section');
    const infoSection = document.querySelector('.info-section');
    const container = document.querySelector('.container');

   
    function openAR() {
        if (arOpen) return;
        arOpen = true;
       
        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
        aScene.style.position = 'absolute';
        aScene.style.top = '0';
        aScene.style.left = '0';
        aScene.style.width = '100%';
        aScene.style.height = '60vh'; 
        aScene.style.zIndex = '1';
        aScene.setAttribute('embedded', '');
        aScene.id = 'ar-scene';
        document.body.appendChild(aScene);
        bottomContainer.style.height = '40%';
        if (container) container.style.zIndex = '100';
    }

    function closeAR() {
        if (!arOpen) return;
        arOpen = false;
        const aScene = document.getElementById('ar-scene');
        if (aScene) aScene.remove();
        bottomContainer.style.height = '100%';
        if (container) container.style.zIndex = '';
        if (captureArea) captureArea.classList.remove('animate-progress');
        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);
    }

    function startAnimation() {
        if (animationStarted || photoTaken) return;
        animationStarted = true;
        if (captureArea) captureArea.classList.add('animate-progress');
        animationTimeout = setTimeout(() => {
            takePhoto();
        }, 1600);
    }

    function takePhoto() {
        if (photoTaken) return;
        photoTaken = true;
        const video = document.querySelector('video');
        if (!video || video.readyState < 2) {
            alert('Kamera görüntüsü alınamıyor!');
            return;
        }
        const cap = captureArea.getBoundingClientRect();
        const vid = video.getBoundingClientRect();
        const scaleX = video.videoWidth / vid.width;
        const scaleY = video.videoHeight / vid.height;
        const sx = (cap.left - vid.left) * scaleX;
        const sy = (cap.top - vid.top) * scaleY;
        const sw = cap.width * scaleX;
        const sh = cap.height * scaleY;
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
        const popup = document.getElementById('photo-popup');
        const img = document.getElementById('cropped-photo');
        img.src = canvas.toDataURL('image/png');
        popup.style.display = 'flex';

        if (captureArea) captureArea.classList.remove('animate-progress');
    }


    function isDeviceStable(event) {
        const threshold = 1; 
        const diffBeta = Math.abs(event.beta - lastOrientation.beta);
        const diffGamma = Math.abs(event.gamma - lastOrientation.gamma);
        const diffAlpha = Math.abs(event.alpha - lastOrientation.alpha);
        lastOrientation = { beta: event.beta, gamma: event.gamma, alpha: event.alpha };
        return (diffBeta < threshold && diffGamma < threshold && diffAlpha < threshold);
    }


    function getPitch(event) {
        return Math.abs(event.beta); 
    }


    window.addEventListener('deviceorientation', function (event) {
        const pitch = getPitch(event);
        if (pitch >= 50) {
            openAR();
            if (isDeviceStable(event)) {
                if (!stableStartTime) stableStartTime = Date.now();
                if (Date.now() - stableStartTime > 500) {
                    startAnimation();
                }
            } else {
                stableStartTime = null;
                if (captureArea) captureArea.classList.remove('animate-progress');
                animationStarted = false;
                if (animationTimeout) clearTimeout(animationTimeout);
            }
        } else {
            closeAR();
        }
    });
});