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
        // resultsPopupOpen = true; // No longer needed
        closeAR(); // Keep existing AR close logic

        // Directly open the bottom sheet to step 1
        goToStep(1); // Ensure bottom sheet is visible and starts at step 1

        // Step 1: Image preview
        // The goToStep(1) call already sets step1 to visible and others hidden.
        // So, no need for manual style.display = 'block' etc. here.

        const capturedImage = document.getElementById('captured-image'); // This is from your initial popup.
        // If 'captured-image' is now part of step1 in bottom sheet, it's fine.
        // If not, you might need to find the correct ID in your step1 div.
        capturedImage.src = capturedImageURL;

        // Renamed for clarity and consistency with bottom sheet buttons
        const bottomSheetCancelBtn = document.getElementById('cancel-btn'); // Ensure this ID exists on your step1 cancel button
        const bottomSheetApproveBtn = document.getElementById('approve-btn'); // Ensure this ID exists on your step1 approve button
        const bottomSheetConfirmResultBtn = document.getElementById('confirm-result-btn'); // Ensure this ID exists on your step3 confirm button

        if (bottomSheetCancelBtn) {
            bottomSheetCancelBtn.onclick = () => {
                closeBottomSheet(); // Close the bottom sheet
                // resultsPopupOpen = false; // No longer needed
            };
        }

        if (bottomSheetApproveBtn) {
            bottomSheetApproveBtn.onclick = () => {
                goToStep(2); // Move to processing step (Step 2)

                // 1-second delay (1000ms) for processing
                setTimeout(() => {
                    goToStep(3); // Move to results step (Step 3)

                    // Load logos/thumbnails
                    const mainLogo = document.getElementById('mainImage'); // Use mainImage ID from your bottom sheet
                    const thumbnailContainer = document.querySelector('#step3 .flex.justify-center'); // Target the container for thumbnails

                    // Clear previous thumbnails (if any) to prevent duplicates
                    // Keep the first default image in the HTML if it's static, otherwise clear all
                    thumbnailContainer.innerHTML = ''; // Clear existing thumbnails

                    // Ensure selectedThumbnail is reset when entering step 3
                    if (selectedThumbnail) {
                        selectedThumbnail.parentElement.classList.remove("thumbnail-selected");
                        selectedThumbnail = null;
                    }

                    // Append new thumbnails
                    sampleLogos.forEach((logo, index) => {
                        const div = document.createElement('div');
                        div.className = 'w-24 h-24 rounded-lg overflow-hidden image-container'; // Reuse your image-container class

                        const img = document.createElement('img');
                        img.src = logo.url;
                        img.alt = logo.name;
                        img.className = 'w-full h-full object-cover cursor-pointer';
                        img.onclick = () => {
                            // This uses your existing changeImage function, which handles selection and main image update
                            changeImage(img);
                        };
                        div.appendChild(img);
                        thumbnailContainer.appendChild(div);

                        // Set the initial main image from the first logo in sampleLogos
                        if (index === 0) {
                            mainLogo.src = logo.url;
                            mainLogo.alt = logo.name;
                            // No thumbnail selected by default
                        }
                    });

                }, 1000);
            };
        }

        if (bottomSheetConfirmResultBtn) {
            bottomSheetConfirmResultBtn.onclick = () => {
                closeBottomSheet(); // Close the bottom sheet
                // resultsPopupOpen = false; // No longer needed

                // Keep existing AR state reset logic
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

        // Yeni eklenecek kısım: Harita ve bilgi bölümlerini orijinal z-index'lerine ve konumlarına getir
        const mapSection = document.querySelector('.map-section');
        if (mapSection) {
            mapSection.style.zIndex = ''; // Default z-index
            // Eğer konumlandırma veya yükseklik değiştiyse, burada resetleyin
            // Örneğin: mapSection.style.height = 'X%';
            // mapSection.style.position = '';
        }

        const infoSection = document.querySelector('.info-section');
        if (infoSection) {
            infoSection.style.zIndex = ''; // Default z-index
            // Benzer şekilde konumlandırma veya yükseklik resetlemesi
        }

        // AR açıldığında z-index'i değişen tüm butonları da resetlemek iyi bir fikir
        document.querySelectorAll('button, .circular-icon-button, .image-button').forEach(button => {
            button.style.zIndex = ''; // Default z-index'e geri döner
        });


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
        const bottomSheet = document.getElementById("bottomSheet");
        if (!bottomSheet.classList.contains('hidden-sheet') || onboardingActive) {
            return; // If bottom sheet or onboarding is active, stop processing device orientation
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
