document.addEventListener('DOMContentLoaded', function () {
    let arOpen = false;
    let animationStarted = false;
    let animationTimeout = null;
    let photoTaken = false;
    let stableStartTime = null;
    let lastOrientation = { beta: 0, gamma: 0, alpha: 0 };
    let lastMotion = { x: 0, y: 0, z: 0 };
    let onboardingStep = 0;
    const onboardingSteps = [
        {
            logo: '<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#7daef1"><animate attributeName="r" values="20;24;20" dur="1.2s" repeatCount="indefinite"/></circle></svg>',
            title: 'Raise your phone',
            desc: 'To start scanning, please raise your phone and hold it steady.'
        },
        {
            logo: '<svg width="48" height="48" viewBox="0 0 48 48"><rect x="12" y="12" width="24" height="24" rx="6" fill="#7daef1"><animate attributeName="rx" values="6;12;6" dur="1.2s" repeatCount="indefinite"/></rect></svg>',
            title: 'Align the area',
            desc: 'Align the object you want to scan within the frame.'
        },
        {
            logo: '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,8 40,40 8,40" fill="#7daef1"><animate attributeName="points" values="24,8 40,40 8,40;24,12 38,38 10,38;24,8 40,40 8,40" dur="1.2s" repeatCount="indefinite"/></polygon></svg>',
            title: 'Hold steady',
            desc: 'Keep your phone steady for a moment to capture the scan.'
        }
    ];
    const notificationBar = document.getElementById('notification-bar');
    const onboardingPopup = document.getElementById('onboarding-popup');
    const onboardingLogo = document.getElementById('onboarding-logo');
    const onboardingTitle = document.getElementById('onboarding-title');
    const onboardingDesc = document.getElementById('onboarding-desc');
    const onboardingPrev = document.getElementById('onboarding-prev');
    const onboardingNext = document.getElementById('onboarding-next');
    const onboardingClose = document.getElementById('onboarding-close');

    // Bildirim barını göster
    notificationBar.style.display = 'block';
    setTimeout(() => {
        notificationBar.style.display = 'none';
    }, 3000);

    function showOnboardingStep(step) {
        onboardingLogo.innerHTML = onboardingSteps[step].logo;
        onboardingTitle.textContent = onboardingSteps[step].title;
        onboardingDesc.textContent = onboardingSteps[step].desc;
        onboardingPrev.style.display = step === 0 ? 'none' : 'inline-block';
        onboardingNext.style.display = step === onboardingSteps.length - 1 ? 'none' : 'inline-block';
        onboardingClose.style.display = step === onboardingSteps.length - 1 ? 'inline-block' : 'none';
    }

    function openOnboarding() {
        onboardingStep = 0;
        onboardingPopup.style.display = 'flex';
        showOnboardingStep(onboardingStep);
    }
    function closeOnboarding() {
        onboardingPopup.style.display = 'none';
    }
    onboardingPrev.onclick = function() {
        if (onboardingStep > 0) {
            onboardingStep--;
            showOnboardingStep(onboardingStep);
        }
    };
    onboardingNext.onclick = function() {
        if (onboardingStep < onboardingSteps.length - 1) {
            onboardingStep++;
            showOnboardingStep(onboardingStep);
        }
    };
    onboardingClose.onclick = closeOnboarding;

    // Telefon yukarı kaldırıldığında onboarding başlat
    let onboardingShown = false;
    let onboardingActive = false;
    // window.addEventListener('deviceorientation', ...) içinden popup tetikleyiciyi kaldırıyorum

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
        // AR açıldıktan hemen sonra popup devreye girsin
        if (!onboardingShown) {
            setTimeout(() => {
                openOnboarding();
                onboardingShown = true;
                onboardingActive = true;
            }, 100); // Kamera açıldıktan hemen sonra popup gelsin
        }
    }

    function closeAR() {
        if (!arOpen) return;
        arOpen = false;
        const aScene = document.getElementById('ar-scene');
        if (aScene) aScene.remove();
        bottomContainer.style.height = '100%';
        if (container) container.style.zIndex = '';
        if (captureArea) captureArea.classList.remove('glow-active');
        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);
    }

    function startAnimation() {
        if (animationStarted || photoTaken) return;
        animationStarted = true;
        if (captureArea) captureArea.classList.add('glow-active');
        animationTimeout = setTimeout(() => {
            takePhoto();
        }, 1500);
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
        if (captureArea) captureArea.classList.remove('glow-active');
    }


    function isDeviceStable(event) {
        const threshold = 1.3;
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
        if (onboardingActive) return; // Onboarding açıksa scan işlemi yapılmasın
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
                if (captureArea) captureArea.classList.remove('glow-active');
                animationStarted = false;
                if (animationTimeout) clearTimeout(animationTimeout);
            }
        } else {
            closeAR();
        }
    });
});