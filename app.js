const defaultCategories = ["เมล็ดกาแฟ", "นม/ส่วนผสม", "แก้ว/บรรจุภัณฑ์", "ค่าน้ำ/ค่าไฟ", "ค่าจ้าง", "อื่นๆ"];
let categories = JSON.parse(localStorage.getItem('coffee_categories')) || defaultCategories;
let expenses = JSON.parse(localStorage.getItem('coffee_expenses')) || [];

// DOM Elements
const categoryInput = document.getElementById('categoryInput');
const expenseForm = document.getElementById('expenseForm');
const dateInput = document.getElementById('dateInput');
const amountInput = document.getElementById('amountInput');
const noteInput = document.getElementById('noteInput');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewContainer = document.getElementById('previewContainer');
const removeImgBtn = document.getElementById('removeImgBtn');
const expenseList = document.getElementById('expenseList');
const totalAmountEl = document.getElementById('totalAmount');

// Category Management DOM
const manageCategoryBtn = document.getElementById('manageCategoryBtn');
const categoryModal = document.getElementById('categoryModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryInput = document.getElementById('newCategoryInput');
const categoryListEl = document.getElementById('categoryList');

// Image Modal
const imageModal = document.getElementById('imageModal');
const fullImage = document.getElementById('fullImage');

let currentBase64Image = null;

// Initialize
function init() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    renderCategories();
    renderExpenses();
}

// Render Categories in Dropdown and Modal
function renderCategories() {
    // Dropdown
    categoryInput.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryInput.appendChild(option);
    });

    // Modal List
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

// Save Categories
function saveCategories() {
    localStorage.setItem('coffee_categories', JSON.stringify(categories));
    renderCategories();
}

// Add Category
addCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newCat = newCategoryInput.value.trim();
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        saveCategories();
        newCategoryInput.value = '';
    }
});

// Delete Category
window.deleteCategory = (index) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${categories[index]}"?`)) {
        categories.splice(index, 1);
        saveCategories();
    }
};

// Modal handlers
manageCategoryBtn.addEventListener('click', () => {
    categoryModal.classList.remove('hidden');
});
closeModalBtn.addEventListener('click', () => {
    categoryModal.classList.add('hidden');
});

// Image handling (resize & convert to base64)
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Resize image to max 800px width/height to save localStorage space
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 800;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
                imagePreview.src = currentBase64Image;
                previewContainer.classList.remove('hidden');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

removeImgBtn.addEventListener('click', () => {
    imageInput.value = '';
    currentBase64Image = null;
    previewContainer.classList.add('hidden');
});

// Add Expense
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newExpense = {
        id: Date.now(),
        date: dateInput.value,
        category: categoryInput.value,
        amount: parseFloat(amountInput.value),
        note: noteInput.value.trim(),
        image: currentBase64Image
    };

    expenses.unshift(newExpense); // Add to beginning
    localStorage.setItem('coffee_expenses', JSON.stringify(expenses));
    
    // Reset form
    amountInput.value = '';
    noteInput.value = '';
    removeImgBtn.click();
    
    renderExpenses();
    alert('บันทึกข้อมูลเรียบร้อยแล้ว');
});

// Delete Expense
window.deleteExpense = (id) => {
    if (confirm('ลบรายการนี้ใช่หรือไม่?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem('coffee_expenses', JSON.stringify(expenses));
        renderExpenses();
    }
};

// View Image
window.viewImage = (imgSrc) => {
    fullImage.src = imgSrc;
    imageModal.classList.remove('hidden');
};

// Render Expenses
function renderExpenses() {
    expenseList.innerHTML = '';
    let total = 0;

    if (expenses.length === 0) {
        expenseList.innerHTML = '<p class="text-center text-gray-500 py-4">ยังไม่มีรายการ</p>';
    } else {
        expenses.forEach(exp => {
            total += exp.amount;
            
            // Format date to Thai format
            const d = new Date(exp.date);
            const dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
            
            const div = document.createElement('div');
            div.className = 'bg-white p-3 rounded-lg shadow-sm border-l-4 border-yellow-500 relative flex flex-col gap-2';
            
            let imgHtml = '';
            if (exp.image) {
                imgHtml = `<div class="mt-2"><button onclick="viewImage('${exp.image}')" class="text-blue-500 text-sm hover:underline"><i class="fas fa-image mr-1"></i>ดูรูปใบเสร็จ</button></div>`;
            }

            div.innerHTML = `
                <button onclick="deleteExpense(${exp.id})" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 px-2 py-1"><i class="fas fa-trash"></i></button>
                <div class="flex justify-between items-start pr-8">
                    <div>
                        <span class="font-bold text-gray-800 block">${exp.category}</span>
                        <span class="text-xs text-gray-500"><i class="far fa-calendar-alt mr-1"></i> ${dateStr}</span>
                    </div>
                    <div class="font-bold text-red-600 text-lg">
                        ฿${exp.amount.toFixed(2)}
                    </div>
                </div>
                ${exp.note ? `<p class="text-sm text-gray-600 mt-1"><i class="fas fa-comment-dots text-gray-400 mr-1"></i> ${exp.note}</p>` : ''}
                ${imgHtml}
            `;
            expenseList.appendChild(div);
        });
    }

    // Update total amount
    totalAmountEl.textContent = `฿${total.toFixed(2)}`;
}

// PWA Install Prompt
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
        if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
    }
});

// Run init
init();
