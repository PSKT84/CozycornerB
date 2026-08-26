// --- Configuration & State ---
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwIARdi97-XPiOe1Zl0qV4TcYLIIFKYp-fmzu4MfZm3QnZGpARWrJKVLU_vNZSG03Hk/exec"; 

const defaultCategories = ["อาหารและเครื่องดื่ม", "ค่าวัตถุดิบ", "เดินทาง", "อุปกรณ์สำนักงาน", "บริการ", "อื่นๆ"];
let categories = JSON.parse(localStorage.getItem('coffee_categories')) || defaultCategories;
let receipts = JSON.parse(localStorage.getItem('coffee_receipts')) || [];

// Load Settings from LocalStorage
let appSettings = JSON.parse(localStorage.getItem('app_settings')) || {
    apiKey: '',
    buyerName: 'พงศกร ทวีธนประสิทธิ์',
    buyerTaxId: '1102001007652',
    buyerAddress: '431/19 ซอยเจริญกรุง 107 แยก 13 ถนนเจริญกรุง แขวงบางคอแหลม เขตบางคอแหลม กรุงเทพมหานคร 10120'
};

let currentBase64Image = null;
let currentMimeType = null;

// --- DOM Elements ---
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const buyerNameInput = document.getElementById('buyerNameInput');
const buyerTaxIdInput = document.getElementById('buyerTaxIdInput');
const buyerAddressInput = document.getElementById('buyerAddressInput');

const uploadBox = document.getElementById('uploadBox');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewContainer = document.getElementById('previewContainer');
const removeImgBtn = document.getElementById('removeImgBtn');
const loadingAi = document.getElementById('loadingAi');

const expenseForm = document.getElementById('expenseForm');
const storeNameInput = document.getElementById('storeNameInput');
const amountInput = document.getElementById('amountInput');
const dateInput = document.getElementById('dateInput');
const categoryInput = document.getElementById('categoryInput');
const isOriginalReceipt = document.getElementById('isOriginalReceipt');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');

const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');
const expenseList = document.getElementById('expenseList');

// Category DOM
const manageCategoryBtn = document.getElementById('manageCategoryBtn');
const categoryModal = document.getElementById('categoryModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryInput = document.getElementById('newCategoryInput');
const categoryListEl = document.getElementById('categoryList');

// --- Initialization ---
function init() {
    // Fill Settings
    apiKeyInput.value = appSettings.apiKey;
    buyerNameInput.value = appSettings.buyerName;
    buyerTaxIdInput.value = appSettings.buyerTaxId;
    buyerAddressInput.value = appSettings.buyerAddress;

    renderCategories();
    renderReceipts();
}

function showError(msg) {
    if (msg) {
        errorText.textContent = msg;
        errorBox.classList.remove('hidden');
    } else {
        errorBox.classList.add('hidden');
    }
}

// --- Settings Logic ---
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    appSettings = {
        apiKey: apiKeyInput.value.trim(),
        buyerName: buyerNameInput.value.trim(),
        buyerTaxId: buyerTaxIdInput.value.trim(),
        buyerAddress: buyerAddressInput.value.trim()
    };
    localStorage.setItem('app_settings', JSON.stringify(appSettings));
    settingsPanel.classList.add('hidden');
    alert('บันทึกการตั้งค่าแล้ว');
});

// --- Category Logic ---
function renderCategories() {
    categoryInput.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryInput.appendChild(option);
    });

    categoryListEl.innerHTML = '';
    categories.forEach((cat, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-gray-50 p-2 rounded border';
        li.innerHTML = `
            <span>${cat}</span>
            <button onclick="deleteCategory(${index})" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash"></i></button>
        `;
        categoryListEl.appendChild(li);
    });
}

function saveCategories() {
    localStorage.setItem('coffee_categories', JSON.stringify(categories));
    renderCategories();
}

addCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newCat = newCategoryInput.value.trim();
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        saveCategories();
        newCategoryInput.value = '';
    }
});

window.deleteCategory = (index) => {
    if (confirm(`ลบหมวดหมู่ "${categories[index]}"?`)) {
        categories.splice(index, 1);
        saveCategories();
    }
};

manageCategoryBtn.addEventListener('click', () => categoryModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => categoryModal.classList.add('hidden'));

// --- Image Upload & AI ---
uploadBox.addEventListener('click', () => {
    if (!currentBase64Image) imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentMimeType = file.type;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            imagePreview.src = result;
            uploadBox.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            
            // Resize and compress image before sending to AI
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                currentBase64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                
                // Process with AI
                processImageWithAI();
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    }
});

removeImgBtn.addEventListener('click', () => {
    imageInput.value = '';
    currentBase64Image = null;
    currentMimeType = null;
    previewContainer.classList.add('hidden');
    uploadBox.classList.remove('hidden');
    
    // Clear form
    storeNameInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
    isOriginalReceipt.checked = false;
    updateSubmitBtnText();
    showError(null);
});

async function processImageWithAI() {
    if (!appSettings.apiKey) {
        showError("กรุณาตั้งค่า Gemini API Key ในปุ่ม 'ตั้งค่า' ก่อน");
        settingsPanel.classList.remove('hidden');
        return;
    }

    loadingAi.classList.remove('hidden');
    showError(null);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${appSettings.apiKey}`;
        const prompt = `
            นี่คือรูปภาพใบเสร็จ/บิลค่าใช้จ่าย กรุณาสกัดข้อมูลให้อยู่ในรูปแบบ JSON เท่านั้น:
            {
              "store_name": "ชื่อร้านค้า หรือ บริษัท (สตริง)",
              "total_amount": "ยอดรวมสุทธิ (ตัวเลขหรือสตริง)",
              "date": "วันที่ในใบเสร็จ (รูปแบบ dd/mm/yyyy ใช้ปี ค.ศ. หรือ พ.ศ. ก็ได้)",
              "category": "หมวดหมู่ค่าใช้จ่าย เลือกจาก: ${categories.join(', ')}",
              "is_receipt": "boolean (ตอบ true ถ้าเอกสารนี้มีคำว่า ใบเสร็จรับเงิน/Receipt/ใบกำกับภาษี ที่เป็นทางการ, ตอบ false ถ้าเป็นแค่สลิปโอนเงิน หรือใบสั่งซื้อ/Order ธรรมดา)"
            }
            หากไม่พบข้อมูลส่วนไหน ให้ใส่ค่าเป็นสตริงว่าง ""
        `;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpeg", data: currentBase64Image } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errMsg = errorData.error?.message || response.statusText;
            throw new Error(`API Error: ${response.status} - ${errMsg}`);
        }
        
        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const extracted = JSON.parse(jsonText);
        
        let extractedDate = extracted.date || '';
        if (extractedDate.includes('/')) {
           const parts = extractedDate.split('/');
           if (parts.length === 3 && parseInt(parts[2]) > 2500) {
               parts[2] = (parseInt(parts[2]) - 543).toString();
               extractedDate = parts.join('/');
           }
        }

        storeNameInput.value = extracted.store_name || '';
        amountInput.value = extracted.total_amount || '';
        dateInput.value = extractedDate;
        
        if (categories.includes(extracted.category)) {
            categoryInput.value = extracted.category;
        }

        isOriginalReceipt.checked = extracted.is_receipt === true;
        updateSubmitBtnText();

    } catch (err) {
        showError(`เกิดข้อผิดพลาด: ${err.message}`);
        console.error(err);
    } finally {
        loadingAi.classList.add('hidden');
    }
}

isOriginalReceipt.addEventListener('change', updateSubmitBtnText);

function updateSubmitBtnText() {
    submitBtnText.textContent = isOriginalReceipt.checked ? 'บันทึกใบเสร็จลงระบบ' : 'สร้างใบแทนใบเสร็จ (PDF)';
}

// --- Submit to Google Apps Script ---
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBase64Image) {
        showError("กรุณาอัปโหลดรูปภาพใบเสร็จ");
        return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> กำลังบันทึก...';
    showError(null);

    const formData = {
        mimeType: "image/jpeg",
        imageBase64: currentBase64Image,
        storeName: storeNameInput.value,
        totalAmount: amountInput.value,
        date: dateInput.value,
        category: categoryInput.value,
        isOriginalReceipt: isOriginalReceipt.checked,
        buyerName: appSettings.buyerName,
        buyerAddress: appSettings.buyerAddress,
        buyerTaxId: appSettings.buyerTaxId
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            const newReceipt = {
                id: Date.now(),
                storeName: formData.storeName,
                totalAmount: formData.totalAmount,
                date: formData.date,
                category: formData.category,
                isOriginal: formData.isOriginalReceipt,
                driveUrl: result.fileUrl,
                timestamp: new Date().toLocaleString('th-TH')
            };

            receipts.unshift(newReceipt);
            localStorage.setItem('coffee_receipts', JSON.stringify(receipts));
            
            removeImgBtn.click(); // Reset form
            renderReceipts();
            alert('บันทึกสำเร็จ!');
        } else {
            throw new Error(result.message || "เกิดข้อผิดพลาดจากฝั่ง Google Drive");
        }
    } catch (err) {
        showError(err.message || "ไม่สามารถเชื่อมต่อกับ Google Drive ได้");
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// --- History List ---
function renderReceipts() {
    expenseList.innerHTML = '';
    
    if (receipts.length === 0) {
        expenseList.innerHTML = '<p class="text-center text-gray-400 py-4">ยังไม่มีข้อมูลใบเสร็จ</p>';
        return;
    }

    receipts.forEach(receipt => {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-3 rounded border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2';
        
        const badgeClass = receipt.isOriginal ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700';
        const badgeText = receipt.isOriginal ? 'ใบเสร็จ' : 'ใบแทนฯ';

        div.innerHTML = `
            <div>
                <p class="font-bold text-gray-800">${receipt.storeName} <span class="text-sm font-normal text-gray-500 ml-2">${receipt.date || '-'}</span></p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">${receipt.category}</span>
                    <span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${badgeText}</span>
                </div>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                <span class="font-bold text-red-600">฿${Number(receipt.totalAmount).toLocaleString()}</span>
                <div class="flex gap-2">
                    ${receipt.driveUrl ? `<a href="${receipt.driveUrl}" target="_blank" class="text-green-600 bg-green-100 px-2 py-1 rounded text-sm hover:bg-green-200">เปิดดู</a>` : ''}
                    <button onclick="deleteReceipt(${receipt.id}, '${receipt.driveUrl || ''}')" class="text-red-500 hover:text-red-700 bg-red-100 px-2 py-1 rounded text-sm"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        expenseList.appendChild(div);
    });
}

window.deleteReceipt = async (id, driveUrl) => {
    if (!confirm('ยืนยันการลบข้อมูล?')) return;
    
    if (driveUrl) {
        // Option to delete from drive, but we don't block UI if it fails
        fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', fileUrl: driveUrl })
        }).catch(e => console.error("Drive delete failed", e));
    }
    
    receipts = receipts.filter(r => r.id !== id);
    localStorage.setItem('coffee_receipts', JSON.stringify(receipts));
    renderReceipts();
};

// PWA Install
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.classList.add('hidden');
        deferredPrompt = null;
    }
});

// Start
init();
