// Update the FAB send badge with the total quantity in the order
// Update the FAB send badge with the total quantity in the order
function updateSendBadgeFromOrder(orderArray) {
    const badge = document.getElementById('fab-send-badge');
    if (!badge) return;

    let count = 0;

    if (Array.isArray(orderArray)) {
        for (const item of orderArray) {
            if (!item || typeof item !== 'object') continue; // ✅ 忽略空洞/异常项
            // 先看整行数量
            const q = Number(item.quantity);
            if (Number.isFinite(q)) {
                count += q;
                continue;
            }
            // 如果没有整行数量，兜底按 byDevice 汇总
            if (item.byDevice && typeof item.byDevice === 'object') {
                count += Object.values(item.byDevice)
                    .map(v => Number(v) || 0)
                    .reduce((a, b) => a + b, 0);
            }
        }
    }

    if (count > 0) {
        badge.textContent = String(count);
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

class Ui {
    static menu(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.menu.forEach(item => {
            let menuElement = `<img src="${item.image}" alt="${item.displayName || item.description}" id="${item.id}" class="menu-img">
        <figcaption>${item.displayName || item.description}</figcaption>
        <figcaption class="menu-price">${Utilities.convertFloatToString(item.price)}</figcaption>`;

            let node = document.createElement("figure");
            node.className = "menu-item";
            node.setAttribute("data-sku", item.sku);
            node.setAttribute("data-description", item.displayName || item.description);
            node.setAttribute("data-group", item.group);
            node.setAttribute("data-allergy", item.allergy);
            node.setAttribute("data-taxRate", item.taxRate);
            node.innerHTML = menuElement;
            frag.appendChild(node);
        });



        document.getElementById("menu").appendChild(frag);
        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener('click', () => {
                // ✅ 获取 SKU，确保能从 menu 里找到该项
                const sku = button.getAttribute("data-sku");

                // ✅ 从 `orderInstance.menu` 里查找完整数据
                const itemData = orderInstance.menu.find(item => item.sku === sku);
                if (!itemData) {
                    console.error(`❌ Item with SKU ${sku} not found in menu!`);
                    return;
                }

                // ✅ 创建 `itemDetails`，从 `itemData` 直接获取所有值
                const itemDetails = {
                    sku: itemData.sku,
                    image: itemData.image,
                    description: itemData.description,
                    group: itemData.group,
                    allergy: itemData.allergy,
                    taxRate: itemData.taxRate,
                    price: parseFloat(itemData.price) || 0, // ✅ 确保价格正确转换
                    hasOptions: itemData.hasOptions || false, // ✅ 直接使用 menuData 里的 `hasOptions`
                    options: itemData.options || {} // ✅ 确保 `options` 正确加载
                };

                // ✅ 读取当前数量（默认值 1）
                const quantityLabel = button.querySelector('.quantityLabel');
                const currentQuantity = quantityLabel ? parseInt(quantityLabel.textContent, 10) || 1 : 1;

                // ✅ 调试日志，确保数据正确
                console.log("✅ Item clicked:", itemDetails);
                console.log("✅ Options passed to message bar:", itemDetails.options);

                // ✅ 传递数据到 `createAndShowMessageBar`
                createAndShowMessageBar(itemDetails, orderInstance, currentQuantity);
            });
        });


    }


    static receiptDetails(orderInstance) {
        const receiptDetails = document.getElementById("receipt-details");
        if (!receiptDetails) return;

        const mode = orderInstance.viewMode || 'my';
        const orderArray = orderInstance.order || orderInstance._order || [];

        // 当前设备ID（保持真实id用于配色和事务）
        let myDeviceId = localStorage.getItem('deviceId');
        if (!myDeviceId) {
            myDeviceId = 'dev-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', myDeviceId);
        }
        myDeviceId = (myDeviceId || '').trim();

        // 颜色表 & 简单哈希 -> 色彩
        const COLORS = ['#FFF9C4', '#B3E5FC', '#C8E6C9', '#F8BBD0', '#D1C4E9', '#FFECB3', '#B2DFDB', '#F0F4C3', '#FFE0B2', '#E1BEE7', '#DCEDC8', '#FFCDD2', '#B0BEC5'];
        const hashDeviceIdToColor = (id) => {
            let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
            return COLORS[Math.abs(h) % COLORS.length];
        };

        // 所有设备ID（用于图例）
        const deviceIds = Array.from(new Set(orderArray.map(l => {
            const id = (l.deviceId && l.deviceId !== 'unknown') ? l.deviceId : myDeviceId;
            return (id || 'unknown').trim();
        })));


        // 图例（仅在 Per gast 显示）
        let legend = document.getElementById('device-color-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'device-color-legend';
            legend.style.display = 'flex';
            legend.style.gap = '16px';
            legend.style.marginBottom = '8px';
            // ✅ 插到外层 .receipt-details 容器，而不是 table 里面  
            const container = receiptDetails.closest('.receipt-details');
            if (container) container.insertBefore(legend, container.firstChild);
        }
        legend.style.display = (mode === 'byDevice') ? 'flex' : 'none';
        if (mode === 'byDevice') {
            legend.innerHTML = '';
            deviceIds.forEach(id => {
                const color = hashDeviceIdToColor(id);       // ✅ 颜色按真实 id
                const label = (id === myDeviceId) ? 'Jij' : 'Anderen'; // ✅ 文本只显示标签
                const span = document.createElement('span');
                span.style.display = 'inline-flex';
                span.style.alignItems = 'center';
                span.innerHTML =
                    `<span style="display:inline-block;width:16px;height:16px;background:${color};border-radius:3px;margin-right:6px;border:1px solid #888;"></span>${label}`;
                legend.appendChild(span);
            });
        }

        // 归并键：同菜同选项合并
        const makeCanonKey = (l) => {
            const opts = l.options || {};
            const sorted = Object.keys(opts).sort().reduce((r, k) => { r[k] = opts[k]; return r; }, {});
            return `${l.sku}__${JSON.stringify(sorted)}__${Number(l.price) || 0}`;
        };
        const canonKey2lineKey = {};

        // 生成三种视图的数据
        let rows = [];
        // —— 同步表头列数（插/删 “Gast” 列）并更新分隔线 colspan —— 
        const table = receiptDetails.closest('table');
        const thead = table?.querySelector('thead');
        const headerRow = thead?.querySelector('tr:nth-of-type(3)'); // 你的第3个<tr>是标题行
        if (headerRow) {
            const hasDeviceTh = !!headerRow.querySelector('th.device-id');
            if (mode === 'byDevice' && !hasDeviceTh) {
                const priceTh = headerRow.querySelector('th.price');
                const th = document.createElement('th');
                th.className = 'device-id';
                th.textContent = 'Gast';
                headerRow.insertBefore(th, priceTh);
            } else if (mode !== 'byDevice' && hasDeviceTh) {
                headerRow.querySelector('th.device-id').remove();
            }

            // 重新计算当前列数，并更新 dotted/empty 分隔线的 colspan
            const colCount = headerRow.children.length;
            thead.querySelectorAll('td.dotted-border, td.empty-border').forEach(td => {
                td.colSpan = colCount;
            });
        }

        if (mode === 'byDevice') {
            orderArray.forEach((line) => {
                const byDevice = line.byDevice || {};
                const devKeys = Object.keys(byDevice);
                if (devKeys.length > 0) {
                    devKeys.forEach(devId => {
                        const qty = Number(byDevice[devId]) || 0;
                        if (qty <= 0) return;
                        rows.push({
                            mode: 'byDevice',
                            lineKey: line.lineKey || line.sku,
                            sku: line.sku,
                            description: line.description,
                            quantity: qty,
                            price: Number(line.price) || 0,
                            deviceId: devId,                               // ✅ 保留真实 id
                            label: (devId === myDeviceId) ? 'Jij' : 'Anderen',
                            color: hashDeviceIdToColor(devId)              // ✅ 着色按真实 id
                        });
                    });
                } else {
                    const devId = (line.deviceId && line.deviceId !== 'unknown') ? line.deviceId : myDeviceId;
                    rows.push({
                        mode: 'byDevice',
                        lineKey: line.lineKey || line.sku,
                        sku: line.sku,
                        description: line.description,
                        quantity: Number(line.quantity) || 0,
                        price: Number(line.price) || 0,
                        deviceId: devId,                                 // ✅ 保留真实 id
                        label: (devId === myDeviceId) ? 'Jij' : 'Anderen',
                        color: hashDeviceIdToColor(devId)                // ✅ 着色按真实 id
                    });
                }
            });
        } else if (mode === 'my') {
            const map = new Map();
            orderArray.forEach(line => {
                const mine = Number((line.byDevice || {})[myDeviceId] || 0);
                if (mine <= 0) return;
                const key = makeCanonKey(line);
                canonKey2lineKey[key] = canonKey2lineKey[key] || (line.lineKey || line.sku);
                const prev = map.get(key) || { sku: line.sku, description: line.description, price: Number(line.price) || 0, quantity: 0 };
                prev.quantity += mine;
                map.set(key, prev);
            });
            rows = Array.from(map.values()).map(v => ({
                mode: 'my',
                lineKey: canonKey2lineKey[makeCanonKey(v)] || '',
                sku: v.sku,
                description: v.description,
                quantity: v.quantity,
                price: v.price,
                deviceId: myDeviceId,
                label: 'Jij',
                color: '#eef'
            }));
        } else { // summary
            const map = new Map();
            orderArray.forEach(line => {
                const key = makeCanonKey(line);
                canonKey2lineKey[key] = canonKey2lineKey[key] || (line.lineKey || line.sku);
                const prev = map.get(key) || { sku: line.sku, description: line.description, price: Number(line.price) || 0, quantity: 0 };
                prev.quantity += Number(line.quantity) || 0;
                map.set(key, prev);
            });
            rows = Array.from(map.values()).map(v => ({
                mode: 'summary',
                lineKey: canonKey2lineKey[makeCanonKey(v)] || '',
                sku: v.sku,
                description: v.description,
                quantity: v.quantity,
                price: v.price,
                deviceId: myDeviceId,
                label: 'Jij',
                color: '#fff'
            }));
        }

        // 渲染
        const frag = document.createDocumentFragment();
        rows.forEach(r => {
            const row = document.createElement('tr');
            row.setAttribute('data-sku', r.sku);
            if (r.lineKey) row.setAttribute('data-lineKey', r.lineKey);
            if (mode === 'byDevice') {
                row.style.background = r.color;
                row.style.color = '#111';
                if (r.deviceId === myDeviceId) row.style.fontWeight = '600';
            }
            row.innerHTML = `
      <td class="sku">${r.sku}</td>
      <td class="description" style="font-size:1.05em;font-weight:600;">${r.description}</td>
      <td class="quantity">${r.quantity}</td>
    ${mode === 'byDevice' ? `<td class="device-id">${r.label}</td>` : ``}

      <td class="price">${Utilities.convertFloatToString((r.price || 0) * (r.quantity || 0))}</td>
      <td class="modify-quantity">
        <button class="delete" data-lineKey="${r.lineKey}" data-device="${r.deviceId}" aria-label="minus">−</button>
        <button class="increase-quantity" data-lineKey="${r.lineKey}" data-device="${r.deviceId}" aria-label="plus">＋</button>
      </td>
    `;
            frag.appendChild(row);
        });
        receiptDetails.innerHTML = '';
        receiptDetails.appendChild(frag);

        // 加减事件（data-device 仍用真实 deviceId）
        document.querySelectorAll('.increase-quantity').forEach(btn => {
            btn.addEventListener('click', () => {
                const lineKey = btn.getAttribute('data-lineKey');
                let device = btn.getAttribute('data-device') || myDeviceId;
                if (!lineKey) return;
                if (typeof orderInstance.adjustLineQuantityByDevice === 'function' && device) {
                    orderInstance.adjustLineQuantityByDevice(lineKey, device, 1);
                } else {
                    orderInstance.adjustLineQuantity(lineKey, 1);
                }
            });
        });
        document.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const lineKey = btn.getAttribute('data-lineKey');
                let device = btn.getAttribute('data-device') || myDeviceId;
                if (!lineKey) return;
                if (typeof orderInstance.adjustLineQuantityByDevice === 'function' && device) {
                    orderInstance.adjustLineQuantityByDevice(lineKey, device, -1);
                } else {
                    orderInstance.adjustLineQuantity(lineKey, -1);
                }
            });
        });

        // 刷新 summary / 角标
        Ui.summary(orderInstance);
        updateQuantityLabels(orderInstance._order);
        updateSendBadgeFromOrder(orderInstance._order);
    }








    // Feature flag: disable/enable in-menu quantity badges (only on menu items, never inside receipt)
    static ENABLE_MENU_BADGES = true;



    static summary(orderInstance) {
        let subtotal = 0;
        let tax = 0;

        // Calculate the subtotal and tax (defensive against undefined / malformed data)
        (orderInstance.order || []).forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            // taxRate may be stored as percentage (e.g., 21) or decimal (e.g., 0.21). Normalize if >1.
            let taxRate = parseFloat(item.taxRate);
            taxRate = isNaN(taxRate) ? 0 : (taxRate > 1 ? taxRate / 100 : taxRate);
            const gross = qty * price; // gross (incl) if price already incl tax OR net if price is base – we treat as gross then split.
            // If price is tax-inclusive (common in menu), derive net = gross / (1+taxRate)
            const net = taxRate > 0 ? gross / (1 + taxRate) : gross;
            const itemTax = gross - net;
            subtotal += net;
            tax += itemTax;
        });

        if (!isFinite(subtotal)) subtotal = 0;
        if (!isFinite(tax)) tax = 0;
        const grandtotal = subtotal + tax;

        // ✅ Ensure elements exist before modifying them
        const subtotalElement = document.getElementById("subtotal-summary");
        const taxElement = document.getElementById("tax-summary");
        const grandtotalElement = document.getElementById("grandtotal-summary");

        if (!subtotalElement || !taxElement || !grandtotalElement) {
            console.warn("⚠️ Warning: One or more summary elements not found. Skipping update.");
            return;
        }

        // ✅ If order is empty, clear the summary
        if (orderInstance.order.length === 0) {
            console.log("🧹 Order is empty, clearing summary.");
            subtotalElement.textContent = "0.00";
            taxElement.textContent = "0.00";
            grandtotalElement.textContent = "0.00";
        } else {
            // ✅ Otherwise, update the UI with calculated values
            subtotalElement.textContent = Utilities.convertFloatToString(subtotal);
            taxElement.textContent = Utilities.convertFloatToString(tax);
            grandtotalElement.textContent = Utilities.convertFloatToString(grandtotal);
        }

        console.log("✅ Summary updated: ", { subtotal, tax, grandtotal });
    }



    static showPaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "grid";
    }

    static hidePaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "none";
    }

    static paymentSummary(orderInstance) {
        document.getElementById('amount-paid').textContent = Utilities.convertFloatToString(orderInstance.payment.amountPaid);

        const changeTipTitle = document.getElementById('tip-change-title');
        const paymentType = document.getElementById("payment-type");

        if (orderInstance.payment.type === "credit") {
            changeTipTitle.textContent = "Tip:";
            paymentType.textContent = "Pin/Creditcard";
        } else if (orderInstance.payment.type === "cash") {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "Cash";
        } else {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "";
        }
        document.getElementById("tip-change-value").textContent = Utilities.convertFloatToString(orderInstance.payment.changeTip);
    }




}







// ORDER INSTANTIATION
const order = new Order();
// order.loadMenuFromFirebase();
order.setupRealtimeListeners();



// 视图模式切换按钮绑定
// 视图模式切换
(() => {
    const wrap = document.getElementById('order-view-toggle');
    if (!wrap) return;
    wrap.querySelectorAll('button[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            wrap.querySelectorAll('button').forEach(b => {
                b.classList.remove('btn-secondary', 'active');
                b.classList.add('btn-outline-secondary');
            });
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-secondary', 'active');

            const mode = btn.getAttribute('data-mode');
            // ✅ 使用类里暴露的全局单例
            if (window.__orderInstance && typeof window.__orderInstance.setViewMode === 'function') {
                window.__orderInstance.setViewMode(mode);
            }
        });
    });
})();


// STATIC EVENT LISTENERS
//  document.getElementById("clear-order").addEventListener("click", () => {
//         order.clearOrder();
//     });

// One-click clear cart handler (transaction-safe removal of entire orderlist)
(() => {
    const clearBtn = document.getElementById('order-clear');
    if (!clearBtn) return; // Button not present
    // Toast-style async confirmation (returns Promise<boolean>)
    async function confirmClearOrder(message) {
        return new Promise(resolve => {
            // If an existing confirm toast exists, remove it first
            const existing = document.querySelector('.toast-confirm');
            if (existing) existing.remove();
            const wrap = document.createElement('div');
            wrap.className = 'toast-confirm';
            wrap.innerHTML = `
                <div class="toast-confirm-message">${message}</div>
                <div class="toast-confirm-buttons">
                    <button type="button" class="toast-confirm-ok">Ja</button>
                    <button type="button" class="toast-confirm-cancel">Nee</button>
                </div>`;
            document.body.appendChild(wrap);
            const okBtn = wrap.querySelector('.toast-confirm-ok');
            const cancelBtn = wrap.querySelector('.toast-confirm-cancel');
            const cleanup = (val) => { wrap.classList.add('hide'); setTimeout(() => wrap.remove(), 150); resolve(val); };
            okBtn.addEventListener('click', () => cleanup(true));
            cancelBtn.addEventListener('click', () => cleanup(false));
            // ESC to cancel
            const keyHandler = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', keyHandler); cleanup(false); } };
            document.addEventListener('keydown', keyHandler);
            // Auto-cancel after 15s
            setTimeout(() => { if (document.body.contains(wrap)) cleanup(false); }, 15000);
        });
    }
    clearBtn.addEventListener('click', async () => {
        try {
            if (order._order.length === 0) {
                showNotification('Bestel lijst is al leeg', 'info', 2500);
                return;
            }
            const confirmMsg = 'Weet u zeker dat u alle items wilt verwijderen?';
            const ok = await confirmClearOrder(confirmMsg);
            if (!ok) return;

            const restEl = document.getElementById('restNaam');
            const tafelEl = document.getElementById('tafelNummer');
            const restName = restEl ? restEl.innerText.trim() : null;
            const tafelId = tafelEl ? `Tafel-${tafelEl.innerText.trim()}` : null;
            if (!restName || !tafelId) {
                showNotification('Kan restaurant of tafel niet bepalen', 'error', 4000);
                return;
            }
            const db = firebase.database();
            const orderlistRef = db.ref(`/${restName}/tafel/${tafelId}/orders/orderlist`);
            const aggregatesRef = db.ref(`/${restName}/tafel/${tafelId}/orders/aggregates`);

            await orderlistRef.remove();
            // Reset aggregates to zero (so any waiter view sees immediate reset)
            await aggregatesRef.update({
                hoofdgerechten: 0,
                desserts: 0,
                totaalPrijs: 0,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => { });

            // Local state + UI
            order._order = [];
            Ui.receiptDetails(order);
            Ui.summary(order);
            updateQuantityLabels(order._order);
            showNotification('Alle items zijn verwijderd', 'removeFoodInfo', 3000);
        } catch (e) {
            console.error('Clear order failed', e);
            showNotification('Verwijderen mislukt, probeer opnieuw', 'error', 4000);
        }
    });
})();

// Toggle send button highlight based on order contents (uses order._order)
function updateSendButtonHighlight() {
    const desktopBtn = document.getElementById('order-verzend');
    const fabSend = document.querySelector('.fab-action[data-action="send"]');
    const hasItems = Array.isArray(order._order) && order._order.length > 0;
    if (desktopBtn) {
        if (hasItems) {
            desktopBtn.classList.add('send-highlight');
            desktopBtn.setAttribute('aria-label', 'Verzend bestelling');
        } else {
            desktopBtn.classList.remove('send-highlight');
        }
    }
    if (fabSend) {
        if (hasItems) {
            fabSend.classList.add('send-highlight');
            fabSend.setAttribute('aria-label', 'Verzend bestelling');
        } else {
            fabSend.classList.remove('send-highlight');
        }
    }
}

// Hook into receipt render to keep in sync
const originalReceipt = Ui.receiptDetails;
Ui.receiptDetails = function (o) {
    originalReceipt.call(Ui, o);
    updateSendButtonHighlight();
};
// Initial
updateSendButtonHighlight();

document.querySelectorAll(".paypad-show").forEach((button) => {
    button.addEventListener("click", () => {
        Ui.showPaypad(order);
        order.changePayment(JSON.parse(button.getAttribute("data-payment-type")));
    });
});



document.querySelectorAll(".paypad-btn").forEach((button) => {
    button.addEventListener("click", () => {
        order.paypad(button.getAttribute("data-id"));
    });
});

function bevestigen() {
    const confirm = document.getElementById("lastOrderFrame");

    confirm.style.display = "grid";

    google.script.run.withSuccessHandler(function (orderData) {
        showConform();
    }).createTxt();
}



function refreshMainBodyContent() {
    // Code to refresh the content of the mainBody div
    $('#mainBody').load(location.href + ' #mainBody>*', '');
}




async function generateNewOrderNumber() {
    // Fetch restaurant and table details
    const RestNameUrlElement = document.getElementById('restNaam');
    const tafelIdElement = document.getElementById('tafelNummer');

    // Validate DOM elements
    if (!RestNameUrlElement || !tafelIdElement) {
        console.error("Required DOM elements (restNaam or tafelNummer) are missing.");
        throw new Error("DOM elements missing");
    }

    const RestNameUrl = RestNameUrlElement.innerText.trim();
    const tafelId = `Tafel-${tafelIdElement.innerText.trim()}`; // Add "Tafel-" prefix

    const db = firebase.database();
    const ORDER_Number_PATH = `${RestNameUrl}/tafel/${tafelId}/orders/orderNumbers`;
    const orderNumberRef = db.ref(ORDER_Number_PATH);

    try {
        // Retrieve the current order number from Firebase
        const snapshot = await orderNumberRef.once('value');
        let currentNumber = snapshot.val() || 0;
        let newOrderNumber = currentNumber + 1;

        // Update the database with the new order number
        await orderNumberRef.set(newOrderNumber);
        console.log(`New order number ${newOrderNumber} updated in Firebase.`);
        return newOrderNumber; // Return the new order number for further use
    } catch (error) {
        console.error("Error generating new order number:", error);
        throw error; // Re-throw the error for upstream handling
    }
}


//=========================================================================
// 轮数归零的功能，可能要在menukaar里面使用
//=========================================================================
function deleteOrderNumber() {
    const RestNameUrlElement = document.getElementById('restNaam');
    const tafelIdElement = document.getElementById('tafelNummer');

    // Validate DOM elements
    if (!RestNameUrlElement || !tafelIdElement) {
        console.error("Required DOM elements (restNaam or tafelNummer) are missing.");
        return;
    }

    const RestNameUrl = RestNameUrlElement.innerText.trim();
    const tafelId = `Tafel-${tafelIdElement.innerText.trim()}`; // Add "Tafel-" prefix
    const OrderNumberPath = `${RestNameUrl}/tafel/${tafelId}/orderNumbers`;
    const orderNumberRef = firebase.database().ref(OrderNumberPath);

    // Ensure user is authenticated before performing delete
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("User is authenticated:", user.uid);

            // Delete the `newordernumber` field
            orderNumberRef.remove()
                .then(() => {
                    console.log(`Order number successfully deleted from Firebase.`);
                })
                .catch(error => {
                    console.error("Error deleting order number:", error);
                });

        } else {
            console.error("User is not authenticated. Cannot delete order number.");
        }
    });
}







function showConform2() {
    const confirm = document.getElementById('orderHistoryFrame');

    confirm.style.display = "grid";
    document.getElementById('close-btn').style.display = 'none';
    google.script.run.withSuccessHandler(function (orderData) {

        document.getElementById('lastOrderPage').innerHTML = `${orderData}`; // 先运行这个功能，把订单信息呈现出来
        document.getElementById('close-btn').style.display = 'block';
        // reload();
        document.getElementById('confirm-close').scrollIntoView({ block: 'start', behavior: 'smooth' }); //自动滚动到关闭窗口的按钮位置
    }).lastOrderInfo();
    google.script.run.createRecordHistory();

    document.getElementById('confirm-close').addEventListener('click', () => {
        $('#mainBody').hide();
        hideComfirm();
    });
}

function showIframe() {
    const confirm = document.getElementById('lastOrderFrame');

    confirm.style.display = "grid";

}






function hideComfirm() {
    const confirm = document.getElementById('orderHistoryFrame');

    confirm.style.display = "none";

}


function hideIframe() {
    const confirm = document.getElementById('lastOrderFrame');

    confirm.style.display = "none";

}





document.getElementById('confirm-close').addEventListener('click', () => {

    hideComfirm();

})





async function waitForAppConfig() {
    while (!window.AppConfig?.configReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

async function startCountdown() {
    try {
        await waitForAppConfig(); // ✅ 等待 AppConfig 初始化完成

        const rest = AppConfig?.restName;
        const tafelId = AppConfig?.tafelId;

        if (!rest || !tafelId) {
            console.error("❌ Missing restName or tafelId in AppConfig.");
            return;
        }

        const timerElement = document.getElementById("timer");
        function showTimer() {
            if (timerElement) timerElement.style.display = "block";
        }
        function hideTimer() {
            if (timerElement) timerElement.style.display = "none";
        }
        // 默认先隐藏 timer，只有倒计时才显示
        if (timerElement) hideTimer();

        const db = firebase.database();
        const timerRef = db.ref(`${rest}/tafel/${tafelId}/timer`);
        const allowOrderRef = db.ref(`${rest}/tafel/settings/allow_self_order`);
        // ✅ 新节点 config/round_time，保留对旧 settings/round_time 的兼容
        const roundTimeConfigRef = db.ref(`${rest}/config/round_time`);
        const roundTimeLegacyRef = db.ref(`${rest}/settings/round_time`); // legacy fallback

        let [timerSnapshot, allowOrderSnapshot, roundTimeSnapshot] = await Promise.all([
            timerRef.once('value'),
            allowOrderRef.once('value'),
            roundTimeConfigRef.once('value')
        ]);
        if (roundTimeSnapshot.val() == null) {
            const legacySnap = await roundTimeLegacyRef.once('value');
            if (legacySnap.val() != null) {
                roundTimeSnapshot = legacySnap;
                console.info('[round_time] Using legacy settings/round_time path (config missing)');
            }
        }

        const timerData = timerSnapshot.val();
        const allowSelfOrder = allowOrderSnapshot.val();
        function normalizeRoundTimeToMinutes(val) {
            const n = Number(val);
            if (!Number.isFinite(n)) return null;
            return n > 1000 ? Math.round(n / 60000) : n; // >1000 视为毫秒
        }

        let configuredRoundTime = normalizeRoundTimeToMinutes(roundTimeSnapshot.val()); // → 分钟

        if (!timerData || !timerData.startTime || !timerData.duration || !timerData.endTime) {
            console.warn("⚠️ No valid timer data found in Firebase.");
            if (timerElement) hideTimer();
            return;
        }

        const timestamp = timerData.startTime;
        let countDownMinutes = timerData.duration;
        let endTime = timerData.endTime;
        const currentTime = Date.now();
        let remainingTime = endTime - currentTime;

        // ✅ 如果配置的 round_time 与当前 timer 中的 duration 不一致（例如配置改成15，timer 还是10），则自动矫正
        if (configuredRoundTime && configuredRoundTime !== countDownMinutes) {
            console.log(`🔄 Detected mismatch: timer.duration=${countDownMinutes} vs config.round_time=${configuredRoundTime}. Updating timer node.`);
            const newEndTime = timestamp + configuredRoundTime * 60 * 1000;
            await timerRef.update({ duration: configuredRoundTime, endTime: newEndTime });
            countDownMinutes = configuredRoundTime;
            endTime = newEndTime;
            remainingTime = endTime - Date.now();
        }

        console.log(`🕒 Timer Data for ${tafelId}:`, {
            timestamp: new Date(timestamp).toLocaleString(),
            countDownMinutes,
            endTime: new Date(endTime).toLocaleString(),
            remainingTime
        });

        if (remainingTime <= 0) {
            if (timerElement) {
                timerElement.innerHTML = "U kunt nu bestellen";
                showTimer();
                setTimeout(hideTimer, 3000); // 3秒后隐藏
            }
            console.log("✅ Timer expired, showing immediate message.");
        } else {
            showTimer();
            updateTimer(endTime, 'timer', "U kunt nu bestellen", function () {
                if (timerElement) {
                    setTimeout(hideTimer, 3000); // 3秒后隐藏
                }
                console.log("✅ Countdown finished!");
            });
        }

        // ✅ 实时监听计时器更新
        timerRef.on('value', (snapshot) => {
            const updatedData = snapshot.val();
            if (updatedData && updatedData.endTime) {
                const newRemainingTime = updatedData.endTime - Date.now();
                if (newRemainingTime > 0) {
                    showTimer();
                    updateTimer(updatedData.endTime, 'timer', "U kunt nu bestellen", function () {
                        if (timerElement) {
                            setTimeout(hideTimer, 3000); // 3秒后隐藏
                        }
                        console.log("⏳ Timer updated dynamically.");
                    });
                } else {
                    if (timerElement) {
                        timerElement.innerHTML = "U kunt nu bestellen";
                        showTimer();
                        setTimeout(hideTimer, 3000); // 3秒后隐藏
                    }
                    console.log("✅ Timer expired, displaying final message.");
                }
            } else {
                if (timerElement) hideTimer();
            }
        });

    } catch (error) {
        console.error("🚨 Error in startCountdown:", error);
    }
}







// Helper function to update timer display and handle completion
function updateTimer(endTime, elementId, finalMessage, onComplete) {
    console.log("Starting timer with end time:", endTime);

    var timerElement = document.getElementById(elementId);
    if (!timerElement) {
        console.error(`Timer element '${elementId}' not found.`);
        return;
    }

    // Clear any existing interval to avoid multiple timers running simultaneously
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
    }

    window.timerInterval = setInterval(function () {
        var currentTime = Date.now();
        var distance = endTime - currentTime;

        console.log("Current time:", currentTime, "Remaining time:", distance);

        if (distance <= 0) {
            clearInterval(window.timerInterval);
            timerElement.innerHTML = finalMessage || "U kunt nu bestellen"; // Default message when timer finishes
            applyCustomTranslations();
            console.log("Timer completed.");
            if (onComplete) onComplete();
            return;
        }

        var minutes = Math.floor(distance / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Ensure two-digit formatting
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        timerElement.innerHTML = `<br> <span class="countdown">${minutes}:${seconds}</span>`;
        console.log("Timer running:", `${minutes}:${seconds}`);

    }, 1000);
}




function updateTimerSessie(endTime, elementId, finalMessage, onComplete) {
    var messageShown = false; // Flag to track if the message has been shown
    var timerInterval = setInterval(function () {
        var currentTime = new Date().getTime();
        var distance = endTime - currentTime;

        var hours = Math.floor(distance / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        var formattedEndTime = new Date(endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

        // Ensure two-digit formatting
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        var timerElement = document.getElementById(elementId);
        if (distance < 0) {
            clearInterval(timerInterval);
            timerElement.innerHTML = finalMessage;
            if (onComplete) onComplete(); // Call the completion callback
        } else {
            timerElement.innerHTML = `<br> <span class="countdown">${hours}:${minutes}:${seconds}</span>`;
            if (hours === '00' && minutes <= '15' && !messageShown) {
                document.getElementById('message-container').innerHTML = 'Het is bijna 2,5 uur geweest. Wilt u nog iets bijbestellen? Uw huidige sessie eindigt rondom <b><font color="goldenrod">' + formattedEndTime + '</font></b>.';
                document.getElementById('message-container').classList.add('visible');
                document.getElementById('overlay-2').classList.add('visible');
                messageShown = true; // Set flag to true to prevent re-display
            }
        }
    }, 1000);
}

document.getElementById('overlay-2').addEventListener('click', function () {
    document.getElementById('message-container').classList.remove('visible');
    this.classList.remove('visible');
});


// ===== BadgeManager (debounced badge quantity updates) =====
// Provides a unified, debounced interface to update menu item quantity badges,
// plus an initial safe sync that waits for DOM rendering to finish.
// Usage: window.BadgeManager.update(orderArray) for debounced updates,
//        window.BadgeManager.updateImmediate(orderArray) for immediate flush,
//        window.BadgeManager.scheduleInitial(orderArray, markSyncedCb) for first paint.
(function () {
    if (window.BadgeManager) return; // singleton guard

    function coreApplyQuantityLabels(orderData) {
        if (!Ui.ENABLE_MENU_BADGES) {
            document.querySelectorAll('.menu-item .quantityLabel').forEach(l => l.style.display = 'none');
            return;
        }
        const orders = Array.isArray(orderData) ? orderData : [];
        const currentSKUs = orders.map(item => item.sku);
        // Remove stray labels in receipt
        document.querySelectorAll('#receipt-details .quantityLabel').forEach(l => l.remove());
        orders.forEach(orderItem => {
            const itemElement = document.querySelector(`.menu-item[data-sku="${orderItem.sku}"]`);
            if (!itemElement) return;
            let quantityLabel = itemElement.querySelector('.quantityLabel');
            if (!quantityLabel) quantityLabel = createQuantityLabel(itemElement);
            quantityLabel.textContent = orderItem.quantity;
            quantityLabel.style.display = orderItem.quantity > 0 ? 'inline-block' : 'none';
        });
        document.querySelectorAll('.menu-item .quantityLabel').forEach(label => {
            const parent = label.closest('.menu-item');
            const sku = parent ? parent.getAttribute('data-sku') : null;
            if (!currentSKUs.includes(sku)) {
                label.textContent = 0;
                label.style.display = 'none';
            }
        });
    }

    window.BadgeManager = {
        debounceMs: 90,
        _timer: null,
        _lastData: null,
        update(orderData) {
            this._lastData = orderData;
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => { this._flush(); }, this.debounceMs);
        },
        updateImmediate(orderData) {
            if (this._timer) { clearTimeout(this._timer); this._timer = null; }
            this._lastData = orderData;
            this._flush(true);
        },
        _flush(isImmediate) {
            const data = this._lastData || [];
            this._timer = null;
            try { coreApplyQuantityLabels(data); }
            catch (e) { console.warn('[BadgeManager] apply error', e); }
            if (!isImmediate) this._lastData = null; // keep last data only if immediate can reuse
        },
        scheduleInitial(orderData, markSyncedCb) {
            const maxAttempts = 10;
            let attempt = 0;
            const snapshot = Array.isArray(orderData) ? [...orderData] : [];
            const trySync = () => {
                const menuItems = document.querySelectorAll('.menu-item');
                if (menuItems.length) {
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        this.updateImmediate(snapshot);
                        if (typeof markSyncedCb === 'function') {
                            try { markSyncedCb(); } catch (e) { console.warn('markSyncedCb error', e); }
                        }
                        console.log(`[BadgeManager] initial sync success attempt ${attempt + 1}`);
                    }));
                } else if (attempt < maxAttempts) {
                    attempt++;
                    setTimeout(trySync, 50);
                } else {
                    console.warn('[BadgeManager] initial sync failed (no menu items)');
                }
            };
            trySync();
        }
    };

    // Backward compatible function direct call path
    window._applyQuantityLabelsCore = coreApplyQuantityLabels;
})();

// Public (debounced) API used across legacy code.
function updateQuantityLabels(orderData = null) {
    if (window.BadgeManager) {
        window.BadgeManager.update(orderData);
    } else {
        // Fallback: direct apply (should not normally happen)
        window._applyQuantityLabelsCore(orderData);
    }
}




// Helper function to create a quantity label dynamically if it doesn't exist
function createQuantityLabel(itemElement) {
    console.log("Creating quantity label for:", itemElement);
    const quantityLabel = document.createElement('span');
    quantityLabel.className = 'quantityLabel';
    itemElement.appendChild(quantityLabel);
    return quantityLabel;
}







//////////////////////////here under new testing for functions/////////////

// Function to detect and log the user's browser language
function detectUserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    console.log("User's browser language is:", userLang);
    document.getElementById("translate-popup").style.display = "none";
    return userLang;
}

// Function to show translation popup if user language is not Dutch
function showTranslationPopupIfNeeded() {
    const userLang = detectUserLanguage();
    if (!userLang.startsWith("nl")) { // Show the popup if language is not Dutch
        document.getElementById("translate-popup").style.display = "flex";
    } else {
        return;
    }
}

// Function to remove Google Translate popup
function removeGoogleTranslatePopup() {
    // Check and remove the pop-up by ID
    const popup = document.getElementById('goog-gt-tt');
    if (popup) {
        popup.remove();
    }

    // Check and remove the pop-up by specific class
    const classPopup = document.querySelector('.VIpgJd-suEOdc.VIpgJd-yAWNEb-L7lbkb.skiptranslate');
    if (classPopup) {
        classPopup.remove();
    }
}

// Function to hide Google Translate banner
function hideGoogleTranslateBanner() {
    const googleTranslateBanner = document.querySelector('.goog-te-banner-frame');
    if (googleTranslateBanner) {
        googleTranslateBanner.style.display = 'none';
    }
}



// Main function to run on document load
function onDocumentLoad() {
    // Start countdown

    startCountdown();
    setupTimerListener();
    // Show translation popup if needed
    showTranslationPopupIfNeeded();

    // Remove any Google Translate pop-ups or banners immediately
    removeGoogleTranslatePopup();
    hideGoogleTranslateBanner();

    // Set intervals to catch any delayed pop-ups or banners
    setInterval(removeGoogleTranslatePopup, 1000);
    setInterval(hideGoogleTranslateBanner, 1000);


    // ===== Smooth scroll with highlight effect =====
    document.addEventListener('click', function (e) {
        const target = e.target.closest('.btn-foodlvl2, .btn-drinkslvl2, .btn-lvl3, #service-btn, #btn-service-main');
        if (!target) return;

        e.preventDefault();
        const targetId = target.getAttribute('href')?.replace('#', '');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            animateHighlight(targetElement);
        }
    });

    function animateHighlight(element) {
        element.style.transition = 'background-color 0.5s ease';
        element.style.backgroundColor = '#ffeb3b';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 1500);
    }

    ///////prevent overlay-2 to refresh the page by touchmove action from the users
    const layers = document.querySelectorAll('.prevent-scroll');
    const touchThreshold = 50; // Set a threshold in pixels
    let startY = 0;

    layers.forEach(layer => {
        layer.addEventListener('touchstart', (event) => {
            startY = event.touches[0].clientY; // Record the initial Y position
        });

        layer.addEventListener('touchmove', (event) => {
            const currentY = event.touches[0].clientY;
            const deltaY = Math.abs(currentY - startY);

            if (deltaY > touchThreshold) {
                event.preventDefault(); // Prevent the default behavior if the threshold is exceeded
            }
        }, { passive: false });
    });
}

// Event listeners for the buttons in the translation popup,目前的問題是用了翻譯功能的話，console裡面會有報錯，不過不影響使用。
document.addEventListener("DOMContentLoaded", () => {
    // ✅ 函数：设置辅助属性（避免因翻译或动态加载导致属性丢失）
    function applyAttributes() {
        const elements = document.querySelectorAll(
            ".add-to-order, .quantity-adjust.increase-quantity, .quantity-adjust.delete, .menu-item, .close-message-bar, .btn-outline-success"
        );

        elements.forEach((element) => {
            try {
                // ✅ 确保该元素支持 setAttribute（跳过 SVG 或 null）
                if (element && typeof element.setAttribute === "function") {
                    element.setAttribute("aria-pressed", "false");
                }
            } catch (err) {
                console.warn("⚠️ Failed to apply attributes:", element, err);
            }
        });
    }

    // ✅ 初次调用，确保页面加载后立即执行一次
    applyAttributes();

    // ✅ 延迟调用一次，用于兼容 Google Translate 动态修改后的情况
    setTimeout(applyAttributes, 1000);

    // ✅ MutationObserver：监听 DOM 变化，持续修复翻译后的元素属性
    const observer = new MutationObserver((mutations) => {
        applyAttributes();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // ✅ 处理 Google Translate 弹窗按钮
    const yesBtn = document.getElementById("translate-yes");
    const noBtn = document.getElementById("translate-no");
    const popup = document.getElementById("translate-popup");
    const widget = document.getElementById("google_translate_element");

    if (yesBtn && widget && popup) {
        yesBtn.addEventListener("click", () => {
            widget.style.display = "block";
            popup.style.display = "none";
            console.log("✅ User accepted translation.");
        });
    }

    if (noBtn && popup) {
        noBtn.addEventListener("click", () => {
            popup.style.display = "none";
            console.log("❎ User declined translation.");
        });
    }
});

function hashDeviceIdToColor(deviceId) {
    const COLORS = [
        '#FFF9C4', '#B3E5FC', '#C8E6C9', '#F8BBD0',
        '#D1C4E9', '#FFECB3', '#B2DFDB', '#F0F4C3',
        '#FFE0B2', '#E1BEE7', '#DCEDC8', '#FFCDD2', '#B0BEC5'
    ];
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
        hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}


// Run onDocumentLoad when the document is fully loaded
document.addEventListener("DOMContentLoaded", onDocumentLoad);

