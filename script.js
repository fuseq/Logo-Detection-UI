document.addEventListener('DOMContentLoaded', function () {
    let arOpen = false;
    let animationStarted = false;
    let animationTimeout = null;
    let photoTaken = false;
    let stableStartTime = null;
    let lastOrientation = { beta: 0, gamma: 0, alpha: 0 };
    let lastMotion = { x: 0, y: 0, z: 0 };
    let onboardingStep = 0;
    let manualCaptureMode = false;
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
    let selectedThumbnail = null;

    notificationBar.style.display = 'block';
    setTimeout(() => {
        notificationBar.style.display = 'none';
    }, 3000);

    function showOnboardingStep(step) {
        onboardingLogo.innerHTML = onboardingSteps[step].logo;
        onboardingTitle.textContent = onboardingSteps[step].title;
        onboardingDesc.textContent = onboardingSteps[step].desc;

        onboardingPrev.style.display = (step === 0 || step === onboardingSteps.length - 1) ? 'none' : 'inline-block';

        if (step === onboardingSteps.length - 1) {
            onboardingNext.style.display = 'none';
            onboardingClose.style.display = 'none';
            captureModeButtons.style.display = 'flex';
        } else {
            onboardingNext.style.display = 'inline-block';
            onboardingClose.style.display = 'none';
            captureModeButtons.style.display = 'none';
        }
    }

    function openOnboarding() {
        const bottomSheet = document.getElementById('onboarding-bottom-sheet');
        bottomSheet.style.display = 'flex';
        setTimeout(() => {
            bottomSheet.classList.add('active');
        }, 10);
        showOnboardingStep(onboardingStep);
    }

    function closeOnboarding() {
        const bottomSheet = document.getElementById('onboarding-bottom-sheet');
        bottomSheet.classList.remove('active');
        setTimeout(() => {
            bottomSheet.style.display = 'none';
        }, 300); // Match the transition duration
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


    automaticCaptureBtn.onclick = function () {
        manualCaptureMode = false;
        closeOnboarding();
    };

    manualCaptureBtn.onclick = function () {
        manualCaptureMode = true;
        closeOnboarding();
    };

    window.addEventListener('deviceorientation', function (event) {
        const pitch = getPitch(event);
        if (pitch >= 50 && !onboardingShown) {
            openOnboarding();
            onboardingShown = true;
            onboardingActive = true;
        }
    });

    // Mock data 'sampleLogos' kaldırıldı.
    // const sampleLogos = [ ... ];

    function goToStep(step) {
        const sheet = document.getElementById("bottomSheet");
        const overlay = document.getElementById("overlay");

        sheet.classList.remove("hidden-sheet");
        overlay.classList.remove("hidden");

        document.getElementById("step1").classList.add("hidden");
        document.getElementById("step2").classList.add("hidden");
        document.getElementById("step3").classList.add("hidden");

        document.getElementById("step" + step).classList.remove("hidden");
    }

    function closeBottomSheet() {
        const sheet = document.getElementById("bottomSheet");
        const overlay = document.getElementById("overlay");

        sheet.classList.add("hidden-sheet");
        overlay.classList.add("hidden");
    }

    /**
     * Yakalanan görüntüyü işler, API'ye gönderir ve sonucu gösterir.
     * @param {string} capturedImageURL - Canvas'tan alınan base64 formatındaki resim URL'si.
     */
    // Lütfen mevcut showProcessedResults fonksiyonunuzu bununla değiştirin.
    function showProcessedResults(capturedImageURL) {
        closeAR();
        goToStep(1); // Onay ekranını göster

        const capturedImage = document.getElementById('captured-image');
        capturedImage.src = capturedImageURL;

        const bottomSheetCancelBtn = document.getElementById('cancel-btn');
        const bottomSheetApproveBtn = document.getElementById('approve-btn');
        const bottomSheetConfirmResultBtn = document.getElementById('confirm-result-btn');

        if (bottomSheetCancelBtn) {
            bottomSheetCancelBtn.onclick = () => {
                closeBottomSheet();
            };
        }

        if (bottomSheetApproveBtn) {
            bottomSheetApproveBtn.onclick = async () => {
                goToStep(2); // "İşleniyor..." ekranını göster

                try {
                    const response = await fetch(capturedImageURL);
                    const blob = await response.blob();
                    const imageFile = new File([blob], "logo-capture.png", { type: "image/png" });

                    const resultData = await detectLogo(imageFile);

                    if (resultData && resultData.best_match) {
                        goToStep(3);
                        const mainLogo = document.getElementById('mainImage');
                        const thumbnailContainer = document.querySelector('#step3 .flex.justify-center');
                        thumbnailContainer.innerHTML = '';

                        const logoName = resultData.best_match;
                        mainLogo.src = `assets/logos/${logoName}.png`;
                        mainLogo.alt = logoName;
                    } else {
                        throw new Error("API yanıtında 'best_match' alanı bulunamadı. Gelen veri: " + JSON.stringify(resultData));
                    }

                } catch (error) {
                    // Hatanın detayını konsola yazdırmaya devam et (iyi bir alışkanlıktır).
                    console.error('Logo tespiti sırasında bir hata oluştu:', error);

                    // *** YENİ KISIM: Hata mesajını alert olarak göster ***
                    const errorMessage = `Bir hata oluştu:\n\nTip: ${error.name}\nMesaj: ${error.message}`;
                    alert(errorMessage);

                    // Hata sonrası kullanıcıyı tekrar onay ekranına yönlendirerek
                    // takılıp kalmasını engelle.
                    goToStep(1);
                }
            };
        }

        if (bottomSheetConfirmResultBtn) {
            bottomSheetConfirmResultBtn.onclick = () => {
                closeBottomSheet();
                // ... (geri kalan kod aynı)
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

        // Yakalanan görüntüyü işlemek için yeni fonksiyona gönder
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

        const bottomContainer = document.querySelector('.bottom-container');
        bottomContainer.style.zIndex = '20';

        const infoSection = document.querySelector('.info-section');
        if (infoSection) infoSection.style.zIndex = '25';

        const buttonSection = document.querySelector('.button-section');
        if (buttonSection) buttonSection.style.zIndex = '25';

        document.querySelectorAll('button, .circular-icon-button, .image-button').forEach(button => {
            button.style.zIndex = '30';
        });

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

        if (manualCaptureMode) {
            manualCaptureButton.style.display = 'flex';
            manualCaptureButton.onclick = takePhoto;
            document.getElementById('capture-instruction').style.display = 'block';
            document.getElementById('capture-status').style.display = 'none';

            const scanArea = document.getElementById('scanArea');
            if (scanArea) {
                scanArea.classList.add('glow-active');
            }
        } else {
            manualCaptureButton.style.display = 'none';

            const scanArea = document.getElementById('scanArea');
            if (scanArea) {
                scanArea.classList.remove('glow-active');
            }
        }
    }

    function closeAR() {
        if (!arOpen) return;
        arOpen = false;

        if (window.localStream) {
            window.localStream.getTracks().forEach(track => track.stop());
        }

        const cameraContainer = document.getElementById('camera-container');
        if (cameraContainer) {
            cameraContainer.parentElement.removeChild(cameraContainer);
        }

        const bottomContainer = document.querySelector('.bottom-container');
        bottomContainer.style.height = '100%';
        bottomContainer.style.zIndex = '';

        const mapSection = document.querySelector('.map-section');
        if (mapSection) {
            mapSection.style.zIndex = '';
        }

        const infoSection = document.querySelector('.info-section');
        if (infoSection) {
            infoSection.style.zIndex = '';
        }

        document.querySelectorAll('button, .circular-icon-button, .image-button').forEach(button => {
            button.style.zIndex = '';
        });

        if (captureArea) {
            if (!manualCaptureMode) {
                captureArea.classList.remove('glow-active');
            }
        }

        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);

        manualCaptureButton.style.display = 'none';

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

    async function detectLogo(imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile); // 🔥 Değiştirildi

        try {
            const response = await fetch('http://inmapper.isohtel.com.tr/detect-logo', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error detecting logo:', error);
            throw error;
        }
    }

    window.addEventListener('deviceorientation', function (event) {
        const bottomSheet = document.getElementById("bottomSheet");
        if (!bottomSheet.classList.contains('hidden-sheet') || onboardingActive) {
            return;
        }
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