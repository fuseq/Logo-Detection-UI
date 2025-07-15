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
    let onboardingActive = false; // Onboarding bottom sheet'in açık olup olmadığını belirtir
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
    let onboardingShown = false; // Onboarding bir kez gösterildi mi?

    // Eğer notificationBar başlangıçta gizliyse, bu kısım gereksiz olabilir.
    // Varsayılan olarak CSS ile gizlenip JS ile gösterilmesi daha iyi.
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
        onboardingPrev.style.display = step === 0 ? 'none' : 'inline-block';

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

    // --- Bottom Sheet Açma İşlevi ---
    function openOnboarding() {
        if (onboardingActive) return; // Zaten açıksa tekrar açma
        onboardingStep = 0; // Her açılışta ilk adıma dön
        showOnboardingStep(onboardingStep); // İçeriği ilk adıma göre güncelle

        onboardingPopup.style.display = 'flex'; // Popup div'ini görünür yap (CSS transition için)
        // Kısa bir gecikme ile 'active' sınıfını ekle ki CSS transition tetiklensin
        setTimeout(() => {
            onboardingPopup.classList.add('active');
            onboardingActive = true; // Bottom sheet'in aktif olduğunu işaretle
        }, 10);
    }

    // --- Bottom Sheet Kapatma İşlevi ---
    function closeOnboarding() {
        if (!onboardingActive) return; // Zaten kapalıysa işlem yapma

        onboardingPopup.classList.remove('active'); // CSS transition'ı başlatmak için 'active' sınıfını kaldır
        // Transition tamamlandığında display: none yapmak için event listener ekle
        onboardingPopup.addEventListener('transitionend', function handler() {
            onboardingPopup.style.display = 'none'; // Elementi tamamen gizle
            onboardingPopup.removeEventListener('transitionend', handler); // Dinleyiciyi kaldır
        }, { once: true }); // Olay dinleyicisini sadece bir kez çalıştır

        onboardingActive = false; // Bottom sheet'in artık aktif olmadığını işaretle
    }

    // Onboarding buton olayları
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

    onboardingClose.onclick = closeOnboarding; // Kapat butonuna tıklandığında closeOnboarding çağrılır


    // Yakalama modu butonları
    automaticCaptureBtn.onclick = function () {
        manualCaptureMode = false;
        closeOnboarding(); // Bottom sheet'i kapat
    };

    manualCaptureBtn.onclick = function () {
        manualCaptureMode = true;
        closeOnboarding(); // Bottom sheet'i kapat
    };

    // --- Arka plana tıklayarak kapatma (isteğe bağlı) ---
    onboardingPopup.addEventListener('click', (event) => {
        if (event.target === onboardingPopup) { // Sadece arka plan overlay'ine tıklanırsa
            closeOnboarding();
        }
    });

    // Cihazın eğimine göre onboarding'i açma mantığı
    window.addEventListener('deviceorientation', function (event) {
        // onboardingActive kontrolü ekledik: Eğer bottom sheet zaten açıksa veya
        // onboardingShown true ise (yani daha önce gösterildiyse), tekrar açma.
        // Bu, bottom sheet açıldığında veya bir kez açılıp kapandıktan sonra
        // tekrar açılmasını engeller.
        if (onboardingActive || onboardingShown) {
            return;
        }

        const pitch = getPitch(event);
        if (pitch >= 50) { // Belirli bir eğim açısına ulaşıldığında
            openOnboarding();
            onboardingShown = true; // Onboarding'in gösterildiğini işaretle
            // onboardingActive zaten openOnboarding içinde true yapılıyor
        }
    });

    const sampleLogos = [
        { id: 1, url: 'assets/logo1.png', name: 'Logo 1' },
        { id: 2, url: 'assets/logo2.png', name: 'Logo 2' },
        { id: 3, url: 'assets/logo3.png', name: 'Logo 3' },
        { id: 4, url: 'assets/logo4.png', name: 'Logo 4' },
    ];

    function showProcessedResults(capturedImageURL) {
        closeAR(); // AR kamerasını kapat

        // Burada bir bottomSheet elementine goToStep(1) veya benzeri bir işlem yapılıyordu.
        // Eğer ayrı bir "bottomSheet" elementiniz varsa, onu burada kontrol etmelisiniz.
        // Örneğin: document.getElementById('anotherBottomSheet').classList.remove('hidden-sheet');
        // Veya ilgili adım div'lerini görünür yapın.
        // Bu fonksiyon, onboarding bottom sheet'i ile ilgili değil, işleme sonuçlarını gösteren
        // başka bir bottom sheet veya bölgeyi yönetiyor gibi görünüyor.
        // Şu anki kodunuzda "bottomSheet" id'li bir element yok, bu yüzden bu kısmı varsayımsal bırakıyorum.
        // goToStep(1); // Eğer bu, başka bir bottom sheet'in adımlarını yönetiyorsa, burayı düzeltmelisiniz.

        const capturedImage = document.getElementById('captured-image');
        if (capturedImage) {
            capturedImage.src = capturedImageURL;
        }

        const bottomSheetCancelBtn = document.getElementById('cancel-btn');
        const bottomSheetApproveBtn = document.getElementById('approve-btn');
        const bottomSheetConfirmResultBtn = document.getElementById('confirm-result-btn');

        if (bottomSheetCancelBtn) {
            bottomSheetCancelBtn.onclick = () => {
                // closeBottomSheet(); // Eğer varsa bu fonksiyonu çağırın
                // Ek olarak, bu butona basıldığında AR'yi yeniden başlatmanız gerekebilir:
                // openAR();
            };
        }

        if (bottomSheetApproveBtn) {
            bottomSheetApproveBtn.onclick = () => {
                // goToStep(2); // Eğer varsa bu fonksiyonu çağırın

                setTimeout(() => {
                    // goToStep(3); // Eğer varsa bu fonksiyonu çağırın

                    const mainLogo = document.getElementById('mainImage');
                    const thumbnailContainer = document.querySelector('#step3 .flex.justify-center');

                    if (thumbnailContainer) {
                        thumbnailContainer.innerHTML = ''; // İçeriği temizle

                        let selectedThumbnail = null; // Bu değişkenin kapsamını dikkatlice yönetin

                        sampleLogos.forEach((logo, index) => {
                            const div = document.createElement('div');
                            div.className = 'w-24 h-24 rounded-lg overflow-hidden image-container';

                            const img = document.createElement('img');
                            img.src = logo.url;
                            img.alt = logo.name;
                            img.className = 'w-full h-full object-cover cursor-pointer';
                            img.onclick = () => {
                                // changeImage(img); // Bu fonksiyonun tanımı eksik
                                if (selectedThumbnail) {
                                    selectedThumbnail.parentElement.classList.remove("thumbnail-selected");
                                }
                                img.parentElement.classList.add("thumbnail-selected");
                                selectedThumbnail = img;
                                if (mainLogo) {
                                    mainLogo.src = img.src; // Ana logoyu seçilen thumbnail ile güncelle
                                    mainLogo.alt = img.alt;
                                }
                            };
                            div.appendChild(img);
                            thumbnailContainer.appendChild(div);

                            if (index === 0) {
                                if (mainLogo) {
                                    mainLogo.src = logo.url;
                                    mainLogo.alt = logo.name;
                                }
                                // İlk thumbnail'ı varsayılan olarak seçili yap
                                img.parentElement.classList.add("thumbnail-selected");
                                selectedThumbnail = img;
                            }
                        });
                    }
                }, 1000);
            };
        }

        if (bottomSheetConfirmResultBtn) {
            bottomSheetConfirmResultBtn.onclick = () => {
                // closeBottomSheet(); // Eğer varsa bu fonksiyonu çağırın

                animationStarted = false;
                photoTaken = false;
                stableStartTime = null;
                if (animationTimeout) clearTimeout(animationTimeout);

                if (captureArea) {
                    if (manualCaptureMode) {
                        captureArea.classList.add('glow-active'); // Manual modda tekrar parlamayı aç
                    } else {
                        captureArea.classList.remove('glow-active'); // Otomatik modda kapat
                    }
                }
                document.getElementById('capture-status').style.display = 'none';
                document.getElementById('capture-instruction').style.display = 'block';
                // İşlem bitince AR'yi tekrar başlatın (genellikle bu beklenir)
                openAR();
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

    // `deviceorientation` dinleyicisindeki değişiklikler
    window.addEventListener('deviceorientation', function (event) {
        // `bottomSheet` id'li bir elementiniz olmadığı için bu kontrolü kaldırdım
        // Eğer ayrı bir "bottomSheet" mekanizmanız varsa, onun `hidden-sheet` sınıfını kontrol edebilirsiniz.
        // Örneğin: const anotherBottomSheet = document.getElementById('anotherBottomSheet');
        // if (anotherBottomSheet && !anotherBottomSheet.classList.contains('hidden-sheet') || onboardingActive) {
        //     return;
        // }

        // Eğer onboarding bottom sheet aktifse veya daha önce gösterildiyse, tekrar açma
        if (onboardingActive || onboardingShown) {
            return;
        }

        const pitch = getPitch(event);
        if (pitch >= 50) {
            openAR(); // AR kamerasını aç

            // Onboarding gösterilmemişse ve pitch uygunsa onboarding'i aç
            if (!onboardingShown) {
                openOnboarding();
                onboardingShown = true; // Sadece bir kez gösterildiğini işaretle
                // onboardingActive zaten openOnboarding içinde true yapılır
            }


            if (!manualCaptureMode && !onboardingActive) { // Onboarding aktif değilse otomatik yakalama
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