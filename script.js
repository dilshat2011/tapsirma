// DOMElements
const video = document.getElementById('videoElement');
const videoContainer = document.getElementById('videoContainer');
const modelStatus = document.getElementById('modelStatus');
const captureBtn = document.getElementById('captureBtn');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.getElementById('btnLoader');
const resultCard = document.getElementById('resultCard');
const objectNameEl = document.getElementById('objectName');
const confidenceBadge = document.getElementById('confidenceBadge');
const wikiText = document.getElementById('wikiText');
const wikiLink = document.getElementById('wikiLink');

let classifier;
let isModelReady = false;

// 1. Kamera ulanishini sozlash
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Telefonda asosiy kamerani yoqishga urinish
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (err) {
        console.error("Kameraga ulanishda xato:", err);
        modelStatus.innerHTML = '<span class="status-dot" style="background:red"></span> Kamera xatosi';
        alert("Kameraga ulanib bo'lmadi. Saytga kamera ruxsatini berganingizni tekshiring.");
    }
}

// 2. Dasturni ishga tushirish (Kamera va AI modelni yuklash)
async function initApp() {
    await setupCamera();
    
    // ml5.js kutubxonasi yordamida tekin MobileNet modelini tortamiz
    classifier = ml5.imageClassifier('MobileNet', video, modelLoaded);
}

function modelLoaded() {
    console.log('Model Muvaffaqiyatli Yuklandi!');
    isModelReady = true;
    
    // UIni yangilash
    modelStatus.innerHTML = '<span class="status-dot"></span> Model Tayyor';
    modelStatus.classList.add('ready');
    
    captureBtn.disabled = false;
    
    // 3 soniyadan keyin tepadagi statusni yashiramiz
    setTimeout(() => {
        modelStatus.style.opacity = '0';
        modelStatus.style.transition = 'opacity 0.5s ease';
    }, 3000);
}

// 3. Obyektni tahlil qilish (Skaner) tugmasi bosilganda
captureBtn.addEventListener('click', () => {
    if (!isModelReady) return;
    
    // UI holatini Skanerlash jarayoniga o'tkazish
    videoContainer.classList.add('scanning');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    captureBtn.disabled = true;
    
    // Oldingi natijani yashlash
    resultCard.classList.add('hidden');
    setTimeout(() => {
        resultCard.style.display = 'none';
    }, 300); // animatsiya tugashini kutish

    // Bi oz lazer animatsiyasi ko'rinib turishi uchun 1.5s kutamiz, keyin AI tahlil qiladi
    setTimeout(() => {
        classifier.classify(video, (err, results) => {
            if (err) {
                console.error(err);
                resetBtn();
                return;
            }
            
            showResult(results);
        });
    }, 1500); 
});

function resetBtn() {
    videoContainer.classList.remove('scanning');
    btnText.style.display = 'inline-block';
    btnLoader.style.display = 'none';
    captureBtn.disabled = false;
}

// 4. Natijani va Vikipediya ma'lumotlarini ekranga chiqarish
function showResult(results) {
    resetBtn();
    
    // Eng yuqori aniqlikdagi natijaning nomini olish (verguldan oldingi qismi)
    const topResult = results[0];
    let itemLabel = topResult.label.split(',')[0].trim();
    
    // Ba'zan hamma harf kichik keladi, shuning uchun katta harf bilan boshlaymiz
    itemLabel = itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);
    
    const confidence = Math.round(topResult.confidence * 100);
    
    // Ekranga chiqarish
    objectNameEl.textContent = itemLabel;
    confidenceBadge.textContent = `${confidence}% Aniq`;
    
    // Kardni ekranda namoyish qilish
    resultCard.style.display = 'block';
    setTimeout(() => {
        resultCard.classList.remove('hidden');
    }, 10);
    
    // Wikipedia API orqali obyekt haqida inglizcha ma'lumot qidirish
    fetchWikiInfo(topResult.label.split(',')[0].trim());
}

async function fetchWikiInfo(query) {
    wikiText.innerHTML = "Ma'lumot qidirilmoqda... <br><span style='font-size: 0.8em; color: gray'>(Faqat ingliz tilidagi natijalar chiqyapti)</span>";
    wikiLink.classList.add('hidden');
    
    try {
        // Inglizcha Vikipediya Rest API sining qisqacha ma'lumot tortish URL i (CORS yoqilgan)
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Topilmadi');
        }
        
        const data = await response.json();
        
        if (data.extract) {
            wikiText.textContent = data.extract;
            wikiLink.href = data.content_urls.desktop.page;
            wikiLink.classList.remove('hidden');
        } else {
            wikiText.textContent = "Vikipediyada mazkur obyekt haqida qisqacha ma'lumot topilmadi.";
        }
        
    } catch (err) {
        console.error("Wiki error:", err);
        wikiText.textContent = "Kechirasiz, ushbu ob'ekt haqida Vikipediyada aniq maqola topilmadi.";
    }
}

// Dasturni ishga tushirish qatorlari
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
