document.addEventListener('DOMContentLoaded', function () {
    let arOpen = false;
    let animationStarted = false;
    let animationTimeout = null;
    let photoTaken = false;
    let stableStartTime = null;
    let lastOrientation = { beta: 0, gamma: 0, alpha: 0 };
    let lastMotion = { x: 0, y: 0, z: 0 };
    let onboardingStep = 0;
    let captureMode = 'auto'; // 'auto' veya 'manual'
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

    const captureModeSelect = document.getElementById('capture-mode-select');
    const autoCaptureBtn = document.getElementById('auto-capture-btn');
    const manualCaptureBtn = document.getElementById('manual-capture-btn');
    const captureMessage = document.getElementById('capture-message');
    const manualCaptureBtnUI = document.getElementById('manual-capture-btn-ui');

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
        // Son adımda capture mode seçimini göster
        if (step === onboardingSteps.length - 1) {
            captureModeSelect.style.display = 'flex';
        } else {
            captureModeSelect.style.display = 'none';
        }
    }

    function openOnboarding() {
        onboardingStep = 0;
        onboardingPopup.style.display = 'flex';
        showOnboardingStep(onboardingStep);
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


    autoCaptureBtn.onclick = function() {
        captureMode = 'auto';
        autoCaptureBtn.classList.add('selected');
        manualCaptureBtn.classList.remove('selected');
        onboardingPopup.style.display = 'none'; // Seçim sonrası popup'ı kapat
        onboardingActive = false;
    };
    manualCaptureBtn.onclick = function() {
        captureMode = 'manual';
        manualCaptureBtn.classList.add('selected');
        autoCaptureBtn.classList.remove('selected');
        onboardingPopup.style.display = 'none'; // Seçim sonrası popup'ı kapat
        onboardingActive = false;
    };

    // Telefon yukarı kaldırıldığında onboarding başlat
    let onboardingShown = false;
    let onboardingActive = false;
    window.addEventListener('deviceorientation', function (event) {
        const pitch = getPitch(event);
        if (pitch >= 50 && !onboardingShown) {
            openOnboarding();
            onboardingShown = true;
            onboardingActive = true;
        }
    });

    // Onboarding popup kapandığında scan işlemlerine izin ver
    function closeOnboarding() {
        onboardingPopup.style.display = 'none';
        onboardingActive = false;
    }


    const bottomContainer = document.querySelector('.bottom-container');
    const captureArea = document.querySelector('.scan-area');
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
        if (captureMode === 'auto') {
            captureMessage.classList.add('active');
            animationTimeout = setTimeout(() => {
                takePhoto();
                captureMessage.classList.remove('active');
            }, 2500); // Otomatik modda süre uzatıldı
        }
    }

    function takePhoto() {
        if (photoTaken) return;
        photoTaken = true;
        captureMessage.classList.remove('active');
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
        // --- Yeni popup akışı ---
        const popup = document.getElementById('photo-popup');
        const img = document.getElementById('cropped-photo');
        img.src = canvas.toDataURL('image/png');
        // Örnek logo ve eşleşme oranı verisi
        const logoMatches = [
            { src: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Google-flutter-logo.svg', name: 'Flutter', score: 0.92 },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg', name: 'React', score: 0.85 },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png', name: 'JavaScript', score: 0.78 }
        ];
        let selectedLogoIdx = 0;
        // Büyük logo ve skor
        const mainLogo = document.getElementById('main-logo');
        const matchScore = document.getElementById('match-score');
        function updateMainLogo(idx) {
            mainLogo.src = logoMatches[idx].src;
            mainLogo.alt = logoMatches[idx].name;
            matchScore.textContent = logoMatches[idx].name; // Sadece isim yaz
            selectedLogoIdx = idx;
        }
        updateMainLogo(0);
        // Küçük logo listesi
        const logoList = document.getElementById('logo-list');
        logoList.innerHTML = '';
        logoMatches.forEach((logo, idx) => {
            const btn = document.createElement('button');
            btn.style.border = 'none';
            btn.style.background = 'none';
            btn.style.padding = '0';
            btn.style.cursor = 'pointer';
            btn.style.outline = 'none';
            btn.innerHTML = `<img src="${logo.src}" alt="${logo.name}" style="width:48px; height:48px; border-radius:8px; border:2px solid ${idx===selectedLogoIdx?'#7daef1':'#ccc'}; margin:0;" />`;
            btn.onclick = () => {
                updateMainLogo(idx);
                // Seçili olanı vurgula
                Array.from(logoList.children).forEach((c, i) => {
                    c.firstChild.style.border = '2px solid ' + (i===idx?'#7daef1':'#ccc');
                });
            };
            logoList.appendChild(btn);
        });
        // Onayla butonu
        const confirmBtn = document.getElementById('confirm-logo-btn');
        confirmBtn.onclick = function() {
            popup.style.display = 'none';
            // Burada seçilen logo ile ilgili işlemler yapılabilir
            alert('Onaylandı: ' + logoMatches[selectedLogoIdx].name);
        };
        popup.style.display = 'flex';
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
        if (onboardingActive) return;
        const pitch = getPitch(event);
        if (pitch >= 50) {
            openAR();
            if (captureMode === 'auto') {
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
                    captureMessage.classList.remove('active');
                }
            } else if (captureMode === 'manual') {
                // Butonlu modda AR açık, capture alanı hazır, buton göster
                manualCaptureBtnUI.classList.add('active');
            }
        } else {
            closeAR();
            manualCaptureBtnUI.classList.remove('active');
            captureMessage.classList.remove('active');
        }
    });
    manualCaptureBtnUI.onclick = function() {
        if (!photoTaken && captureMode === 'manual') {
            takePhoto();
        }
    };
});