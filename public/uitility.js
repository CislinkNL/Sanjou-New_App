   // tools/orderLimitUtils.js

function exceedsOrderLimit(orderListObj, group, description, addedQty) {
    const etenLimiet = parseInt(document.getElementById("limiet_eten").textContent) || 0;
    const dessertLimiet = parseInt(document.getElementById("limiet_dessert").textContent) || 0;
    const aantalPersonen = parseInt(document.getElementById("aantal_pers").textContent) || 0;

    const totalEtenAllowed = etenLimiet * aantalPersonen;
    const totalDessertAllowed = dessertLimiet * aantalPersonen;

    let groep1Total = 0;
    let groep3Total = 0;

    // 跳过本次要修改的项（key为sku+description）
    if (orderListObj && typeof orderListObj === 'object') {
        for (const [key, item] of Object.entries(orderListObj)) {
            if (key === description) continue;
            const qty = parseInt(item.quantity) || 0;
            if (item.group === "groep1") groep1Total += qty;
            if (item.group === "groep4") groep1Total += qty * 2;
            if (item.group === "groep3") groep3Total += qty;
        }
    }

    // 只加本次要添加的数量
    if (group === "groep1") groep1Total += addedQty;
    if (group === "groep4") groep1Total += addedQty * 2;
    if (group === "groep3") groep3Total += addedQty;

    return groep1Total > totalEtenAllowed || groep3Total > totalDessertAllowed;
}


    
function triggerItemNotAddedBehavior(description, orderListObj) {
    const menuItem = document.querySelector(`[data-description="${description}"]`);
    const menuItemRect = menuItem.getBoundingClientRect();
    const copyImg = menuItem.querySelector('.menu-img').cloneNode();
    copyImg.classList.add('copy');
    copyImg.style.top = `${menuItemRect.top - 20}px`;
    copyImg.style.left = `${menuItemRect.left}px`;
    document.body.appendChild(copyImg);

    setTimeout(() => copyImg.classList.add('animate'), 50);
    setTimeout(() => copyImg.remove(), 500);

    const etenLimiet = parseInt(document.getElementById("limiet_eten").textContent) || 0;
    const dessertLimiet = parseInt(document.getElementById("limiet_dessert").textContent) || 0;
    const aantalPersonen = parseInt(document.getElementById("aantal_pers").textContent) || 0;

    const totalEtenAllowed = etenLimiet * aantalPersonen;
    const totalDessertAllowed = dessertLimiet * aantalPersonen;

    let groep1Total = 0;
    let groep3Total = 0;

    if (orderListObj && typeof orderListObj === 'object') {
        for (const item of Object.values(orderListObj)) {
            const qty = parseInt(item.quantity) || 0;
            if (item.group === "groep1") groep1Total += qty;
            if (item.group === "groep4") groep1Total += qty * 2;
            if (item.group === "groep3") groep3Total += qty;
        }
    }

    const remainingHoofd = Math.max(0, totalEtenAllowed - groep1Total);
    const remainingDessert = Math.max(0, totalDessertAllowed - groep3Total);

    const messageBar = document.createElement('div');
    messageBar.classList.add('message-bar-notAdd');
    messageBar.innerHTML = `
        <div style="font-weight: bold; color: #FF6B6B; font-size: 1.2rem; margin-bottom: 0.5rem;">
            添加失败
        </div>
        <div style="color: goldenrod; font-size: 1rem;">
            达到最大主食或甜点数量。
            <br/><br/>
            <b>Hoofdgerechten:</b> ${groep1Total}/${totalEtenAllowed} → nog ${remainingHoofd}
            <br/>
            <b>Desserts:</b> ${groep3Total}/${totalDessertAllowed} → nog ${remainingDessert}
            <br/><br/>
            您仍然可以 <b>饮料或配菜</b> 下单。
        </div>
    `;

    const messageContainer = document.getElementById('message-container-notAdd');
    messageContainer.style.display = 'flex';
    messageContainer.style.justifyContent = 'center';
    messageContainer.style.alignItems = 'center';
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '50%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.zIndex = '10002';
    messageContainer.style.width = '100vw';
    messageContainer.style.maxWidth = '100%';
    messageContainer.style.padding = '0 1rem';
    messageBar.style.backgroundColor = '#222';
    messageBar.style.color = '#f8f8f8';
    messageBar.style.padding = '1rem 1.2rem';
    messageBar.style.borderRadius = '12px';
    messageBar.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
    messageBar.style.maxWidth = '500px';
    messageBar.style.width = '100%';
    messageBar.style.fontSize = '1.05rem';
    messageBar.style.lineHeight = '1.5';
    messageBar.style.textAlign = 'left';
    messageBar.style.border = '1px solid goldenrod';

    messageContainer.appendChild(messageBar);

    setTimeout(() => messageBar.classList.add('show'), 10);
    setTimeout(() => {
        messageBar.classList.remove('show');
        setTimeout(() => {
            messageBar.remove();
            if (messageContainer.children.length === 0) {
                messageContainer.style.display = 'none';
            }
        }, 500);
    }, 4500);
}


async function updateQuantityLabelsFromFirebase() {
    const restName = AppConfig?.restName;
    const tafelId = AppConfig?.tafelId;
    if (!restName || !tafelId) return;

    const orderPath = `${restName}/tafel/${tafelId}/orders/orderlist`;
    const snapshot = await firebase.database().ref(orderPath).once('value');
    const orderData = snapshot.val() || {};

    updateQuantityLabels(orderData); // ✅ 自动兼容对象结构
}





    