document.addEventListener('DOMContentLoaded', function () {
    let arOpen = false;
    let animationStarted = false;
    let animationTimeout = null;
    let photoTaken = false;
    let stableStartTime = null;
    let lastOrientation = { beta: 0, gamma: 0, alpha: 0 };
    let lastMotion = { x: 0, y: 0, z: 0 };
    let onboardingStep = 0;
    let manualCaptureMode = false; // Manuel çekim modu için flag
    let onboardingActive = false;
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
    const captureModeButtons = document.getElementById('capture-mode-buttons');
    const automaticCaptureBtn = document.getElementById('automatic-capture-btn');
    const manualCaptureBtn = document.getElementById('manual-capture-btn');
    const bottomContainer = document.querySelector('.bottom-container');
    const captureArea = document.getElementById('scanArea');
    const mapSection = document.querySelector('.map-section');
    const infoSection = document.querySelector('.info-section');
    const container = document.querySelector('.container');
    const manualCaptureButton = document.getElementById('manual-capture-button');
    let onboardingShown = false;

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

        // Son adımda next butonu gizle, close ve capture mode butonlarını göster
        if (step === onboardingSteps.length - 1) {
            onboardingNext.style.display = 'none';
            onboardingClose.style.display = 'inline-block';
            captureModeButtons.style.display = 'flex';
        } else {
            onboardingNext.style.display = 'inline-block';
            onboardingClose.style.display = 'none';
            captureModeButtons.style.display = 'none';
        }
    }

    function openOnboarding() {
        onboardingStep = 0;
        onboardingPopup.style.display = 'flex';
        showOnboardingStep(onboardingStep);
    }

    function closeOnboarding() {
        onboardingPopup.style.display = 'none';
        onboardingActive = false;
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

    // Capture mode butonları için event listener'lar
    automaticCaptureBtn.onclick = function() {
        manualCaptureMode = false;
        closeOnboarding();
    };

    manualCaptureBtn.onclick = function() {
        manualCaptureMode = true;
        closeOnboarding();
    };

    // Telefon yukarı kaldırıldığında onboarding başlat
    window.addEventListener('deviceorientation', function (event) {
        const pitch = getPitch(event);
        if (pitch >= 50 && !onboardingShown) {
            openOnboarding();
            onboardingShown = true;
            onboardingActive = true;
        }
    });

    // Örnek logo verileri - gerçek uygulamada bu API'den veya başka bir kaynaktan gelecektir
    const sampleLogos = [
        { id: 1, url: 'https://picsum.photos/200/300', name: 'InMapper' },
        { id: 2, url: 'https://picsum.photos/200/300', name: 'Logo 2' },
        { id: 3, url: 'https://picsum.photos/200/300', name: 'Logo 3' },
        { id: 4, url: 'https://picsum.photos/200/300', name: 'Logo 4' },
    ];

    function showProcessedResults(capturedImageURL) {
        // Capture edilmiş görüntüyü ayarla
        document.getElementById('captured-image').src = capturedImageURL;

        // Ana logoyu ayarla (ilk logo varsayılan olarak seçilir)
        document.getElementById('main-logo').src = sampleLogos[0].url;

        // Diğer logoları ekle
        const otherLogosContainer = document.getElementById('other-logos-container');
        otherLogosContainer.innerHTML = '';

        sampleLogos.forEach((logo, index) => {
            // Birincisi hariç diğer tüm logoları listele
            if (index > 0) {
                const logoElement = document.createElement('img');
                logoElement.src = logo.url;
                logoElement.alt = logo.name;
                logoElement.className = 'other-logo';
                logoElement.dataset.id = logo.id;

                // Logo'ya tıklama olayı ekle
                logoElement.addEventListener('click', function() {
                    // Tıklanan logoyu ana logo olarak ayarla
                    document.getElementById('main-logo').src = this.src;

                    // Tıklanan logo vurgulanabilir (opsiyonel)
                    const allLogos = document.querySelectorAll('.other-logo');
                    allLogos.forEach(l => l.style.borderColor = '#ddd');
                    this.style.borderColor = '#7daef1';
                });

                otherLogosContainer.appendChild(logoElement);
            }
        });

        // Onay butonu olayı
        document.getElementById('confirm-result-btn').onclick = function() {
            // Seçilen logoyla ilgili işlemler yapılabilir
            // Örneğin: seçilen logoyu bir değişkende sakla, sunucuya gönder vb.

            // Popup'ı kapat
            document.getElementById('results-popup').style.display = 'none';

            // AR modu kapat
            closeAR();
        };

        // Popup'ı göster
        document.getElementById('results-popup').style.display = 'flex';
    }

    // Sonrasındaki fonksiyonları güncelleyelim
    function startAnimation() {
        if (animationStarted || photoTaken) return;
        animationStarted = true;
        if (captureArea) {
            captureArea.classList.add('glow-active');
            document.getElementById('capture-instruction').style.display = 'none';
            document.getElementById('capture-status').style.display = 'block';
        }

        // Sabit tutma süresini 3 saniyeye uzattık (önceden 1.5 saniyeydi)
        animationTimeout = setTimeout(() => {
            takePhoto();
        }, 3000);
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

        // Fotoğrafı gösterme yerine, işlenmiş sonuçları gösterecek yeni popup'ı çağıralım
        showProcessedResults(canvas.toDataURL('image/png'));

        if (captureArea) {
            captureArea.classList.remove('glow-active');
            document.getElementById('capture-status').style.display = 'none';
            document.getElementById('capture-instruction').style.display = 'block';
        }
    }

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

        // Manuel çekim modu ise butonu göster
        if (manualCaptureMode) {
            manualCaptureButton.style.display = 'flex';
            document.getElementById('capture-instruction').style.display = 'block';
            document.getElementById('capture-status').style.display = 'none';
        } else {
            manualCaptureButton.style.display = 'none';
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

        // Capture ile ilgili değişkenleri sıfırla
        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);

        // Manuel çekim butonunu gizle
        manualCaptureButton.style.display = 'none';

        // Mesajları sıfırla
        document.getElementById('capture-status').style.display = 'none';
        document.getElementById('capture-instruction').style.display = 'block';
    }

    // Manuel çekim butonu için event listener
    manualCaptureButton.addEventListener('click', function() {
        takePhoto();
    });

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

            // Manuel çekim modunda otomatik yakalama yapma
            if (!manualCaptureMode) {
                if (isDeviceStable(event)) {
                    if (!stableStartTime) stableStartTime = Date.now();
                    // Sabit tutma süresini 1 saniyeye uzattık (önceden 500ms idi)
                    if (Date.now() - stableStartTime > 1000) {
                        startAnimation();
                    }
                } else {
                    stableStartTime = null;
                    if (captureArea) {
                        captureArea.classList.remove('glow-active');
                        document.getElementById('capture-status').style.display = 'none';
                        document.getElementById('capture-instruction').style.display = 'block';
                    }
                    animationStarted = false;
                    if (animationTimeout) clearTimeout(animationTimeout);
                }
            }
        } else {
            closeAR();
        }
});
});
