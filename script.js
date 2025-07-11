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
    let resultsPopupOpen = false;
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

    onboardingPrev.onclick = function () {
        if (onboardingStep > 0) {
            onboardingStep--;
            showOnboardingStep(onboardingStep);
        }
    };

    onboardingNext.onclick = function () {
        if (onboardingStep < onboardingSteps.length - 1) {
            onboardingStep++;
            showOnboardingStep(onboardingStep);
        }
    };

    onboardingClose.onclick = closeOnboarding;

    // Capture mode butonları için event listener'lar
    automaticCaptureBtn.onclick = function () {
        manualCaptureMode = false;
        closeOnboarding();
    };

    manualCaptureBtn.onclick = function () {
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
        { id: 1, url: 'assets/logo1.png', name: 'Logo 1' },
        { id: 2, url: 'assets/logo2.png', name: 'Logo 2' },
        { id: 3, url: 'assets/logo3.png', name: 'Logo 3' },
        { id: 4, url: 'assets/logo4.png', name: 'Logo 4' },
    ];

    function showProcessedResults(capturedImageURL) {
        resultsPopupOpen = true;
        closeAR();

        const popup = document.getElementById('results-popup');
        popup.style.display = 'flex';


        // Aşama 1: Resim önizleme
        document.getElementById('step-1').style.display = 'block';
        document.getElementById('step-2').style.display = 'none';
        document.getElementById('step-3').style.display = 'none';

        const capturedImage = document.getElementById('captured-image');
        capturedImage.src = capturedImageURL;

        document.getElementById('cancel-btn').onclick = () => {
            popup.style.display = 'none';
            resultsPopupOpen = false;
        };

        document.getElementById('approve-btn').onclick = () => {
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'flex';

            // 1 saniyelik bekleme (1000ms)
            setTimeout(() => {
                document.getElementById('step-2').style.display = 'none';
                document.getElementById('step-3').style.display = 'flex';

                // Logoları yükle...
                const mainLogo = document.getElementById('main-logo');
                mainLogo.src = sampleLogos[0].url;
                mainLogo.alt = sampleLogos[0].name;

                const container = document.getElementById('other-logos-container');
                container.innerHTML = '';
                sampleLogos.slice(1).forEach(logo => {
                    const img = document.createElement('img');
                    img.src = logo.url;
                    img.alt = logo.name;
                    img.className = 'other-logo';
                    img.onclick = () => {
                        mainLogo.src = img.src;
                        mainLogo.alt = img.alt;

                        document.querySelectorAll('.other-logo').forEach(l => {
                            l.style.borderColor = '#ddd';
                        });
                        img.style.borderColor = '#7daef1';
                    };
                    container.appendChild(img);
                });

            }, 1000);
        };

        document.getElementById('confirm-result-btn').onclick = () => {
            popup.style.display = 'none';
            resultsPopupOpen = false;
            animationStarted = false;
            photoTaken = false;
            stableStartTime = null;
            if (animationTimeout) clearTimeout(animationTimeout);

            const scanArea = document.getElementById('scanArea');
            if (scanArea) {
                if (manualCaptureMode) {
                    scanArea.classList.add('glow-active');
                } else {
                    scanArea.classList.remove('glow-active');
                }
            }

            document.getElementById('capture-status').style.display = 'none';
            document.getElementById('capture-instruction').style.display = 'block';
        };
    }


    function startAnimation() {
        if (animationStarted || photoTaken) return;
        animationStarted = true;
        if (captureArea) {
            captureArea.classList.add('glow-active');
            document.getElementById('capture-instruction').style.display = 'none';
            document.getElementById('capture-status').style.display = 'block';
        }

        animationTimeout = setTimeout(() => {
            takePhoto();
        }, 2000);
    }


    function takePhoto() {
        if (photoTaken) return;
        photoTaken = true;

        const video = document.getElementById('camera-view');
        if (!video || !video.srcObject) {
            alert('Kamera görüntüsü alınamıyor!');
            return;
        }

        const captureArea = document.getElementById('scanArea');
        const capRect = captureArea.getBoundingClientRect();
        const videoRect = video.getBoundingClientRect();


        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;


        const sx = (capRect.left - videoRect.left) * scaleX;
        const sy = (capRect.top - videoRect.top) * scaleY;
        const sw = capRect.width * scaleX;
        const sh = capRect.height * scaleY;


        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

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

        const container = document.querySelector('.container');

        const cameraContainer = document.createElement('div');
        cameraContainer.id = 'camera-container';
        cameraContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 60vh;
        z-index: 5;
        background: transparent;
        pointer-events: none;
    `;

        const videoElement = document.createElement('video');
        videoElement.id = 'camera-view';
        videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
    `;
        videoElement.setAttribute('autoplay', '');
        videoElement.setAttribute('playsinline', '');

        cameraContainer.appendChild(videoElement);
        container.appendChild(cameraContainer);

        // Diğer elementlerin z-index değerlerini güncelle
        const bottomContainer = document.querySelector('.bottom-container');
        bottomContainer.style.zIndex = '20';

        const infoSection = document.querySelector('.info-section');
        if (infoSection) infoSection.style.zIndex = '25';

        const buttonSection = document.querySelector('.button-section');
        if (buttonSection) buttonSection.style.zIndex = '25';

        // Tüm butonların z-index'ini yükselt
        document.querySelectorAll('button, .circular-icon-button, .image-button').forEach(button => {
            button.style.zIndex = '30';
        });

        // Kamera başlatma kodları...
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { exact: "environment" }
                }
            })
                .then(function (stream) {
                    videoElement.srcObject = stream;
                    window.localStream = stream;
                })
                .catch(function (error) {
                    console.error("Kamera erişim hatası:", error);
                    navigator.mediaDevices.getUserMedia({ video: true })
                        .then(function (stream) {
                            videoElement.srcObject = stream;
                            window.localStream = stream;
                        })
                        .catch(function (err) {
                            console.error("Hiçbir kameraya erişilemiyor:", err);
                            closeAR();
                        });
                });
        }

        bottomContainer.style.height = '40%';

        // Manuel çekim modu kontrolü
        if (manualCaptureMode) {
            manualCaptureButton.style.display = 'flex';
            manualCaptureButton.onclick = takePhoto;
            document.getElementById('capture-instruction').style.display = 'block';
            document.getElementById('capture-status').style.display = 'none';

            // Manuel modda scan area'yı direkt aktif hale getir
            const scanArea = document.getElementById('scanArea');
            if (scanArea) {
                scanArea.classList.add('glow-active');
            }
        } else {
            manualCaptureButton.style.display = 'none';
            // Otomatik modda başlangıçta glow-active class'ını kaldır
            const scanArea = document.getElementById('scanArea');
            if (scanArea) {
                scanArea.classList.remove('glow-active');
            }
        }
    }

    function closeAR() {
        if (!arOpen) return;
        arOpen = false;

        // Kamera stream'ini kapat
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => track.stop());
        }

        // Kamera container'ını kaldır
        const cameraContainer = document.getElementById('camera-container');
        if (cameraContainer) {
            cameraContainer.parentElement.removeChild(cameraContainer);
        }

        // Stilleri reset et
        const bottomContainer = document.querySelector('.bottom-container');
        bottomContainer.style.height = '100%';
        bottomContainer.style.zIndex = '';

        if (captureArea) {
            if (!manualCaptureMode) {
                captureArea.classList.remove('glow-active');
            }
        }

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


            if (!manualCaptureMode) {
                if (isDeviceStable(event)) {
                    if (!stableStartTime) stableStartTime = Date.now();

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
