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
    let onboardingShownDueToPitch = false;

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
    const overlay = document.getElementById('overlay'); // Var olan overlay div'i
    const onboardingBottomSheet = document.getElementById('onboardingBottomSheet');
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

    if (notificationBar) {
        notificationBar.style.display = 'block';
        setTimeout(() => {
            notificationBar.style.display = 'none';
        }, 3000);
    }

    function showOnboardingStep(step) {
        onboardingLogo.innerHTML = onboardingSteps[step].logo;
        onboardingTitle.textContent = onboardingSteps[step].title;
        onboardingDesc.textContent = onboardingSteps[step].desc;

        // "Back" butonu sadece ilk ve son aşamada gizli olmalı
        onboardingPrev.style.display = (step === 0 || step === onboardingSteps.length - 1) ? 'none' : 'inline-block';

        if (step === onboardingSteps.length - 1) { // Son aşama
            onboardingNext.style.display = 'none'; // "Next" gizli
            onboardingClose.style.display = 'none'; // "Close" gizli
            captureModeButtons.style.display = 'flex'; // Capture butonları gösteriliyor
        } else { // Diğer aşamalar
            onboardingNext.style.display = 'inline-block'; // "Next" gösteriliyor
            onboardingClose.style.display = 'none'; // "Close" gizli
            captureModeButtons.style.display = 'none'; // Capture butonları gizli
        }
    }

    function openOnboarding() {
        if (onboardingActive) return; // Zaten açıksa tekrar açma
        onboardingStep = 0;
        
        // Overlay'i ve bottom sheet'i görünür yap
        overlay.classList.remove('hidden'); // overlay'deki 'hidden' sınıfını kaldırıyoruz
        overlay.classList.add('opacity-50'); // Tailwind'in opacity sınıfını ekliyoruz
        onboardingBottomSheet.classList.remove('hidden-sheet');
        onboardingBottomSheet.classList.add('open');
        
        onboardingActive = true;
        showOnboardingStep(onboardingStep);
    }

    function closeOnboarding() {
        onboardingBottomSheet.classList.remove('open');
        overlay.classList.remove('opacity-50'); // Overlay'in opacity'sini kaldır

        setTimeout(() => {
            onboardingBottomSheet.classList.add('hidden-sheet');
            overlay.classList.add('hidden'); // Overlay'i tamamen gizle
            onboardingActive = false;
            onboardingShownDueToPitch = true;
        }, 300); // Tailwind transition süresiyle eşleşmeli
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
        closeOnboarding(); // Onboarding'i kapat
        openAR(); // AR'ı başlat (kamera açılacak, harita daralacak)
    };

    manualCaptureBtn.onclick = function () {
        manualCaptureMode = true;
        closeOnboarding(); // Onboarding'i kapat
        openAR(); // AR'ı başlat (kamera açılacak, harita daralacak)
    };

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
        if (onboardingActive || onboardingShownDueToPitch || arOpen) {
            if (arOpen && !manualCaptureMode) {
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
            return;
        }

        const pitch = getPitch(event);

        if (pitch >= 50) {
            openOnboarding();
        }
    });

    // Bu fonksiyonların uygulamanızın diğer yerlerinde tanımlı olduğundan emin olun.
    // Eğer yoksa, ilgili mantığı buraya eklemeniz gerekecektir.
    function goToStep(stepNumber) {
        console.log("Adıma Git:", stepNumber);
        // Örn: document.querySelectorAll('.app-step').forEach(s => s.classList.add('hidden'));
        // document.getElementById('step' + stepNumber).classList.remove('hidden');
    }

    function closeBottomSheet() {
        console.log("Ana Bottom Sheet Kapatıldı");
        // Eğer ayrı bir "ana" bottom sheet varsa onu kapatma mantığı.
    }

    let selectedThumbnail = null; // Bu değişkenin global veya uygun bir kapsamda tanımlanması önemli

    function changeImage(imgElement) {
        console.log("Görüntü Değiştirildi:", imgElement.src);
        const mainLogo = document.getElementById('mainImage');
        if (mainLogo) {
            mainLogo.src = imgElement.src;
            mainLogo.alt = imgElement.alt;
        }
        if (selectedThumbnail) {
            selectedThumbnail.parentElement.classList.remove('thumbnail-selected');
        }
        selectedThumbnail = imgElement; // selectedThumbnail'ı güncelleyin
        imgElement.parentElement.classList.add('thumbnail-selected');
    }

    const sampleLogos = [
        { id: 1, url: 'assets/logo1.png', name: 'Logo 1' },
        { id: 2, url: 'assets/logo2.png', name: 'Logo 2' },
        { id: 3, url: 'assets/logo3.png', name: 'Logo 3' },
        { id: 4, url: 'assets/logo4.png', name: 'Logo 4' },
    ];

    function showProcessedResults(capturedImageURL) {
        closeAR();

        const capturedImage = document.getElementById('captured-image');
        if (capturedImage) {
            capturedImage.src = capturedImageURL;
            // 'captured-image-container' div'inin display'ini değiştirmek isteyebilirsiniz
            const capturedImageContainer = document.getElementById('captured-image-container');
            if (capturedImageContainer) {
                capturedImageContainer.style.display = 'block';
            }
        }

        const bottomSheetCancelBtn = document.getElementById('cancel-btn');
        const bottomSheetApproveBtn = document.getElementById('approve-btn');
        const bottomSheetConfirmResultBtn = document.getElementById('confirm-result-btn');

        if (bottomSheetCancelBtn) {
            bottomSheetCancelBtn.onclick = () => {
                console.log("İşlem İptal Edildi");
                // Gerekirse AR'ı yeniden başlat veya başka bir duruma geç
            };
        }

        if (bottomSheetApproveBtn) {
            bottomSheetApproveBtn.onclick = () => {
                console.log("İşlem Onaylandı");
                setTimeout(() => {
                    const mainLogo = document.getElementById('mainImage');
                    const thumbnailContainer = document.querySelector('#step3 .flex.justify-center');

                    if (thumbnailContainer) {
                        thumbnailContainer.innerHTML = '';
                    }

                    sampleLogos.forEach((logo, index) => {
                        const div = document.createElement('div');
                        div.className = 'w-24 h-24 rounded-lg overflow-hidden image-container';

                        const img = document.createElement('img');
                        img.src = logo.url;
                        img.alt = logo.name;
                        img.className = 'w-full h-full object-cover cursor-pointer';
                        img.onclick = () => {
                            changeImage(img);
                        };
                        div.appendChild(img);
                        if (thumbnailContainer) {
                            thumbnailContainer.appendChild(div);
                        }

                        if (index === 0 && mainLogo) {
                            mainLogo.src = logo.url;
                            mainLogo.alt = logo.name;
                        }
                    });
                }, 1000);
            };
        }

        if (bottomSheetConfirmResultBtn) {
            bottomSheetConfirmResultBtn.onclick = () => {
                console.log("Sonuç Onaylandı");

                animationStarted = false;
                photoTaken = false;
                stableStartTime = null;
                if (animationTimeout) clearTimeout(animationTimeout);

                if (captureArea) {
                    if (manualCaptureMode) {
                        captureArea.classList.add('glow-active');
                    } else {
                        captureArea.classList.remove('glow-active');
                    }
                }
                if (document.getElementById('capture-status')) document.getElementById('capture-status').style.display = 'none';
                if (document.getElementById('capture-instruction')) document.getElementById('capture-instruction').style.display = 'block';
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
            if (!manualCaptureMode) {
                captureArea.classList.remove('glow-active');
            }
            if (document.getElementById('capture-status')) document.getElementById('capture-status').style.display = 'none';
            if (document.getElementById('capture-instruction')) document.getElementById('capture-instruction').style.display = 'block';
        }
    }

    function openAR() {
        if (arOpen) return;
        arOpen = true;

        const cameraContainer = document.getElementById('camera-container');
        if (!cameraContainer) {
            console.error("camera-container bulunamadı!");
            return; // Eleman yoksa işlemi durdur
        }

        // Kamerayı göstermek için z-index ve display ayarları
        cameraContainer.style.display = 'block'; // Kamera div'ini görünür yapın
        cameraContainer.style.zIndex = '5'; // Kameranın z-index'ini ayarlayın

        const videoElement = document.getElementById('camera-view');
        if (!videoElement) {
            console.error("camera-view bulunamadı!");
            return;
        }

        // Diğer UI elemanlarının z-index'lerini güncelle
        if (bottomContainer) {
            bottomContainer.style.height = '40%'; // Haritayı daralt
            bottomContainer.style.zIndex = '20';
        }
        if (mapSection) mapSection.style.zIndex = '1'; // Haritayı en alta al
        if (infoSection) infoSection.style.zIndex = '25';

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
                    // Environment kamera yoksa varsayılanı dene
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
        
        if (manualCaptureMode) {
            if (manualCaptureButton) manualCaptureButton.style.display = 'flex';
            if (manualCaptureButton) manualCaptureButton.onclick = takePhoto;
            if (document.getElementById('capture-instruction')) document.getElementById('capture-instruction').style.display = 'block';
            if (document.getElementById('capture-status')) document.getElementById('capture-status').style.display = 'none';

            if (scanArea) {
                scanArea.classList.add('glow-active');
            }
        } else {
            if (manualCaptureButton) manualCaptureButton.style.display = 'none';
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
            cameraContainer.style.display = 'none'; // Kamerayı gizle
            // cameraContainer.parentElement.removeChild(cameraContainer); // Elementi DOM'dan kaldırmak yerine gizlemek daha iyi olabilir.
        }

        if (bottomContainer) {
            bottomContainer.style.height = '100%'; // Haritayı eski boyutuna getir
            bottomContainer.style.zIndex = ''; // Z-index'i varsayılana dön
        }
        if (mapSection) mapSection.style.zIndex = '';
        if (infoSection) infoSection.style.zIndex = '';

        document.querySelectorAll('button, .circular-icon-button, .image-button').forEach(button => {
            button.style.zIndex = '';
        });

        if (captureArea) {
            captureArea.classList.remove('glow-active');
        }

        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);

        if (manualCaptureButton) manualCaptureButton.style.display = 'none';

        if (document.getElementById('capture-status')) document.getElementById('capture-status').style.display = 'none';
        if (document.getElementById('capture-instruction')) document.getElementById('capture-instruction').style.display = 'block';
    }
});