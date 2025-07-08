document.addEventListener('DOMContentLoaded', function () {
    // State değişkenleri
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

    // AR sahnesini aç
    function openAR() {
        if (arOpen) return;
        arOpen = true;
        // a-scene sahnesini oluştur
        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
        aScene.style.position = 'absolute';
        aScene.style.top = '0';
        aScene.style.left = '0';
        aScene.style.width = '100%';
        aScene.style.height = '100%';
        aScene.style.zIndex = '1';
        aScene.setAttribute('embedded', '');
        aScene.id = 'ar-scene';
        document.body.appendChild(aScene);
        // Haritayı daralt
        bottomContainer.style.height = '40%';
        // AR için capture-area'yı öne çıkar
        if (container) container.style.zIndex = '100';
    }

    // AR sahnesini kapat
    function closeAR() {
        if (!arOpen) return;
        arOpen = false;
        const aScene = document.getElementById('ar-scene');
        if (aScene) aScene.remove();
        // Haritayı eski haline getir
        bottomContainer.style.height = '100%';
        if (container) container.style.zIndex = '';
        // Animasyon ve fotoğraf state sıfırla
        if (captureArea) captureArea.classList.remove('animate-progress');
        animationStarted = false;
        photoTaken = false;
        stableStartTime = null;
        if (animationTimeout) clearTimeout(animationTimeout);
    }

    // Animasyonu başlat
    function startAnimation() {
        if (animationStarted || photoTaken) return;
        animationStarted = true;
        if (captureArea) captureArea.classList.add('animate-progress');
        // Animasyon süresi kadar sonra fotoğraf çek
        animationTimeout = setTimeout(() => {
            takePhoto();
        }, 3000); // 3 saniye animasyon örnek
    }

    // Fotoğraf çek (placeholder)
    function takePhoto() {
        if (photoTaken) return;
        photoTaken = true;
        // Burada gerçek fotoğraf çekme kodu olacak (AR.js veya WebRTC ile)
        alert('Fotoğraf çekildi!');
        // Animasyon class'ı kaldır
        if (captureArea) captureArea.classList.remove('animate-progress');
    }

    // Cihazın sabit olup olmadığını kontrol et
    function isDeviceStable(event) {
        // event.beta, event.gamma, event.alpha değişimi çok küçükse sabit kabul et
        // Alternatif: devicemotion ile hızlanma değişimi çok küçükse
        // Şimdilik orientation ile örnek
        const threshold = 1.5; // derece
        const diffBeta = Math.abs(event.beta - lastOrientation.beta);
        const diffGamma = Math.abs(event.gamma - lastOrientation.gamma);
        const diffAlpha = Math.abs(event.alpha - lastOrientation.alpha);
        lastOrientation = { beta: event.beta, gamma: event.gamma, alpha: event.alpha };
        return (diffBeta < threshold && diffGamma < threshold && diffAlpha < threshold);
    }

    // Pitch açısını hesapla (telefonun yere göre eğimi)
    function getPitch(event) {
        // iOS ve Android farklılıkları olabilir, burada beta kullanıyoruz
        return Math.abs(event.beta); // 0: yere paralel, 90: yere dik
    }

    // Orientation event dinleyici
    window.addEventListener('deviceorientation', function (event) {
        const pitch = getPitch(event);
        if (pitch >= 50) {
            openAR();
            // Kamera açıkken sabitlik kontrolü
            if (isDeviceStable(event)) {
                if (!stableStartTime) stableStartTime = Date.now();
                // 1 saniye sabit tutarsa animasyon başlasın
                if (Date.now() - stableStartTime > 1000) {
                    startAnimation();
                }
            } else {
                stableStartTime = null;
                // Sabitlik bozulursa animasyon baştan başlasın
                if (captureArea) captureArea.classList.remove('animate-progress');
                animationStarted = false;
                if (animationTimeout) clearTimeout(animationTimeout);
            }
        } else {
            closeAR();
        }
    });
});