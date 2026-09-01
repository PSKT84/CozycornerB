// ==========================================
// Cozy Corner - Order Taking App
// ==========================================

// --- Default Data ---
const DEFAULT_CATEGORIES = ['Coffee', 'เครื่องดื่มอื่นๆ'];

const DEFAULT_MENU = [
    { id: 1, name: 'อเมริกาโน่', price: 50, category: 'Coffee', isCoffee: true },
    { id: 2, name: 'ดริป', price: 55, category: 'Coffee', isCoffee: true },
    { id: 3, name: 'โคลบริว', price: 50, category: 'Coffee', isCoffee: true },
    { id: 4, name: 'ลาเต้เย็น', price: 55, category: 'Coffee', isCoffee: true },
    { id: 5, name: 'โครโค่กาโน่', price: 55, category: 'Coffee', isCoffee: true },
    { id: 6, name: 'กาแฟส้มมะปี๊ด', price: 65, category: 'Coffee', isCoffee: true },
    { id: 7, name: 'กาแฟส้มมะปี๊ดโซดา', price: 70, category: 'Coffee', isCoffee: true },
    { id: 8, name: 'ยุซุกาโน่', price: 75, category: 'Coffee', isCoffee: true },
    { id: 9, name: 'พิงค์เลม่อนกาโน่', price: 55, category: 'Coffee', isCoffee: true },
    { id: 10, name: 'มอคค่าเย็น', price: 75, category: 'Coffee', isCoffee: true },
    { id: 11, name: 'ชาไทยเอสเย็น', price: 65, category: 'เครื่องดื่มอื่นๆ', isCoffee: false },
];

const DEFAULT_BEANS = [
    { id: 1, name: 'ดอยสามหมื่น', extraPrice: 5 },
    { id: 2, name: 'Choc blue blend', extraPrice: 5 },
    { id: 3, name: 'Columbia pineapple', extraPrice: 10 },
    { id: 4, name: 'Columbia whisky', extraPrice: 10 },
    { id: 5, name: 'Columbia raisin rum', extraPrice: 10 },
    { id: 6, name: 'Columbia strawberry', extraPrice: 10 },
    { id: 7, name: 'ดอยลานม่น', extraPrice: 11 },
    { id: 8, name: 'Blueberry pie blend', extraPrice: 14 },
];

// --- State ---
let menuItems = JSON.parse(localStorage.getItem('cc_menu')) || DEFAULT_MENU;
let specialBeans = JSON.parse(localStorage.getItem('cc_beans')) || DEFAULT_BEANS;
let categories = JSON.parse(localStorage.getItem('cc_categories')) || DEFAULT_CATEGORIES;
let orders = JSON.parse(localStorage.getItem('cc_orders')) || [];
let currentOrderItems = {}; // { menuItemId: { qty, beanId } }
let currentFilter = 'all';
let orderCounter = parseInt(localStorage.getItem('cc_orderCounter') || '0');

// --- Helpers ---
function save() {
    localStorage.setItem('cc_menu', JSON.stringify(menuItems));
    localStorage.setItem('cc_beans', JSON.stringify(specialBeans));
    localStorage.setItem('cc_categories', JSON.stringify(categories));
    localStorage.setItem('cc_orders', JSON.stringify(orders));
    localStorage.setItem('cc_orderCounter', orderCounter.toString());
}

function nextId(arr) {
    return arr.length === 0 ? 1 : Math.max(...arr.map(i => i.id)) + 1;
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function getTodayOrders() {
    const today = getTodayKey();
    return orders.filter(o => o.date === today);
}

// --- Navigation ---
function switchPage(pageId, navEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');

    if (pageId === 'pageOrders') renderOrders();
    if (pageId === 'pageNewOrder') renderMenuGrid();
    if (pageId === 'pageSettings') renderSettings();
}

// ==========================================
// PAGE: New Order
// ==========================================
function renderMenuGrid() {
    // Category Tabs
    const tabsEl = document.getElementById('categoryTabs');
    const usedCategories = [...new Set(menuItems.map(m => m.category))];
    tabsEl.innerHTML = '<div class="tab-btn active" onclick="selectMenuCategory(\'all\', this)">ทั้งหมด</div>';
    usedCategories.forEach(cat => {
        tabsEl.innerHTML += `<div class="tab-btn" onclick="selectMenuCategory('${cat}', this)">${cat}</div>`;
    });

    renderMenuItems('all');
}

function selectMenuCategory(cat, el) {
    document.querySelectorAll('#categoryTabs .tab-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderMenuItems(cat);
}

function renderMenuItems(filterCat) {
    const grid = document.getElementById('menuGrid');
    const items = filterCat === 'all' ? menuItems : menuItems.filter(m => m.category === filterCat);
    
    grid.innerHTML = '';
    items.forEach(item => {
        const orderItem = currentOrderItems[item.id];
        const qty = orderItem ? orderItem.qty : 0;
        const isSelected = qty > 0;

        let html = `<div class="menu-item-btn ${isSelected ? 'selected' : ''}" id="menuBtn_${item.id}">
            <div>
                <div class="item-name">${item.name}</div>
                <div class="item-price">฿${item.price}</div>
            </div>
            <div class="qty-controls">
                <button type="button" onclick="event.stopPropagation(); changeQty(${item.id}, -1)">−</button>
                <span class="qty">${qty}</span>
                <button type="button" onclick="event.stopPropagation(); changeQty(${item.id}, 1)">+</button>
            </div>
        </div>`;

        // Bean selector for coffee items
        if (isSelected && item.isCoffee && specialBeans.length > 0) {
            const selectedBeanId = orderItem.beanId || '';
            html += `<div class="bean-selector">
                <i class="fas fa-seedling"></i> เลือก Special Bean (ถ้าต้องการ):
                <select onchange="selectBean(${item.id}, this.value)">
                    <option value="">— ไม่เพิ่ม Bean —</option>
                    ${specialBeans.map(b => `<option value="${b.id}" ${selectedBeanId == b.id ? 'selected' : ''}>${b.name} (+฿${b.extraPrice})</option>`).join('')}
                </select>
            </div>`;
        }

        grid.innerHTML += html;
    });

    updateOrderSummary();
}

function changeQty(menuId, delta) {
    if (!currentOrderItems[menuId]) {
        currentOrderItems[menuId] = { qty: 0, beanId: null };
    }
    currentOrderItems[menuId].qty = Math.max(0, currentOrderItems[menuId].qty + delta);
    if (currentOrderItems[menuId].qty === 0) {
        delete currentOrderItems[menuId];
    }
    // Re-render to show/hide bean selector
    const activeCat = document.querySelector('#categoryTabs .tab-btn.active');
    const cat = activeCat ? activeCat.textContent : 'ทั้งหมด';
    renderMenuItems(cat === 'ทั้งหมด' ? 'all' : cat);
}

function selectBean(menuId, beanId) {
    if (currentOrderItems[menuId]) {
        currentOrderItems[menuId].beanId = beanId ? parseInt(beanId) : null;
    }
    updateOrderSummary();
}

function updateOrderSummary() {
    const section = document.getElementById('orderSummarySection');
    const list = document.getElementById('selectedItemsList');
    const submitBtn = document.getElementById('submitOrderBtn');
    const keys = Object.keys(currentOrderItems);
    
    if (keys.length === 0) {
        section.classList.add('hidden');
        submitBtn.disabled = true;
        return;
    }

    section.classList.remove('hidden');
    submitBtn.disabled = false;

    let html = '';
    let total = 0;
    keys.forEach(id => {
        const item = menuItems.find(m => m.id == id);
        const orderItem = currentOrderItems[id];
        if (!item) return;
        
        let linePrice = item.price * orderItem.qty;
        let beanText = '';
        if (orderItem.beanId) {
            const bean = specialBeans.find(b => b.id == orderItem.beanId);
            if (bean) {
                linePrice += bean.extraPrice * orderItem.qty;
                beanText = `<div class="bean-info">+ ${bean.name} (+฿${bean.extraPrice}/แก้ว)</div>`;
            }
        }
        total += linePrice;
        html += `<div class="item-line"><span>${item.name} x${orderItem.qty}</span><span>฿${linePrice}</span></div>${beanText}`;
    });
    html += `<div style="border-top: 1px dashed #ccc; margin-top: 8px; padding-top: 8px; font-weight: 700; text-align: right; color: #C62828;">รวม ฿${total}</div>`;
    list.innerHTML = html;

    submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> ยืนยันออเดอร์ (฿${total})`;
}

function submitOrder() {
    const keys = Object.keys(currentOrderItems);
    if (keys.length === 0) return;

    orderCounter++;
    const items = keys.map(id => {
        const item = menuItems.find(m => m.id == id);
        const orderItem = currentOrderItems[id];
        let beanName = null;
        let beanExtra = 0;
        if (orderItem.beanId) {
            const bean = specialBeans.find(b => b.id == orderItem.beanId);
            if (bean) { beanName = bean.name; beanExtra = bean.extraPrice; }
        }
        return {
            name: item.name,
            price: item.price,
            qty: orderItem.qty,
            beanName,
            beanExtra
        };
    });

    const total = items.reduce((sum, i) => sum + (i.price + i.beanExtra) * i.qty, 0);
    const totalCups = items.reduce((sum, i) => sum + i.qty, 0);
    const note = document.getElementById('orderNote').value.trim();

    const order = {
        id: Date.now(),
        num: orderCounter,
        date: getTodayKey(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        items,
        total,
        totalCups,
        note,
        completed: false
    };

    orders.unshift(order);
    save();

    // Reset
    currentOrderItems = {};
    document.getElementById('orderNote').value = '';
    renderMenuGrid();
    
    // Switch to orders page
    switchPage('pageOrders', document.querySelectorAll('.nav-item')[0]);
    alert(`✅ ออเดอร์ #${orderCounter} (฿${total}) บันทึกแล้ว!`);
}

// ==========================================
// PAGE: Orders (Sticky Notes)
// ==========================================
function filterOrders(filter) {
    currentFilter = filter;
    document.querySelectorAll('#pageOrders .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderOrders();
}

function renderOrders() {
    const list = document.getElementById('ordersList');
    let todayOrders = getTodayOrders();

    // Summary
    const totalOrders = todayOrders.length;
    const totalCups = todayOrders.reduce((s, o) => s + o.totalCups, 0);
    const totalRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalCups').textContent = totalCups;
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();

    // Filter
    if (currentFilter === 'pending') todayOrders = todayOrders.filter(o => !o.completed);
    if (currentFilter === 'completed') todayOrders = todayOrders.filter(o => o.completed);

    if (todayOrders.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding: 40px 0;"><i class="fas fa-clipboard" style="font-size:2rem;"></i><p style="margin-top:8px;">ยังไม่มีออเดอร์${currentFilter === 'pending' ? 'ที่รอทำ' : currentFilter === 'completed' ? 'ที่เสร็จ' : 'วันนี้'}</p></div>';
        return;
    }

    list.innerHTML = '';
    todayOrders.forEach(order => {
        let itemsHtml = order.items.map(i => {
            let line = `<div class="item-line"><span>${i.name} x${i.qty}</span><span>฿${(i.price + i.beanExtra) * i.qty}</span></div>`;
            if (i.beanName) line += `<div class="bean-info">☕ ${i.beanName}</div>`;
            return line;
        }).join('');

        const noteHtml = order.note ? `<div class="order-note">📝 ${order.note}</div>` : '';
        const completedClass = order.completed ? 'completed' : '';
        const completeBtnText = order.completed ? '✓ เสร็จแล้ว' : 'เสิร์ฟแล้ว';
        const completeBtnClass = order.completed ? 'complete-btn done' : 'complete-btn';

        list.innerHTML += `
            <div class="sticky-note ${completedClass}">
                <button class="delete-order" onclick="deleteOrder(${order.id})"><i class="fas fa-times"></i></button>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="order-num">#${order.num}</span>
                    <span class="order-time"><i class="far fa-clock"></i> ${order.time}</span>
                </div>
                <div class="order-items">${itemsHtml}</div>
                ${noteHtml}
                <div class="order-total">รวม ฿${order.total}</div>
                <button class="${completeBtnClass}" onclick="toggleComplete(${order.id})">${completeBtnText}</button>
            </div>
        `;
    });
}

function toggleComplete(id) {
    const order = orders.find(o => o.id === id);
    if (order) { order.completed = !order.completed; save(); renderOrders(); }
}

function deleteOrder(id) {
    if (!confirm('ลบออเดอร์นี้?')) return;
    orders = orders.filter(o => o.id !== id);
    save();
    renderOrders();
}

// ==========================================
// PAGE: Settings
// ==========================================
function showSettingsTab(tab) {
    document.querySelectorAll('#pageSettings .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('settingsBeans').classList.add('hidden');
    document.getElementById('settingsCategories').classList.add('hidden');
    if (tab === 'menu') document.getElementById('settingsMenu').classList.remove('hidden');
    if (tab === 'beans') document.getElementById('settingsBeans').classList.remove('hidden');
    if (tab === 'categories') document.getElementById('settingsCategories').classList.remove('hidden');
}

function renderSettings() {
    // Menu Items
    const menuList = document.getElementById('menuSettingsList');
    menuList.innerHTML = '';
    menuItems.forEach(item => {
        menuList.innerHTML += `
            <div class="settings-item">
                <div class="item-info">
                    <div class="name">${item.name} ${item.isCoffee ? '☕' : ''}</div>
                    <div class="price">฿${item.price} · ${item.category}</div>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" onclick="editMenuItem(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="del-btn" onclick="deleteMenuItem(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    if (menuItems.length === 0) menuList.innerHTML = '<p style="text-align:center;color:#999;padding:16px;">ยังไม่มีเมนู</p>';

    // Beans
    const beanList = document.getElementById('beanSettingsList');
    beanList.innerHTML = '';
    specialBeans.forEach(bean => {
        beanList.innerHTML += `
            <div class="settings-item">
                <div class="item-info">
                    <div class="name">${bean.name}</div>
                    <div class="price">+฿${bean.extraPrice}</div>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" onclick="editBeanItem(${bean.id})"><i class="fas fa-edit"></i></button>
                    <button class="del-btn" onclick="deleteBeanItem(${bean.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    if (specialBeans.length === 0) beanList.innerHTML = '<p style="text-align:center;color:#999;padding:16px;">ยังไม่มี Special Bean</p>';

    // Categories
    const catList = document.getElementById('categorySettingsList');
    catList.innerHTML = '';
    categories.forEach(cat => {
        catList.innerHTML += `
            <div class="settings-item">
                <div class="item-info"><div class="name">${cat}</div></div>
                <div class="item-actions">
                    <button class="del-btn" onclick="deleteCategoryItem('${cat}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// --- Modal helpers ---
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// --- Menu CRUD ---
function openMenuModal(editId) {
    document.getElementById('editMenuId').value = editId || '';
    document.getElementById('menuModalTitle').textContent = editId ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่';
    
    // Populate category dropdown
    const catSelect = document.getElementById('menuCategoryInput');
    catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    if (editId) {
        const item = menuItems.find(m => m.id === editId);
        document.getElementById('menuNameInput').value = item.name;
        document.getElementById('menuPriceInput').value = item.price;
        document.getElementById('menuCategoryInput').value = item.category;
        document.getElementById('menuIsCoffeeInput').checked = item.isCoffee;
    } else {
        document.getElementById('menuNameInput').value = '';
        document.getElementById('menuPriceInput').value = '';
        document.getElementById('menuIsCoffeeInput').checked = true;
    }
    openModal('menuModal');
}

function saveMenuItem(e) {
    e.preventDefault();
    const editId = document.getElementById('editMenuId').value;
    const data = {
        name: document.getElementById('menuNameInput').value.trim(),
        price: parseInt(document.getElementById('menuPriceInput').value),
        category: document.getElementById('menuCategoryInput').value,
        isCoffee: document.getElementById('menuIsCoffeeInput').checked
    };

    if (editId) {
        const idx = menuItems.findIndex(m => m.id == editId);
        if (idx >= 0) menuItems[idx] = { ...menuItems[idx], ...data };
    } else {
        menuItems.push({ id: nextId(menuItems), ...data });
    }
    save();
    closeModal('menuModal');
    renderSettings();
}

function editMenuItem(id) { openMenuModal(id); }

function deleteMenuItem(id) {
    if (!confirm('ลบเมนูนี้?')) return;
    menuItems = menuItems.filter(m => m.id !== id);
    save();
    renderSettings();
}

// --- Bean CRUD ---
function openBeanModal(editId) {
    document.getElementById('editBeanId').value = editId || '';
    document.getElementById('beanModalTitle').textContent = editId ? 'แก้ไข Special Bean' : 'เพิ่ม Special Bean';

    if (editId) {
        const bean = specialBeans.find(b => b.id === editId);
        document.getElementById('beanNameInput').value = bean.name;
        document.getElementById('beanPriceInput').value = bean.extraPrice;
    } else {
        document.getElementById('beanNameInput').value = '';
        document.getElementById('beanPriceInput').value = '';
    }
    openModal('beanModal');
}

function saveBeanItem(e) {
    e.preventDefault();
    const editId = document.getElementById('editBeanId').value;
    const data = {
        name: document.getElementById('beanNameInput').value.trim(),
        extraPrice: parseInt(document.getElementById('beanPriceInput').value)
    };

    if (editId) {
        const idx = specialBeans.findIndex(b => b.id == editId);
        if (idx >= 0) specialBeans[idx] = { ...specialBeans[idx], ...data };
    } else {
        specialBeans.push({ id: nextId(specialBeans), ...data });
    }
    save();
    closeModal('beanModal');
    renderSettings();
}

function editBeanItem(id) { openBeanModal(id); }

function deleteBeanItem(id) {
    if (!confirm('ลบ Special Bean นี้?')) return;
    specialBeans = specialBeans.filter(b => b.id !== id);
    save();
    renderSettings();
}

// --- Category CRUD ---
function openCategoryModal() { 
    document.getElementById('categoryNameInput').value = '';
    openModal('categoryModal'); 
}

function saveCategoryItem(e) {
    e.preventDefault();
    const name = document.getElementById('categoryNameInput').value.trim();
    if (name && !categories.includes(name)) {
        categories.push(name);
        save();
    }
    closeModal('categoryModal');
    renderSettings();
}

function deleteCategoryItem(name) {
    if (!confirm(`ลบหมวดหมู่ "${name}"? (เมนูในหมวดนี้จะไม่ถูกลบ)`)) return;
    categories = categories.filter(c => c !== name);
    save();
    renderSettings();
}

// --- PWA Install ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
if (installBtn) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });
}

// --- Init ---
renderOrders();
