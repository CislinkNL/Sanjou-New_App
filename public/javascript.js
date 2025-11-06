
  // Assuming orderInstance is defined elsewhere in your code
// You can use the Order class defined in order.js here
const orderInstance = new Order();

//////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////
// Function to format timestamp to HH:MM format
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}




function formatCurrency(amount) {
    // Format amount with euros symbol and two decimal places
    return `€${amount.toFixed(2)}`;
}
//////////////////////////////////////////////////
//progress bar script. to start with value 15 in Index.html file, header section
function progressbarShow() {
 

  // Show the overlay and spinner
  $("#overlay").show();

}



/////////////////////////////////////////////////////////////////////
document.getElementById("order-history").addEventListener("click", async () => {
    try {
        const RestNameUrl = document.getElementById("restNaam").innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer").innerText.trim()}`;
        const historyPath = `${RestNameUrl}/tafel/${tafelId}/orders/history/`;

        // Fetch all order history from Firebase
        const orderHistorySnapshot = await firebase.database().ref(historyPath).once("value");
        const orderHistoryData = orderHistorySnapshot.val();

        if (orderHistoryData) {
            // Transform the order history data into an array for rendering
            const orderHistoryArray = Object.values(orderHistoryData).map(order => ({
                invoiceNumber: order.invoiceNumber,
                date: order.date,
                orderDetails: order.orderDetails
            }));

            // Render the order history table
            renderOrderHistory(orderHistoryArray);
        } else {
          showNotification("Geen bestellingen gevonden!", "error", 2500);
        }
    } catch (error) {
        console.error("Error fetching order history:", error);
  showNotification('Fout bij het ophalen van de bestelgeschiedenis.', 'error', 4000);
    }
});






///////////////////////////////////////////////////////////////////////////////


 // Function to calculate remaining time based on timer text, for wachttijd tussen elke ronde
  function calculateRemainingTime(timerText) {
    // Log the timer text for debugging
    console.log('Timer text:', timerText);

    // 替换原 calculateRemainingTime
    // 先识别 "MM:SS"
    let m = timerText.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      return (minutes * 60 + seconds) * 1000;
    }
    // 兼容旧格式 "Xm Ys"
    m = timerText.match(/(\d+)m\s+(\d+)s/);
    if (m) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      return (minutes * 60 + seconds) * 1000;
    }
    return NaN; // 解析失败
  }

//als de timmer nog loopt, dan gaan wij kijken of er eten wordt besteld

function checkTimerRunning() {
    return new Promise(function(resolve, reject) {
        var timerText = document.getElementById('timer').textContent.trim();
        var timerIsRunning = timerText !== "U kunt nu bestellen";
        var remainingTime = calculateRemainingTime(timerText); // Calculate remaining time
        resolve({ timerIsRunning: timerIsRunning, remainingTime: remainingTime, timerText: timerText});
    });
}

$('#order-verzend').click(async function () {
  const timerText = $('#timer').text().trim(); // Get the current timer text

  if (!areItemsAdded()) {
    showNotification('U heeft nog niets toegevoegd!', 'info', 2500);
    return;
  }

  // 只有当config.timeLimit为true时才启用timer限制
  if (window.AppConfig && AppConfig.timeLimit) {
    if (timerText !== 'U kunt nu bestellen') {
      // 检查订单内容
      const tafelNr = document.getElementById('tafelNummer').innerText.trim();
      const orderData = await fetchOrderGroupsFromFirebase(tafelNr);
      if (!orderData || orderData.length === 0) {
        showNotification('Er is geen bestelling gevonden.', 'error', 2500);    return;
      }
      const groepGeenItems = orderData.filter(item => item.group === "geen");
      const groepOtherItems = orderData.filter(item => item.group !== "geen");
      if (groepGeenItems.length > 0 && groepOtherItems.length > 0) {
        // 混合订单，弹窗让用户确认只发送饮料
        await showDrinksOnlyModal(async (confirmed) => {
          if (confirmed) {
            await sendOnlyDrinksOrder(groepGeenItems);
            await removeSentDrinksFromOrder(groepGeenItems);
          }
        });
// 动态生成荷兰语饮料下单提示弹窗
function showDrinksOnlyModal(callback) {
  // 移除已存在的弹窗
  const existing = document.getElementById('drinks-only-modal');
  if (existing) existing.remove();
  // 创建遮罩
  const overlay = document.createElement('div');
  overlay.id = 'drinks-only-modal';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.35)';
  overlay.style.zIndex = 99999; // 确保高于所有UI
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  // 创建内容框
  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 2px 16px #0003';
  box.style.padding = '32px 24px 20px 24px';
  box.style.maxWidth = '90vw';
  box.style.width = '340px';
  box.style.textAlign = 'center';
  // 消息
  const msg = document.createElement('div');
  msg.innerHTML = 'Op dit moment kunt u alleen drankjes bestellen.<br>Wilt u alleen de drankjes nu bestellen?';
  msg.style.fontSize = '1.18rem';
  msg.style.marginBottom = '28px';
  msg.style.color = '#222';
  msg.style.fontWeight = '500';
  msg.style.lineHeight = '1.5';
  msg.style.padding = '0 2px';
  // 按钮区
  const btnWrap = document.createElement('div');
  btnWrap.style.display = 'flex';
  btnWrap.style.justifyContent = 'space-between';
  btnWrap.style.gap = '18px';
  // 取消按钮
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuleren';
  cancelBtn.style.flex = '1';
  cancelBtn.style.padding = '10px 0';
  cancelBtn.style.background = '#f5f5f5';
  cancelBtn.style.border = '1px solid #ccc';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.fontSize = '1rem';
  cancelBtn.style.color = '#444';
  cancelBtn.style.transition = 'background 0.2s';
  cancelBtn.onmouseover = () => cancelBtn.style.background = '#e0e0e0';
  cancelBtn.onmouseout = () => cancelBtn.style.background = '#f5f5f5';
  cancelBtn.onclick = () => {
    overlay.remove();
    if (callback) callback(false);
  };
  // 确定按钮
  const okBtn = document.createElement('button');
  okBtn.textContent = 'Bevestigen';
  okBtn.style.flex = '1';
  okBtn.style.padding = '10px 0';
  okBtn.style.background = 'linear-gradient(90deg,#ffd700 60%,#ffb300 100%)';
  okBtn.style.border = 'none';
  okBtn.style.borderRadius = '6px';
  okBtn.style.fontSize = '1rem';
  okBtn.style.color = '#222';
  okBtn.style.fontWeight = 'bold';
  okBtn.style.boxShadow = '0 2px 8px #ffd70033';
  okBtn.style.transition = 'background 0.2s';
  okBtn.onmouseover = () => okBtn.style.background = 'linear-gradient(90deg,#ffe066 60%,#ffb300 100%)';
  okBtn.onmouseout = () => okBtn.style.background = 'linear-gradient(90deg,#ffd700 60%,#ffb300 100%)';
  okBtn.onclick = () => {
    overlay.remove();
    if (callback) callback(true);
  };
  // 组装
  btnWrap.appendChild(cancelBtn);
  btnWrap.appendChild(okBtn);
  box.appendChild(msg);
  box.appendChild(btnWrap);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // 动画效果
  box.animate([
    { transform: 'scale(0.95)', opacity: 0 },
    { transform: 'scale(1)', opacity: 1 }
  ], { duration: 180, fill: 'forwards' });
  // ESC关闭
  setTimeout(() => {
    overlay.focus();
    overlay.onkeydown = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        if (callback) callback(false);
      }
    };
  }, 100);
  // 禁止滚动
  document.body.style.overflow = 'hidden';
  overlay.addEventListener('remove', () => {
    document.body.style.overflow = '';
  });
}
        return;
      } else if (groepGeenItems.length > 0 && groepOtherItems.length === 0) {
        // 只有饮料，允许下单
        proceedToSendOrder();
        return;
      } else {
        // 没有饮料，只有菜品，阻止下单
        showNotification('U kunt pas bestellen als de wachttijd voorbij is.', 'error', 3000);    return;
      }
    }
  }

  // 其余条件判断
  const { conditionMet, message } = await isConditionMet();
  if (!conditionMet) {
    showMessage(message);
    return;
  }

  // ✅ If all conditions are met, proceed to send the order
  proceedToSendOrder();
// 只发送饮料订单
async function sendOnlyDrinksOrder(drinkItems) {
  // 只发送非 groep1/groep3/groep4 的项目（即饮料和允许的其他组）
  const tafelNr = document.getElementById('tafelNummer').innerText.trim();
  const restName = document.getElementById('restName').textContent;
  const tafelId = `Tafel-${tafelNr}`;
  const dbRef = firebase.database().ref(`${restName}/tafel/${tafelId}/orders/orderlist`);
  const snapshot = await dbRef.once('value');
  const data = snapshot.val() || {};
  // 只保留 group 不是 groep1/groep3/groep4 的项
  const allowedData = {};
  for (const [sku, item] of Object.entries(data)) {
    if (!["groep1", "groep3", "groep4"].includes(item.group)) {
      allowedData[sku] = item;
    }
  }
  await dbRef.set(allowedData);
  proceedToSendOrder();
}

// 从订单列表中移除已发送饮料
async function removeSentDrinksFromOrder(drinkItems) {
  // 这里假设每个 drinkItem 有 sku 字段
  const drinkSkus = drinkItems.map(item => item.sku);
  // 获取当前订单
  const tafelNr = document.getElementById('tafelNummer').innerText.trim();
  const restName = document.getElementById('restName').textContent;
  const tafelId = `Tafel-${tafelNr}`;
  const dbRef = firebase.database().ref(`${restName}/tafel/${tafelId}/orders/orderlist`);
  const snapshot = await dbRef.once('value');
  const data = snapshot.val();
  if (!data) return;
  // 移除饮料项
  for (const sku of drinkSkus) {
    if (data[sku]) {
      delete data[sku];
    }
  }
  await dbRef.set(Object.keys(data).length > 0 ? data : null);
  // 刷新UI
  if (window.updateQuantityLabelsFromFirebase) window.updateQuantityLabelsFromFirebase();
}
});

async function isConditionMet() {
    try {
        // ✅ **Check if the timer is running**
        const timerData = await checkTimerRunning();
        console.log("🕒 Timer status:", timerData);

        // ✅ **Fetch order data from Firebase**
        const tafelNr = document.getElementById('tafelNummer').innerText.trim();
        const orderData = await fetchOrderGroupsFromFirebase(tafelNr);

        if (!orderData || orderData.length === 0) {
            console.log("⚠️ No order data found.");
            return { conditionMet: false, message: "Er is geen bestelling gevonden." };
        }

        const totalItems = orderData.length;
        const groepGeenItems = orderData.filter(item => item.group === "geen").length;
        const groepOtherItems = orderData.filter(item => ["groep1", "groep3", "groep4"].includes(item.group)).length;

        console.log(`📊 Total items: ${totalItems}`);
        console.log(`✅ GroepGeen items: ${groepGeenItems}`);
        console.log(`❌ Groep1, 3, 4 items: ${groepOtherItems}`);

        // ✅ **Condition 1: If all items are from groepGeen, allow ordering immediately**
        if (groepGeenItems === totalItems && totalItems > 0) {
            console.log("✅ All items are from groepGeen. Allowing order.");
            return { conditionMet: true, message: "Uw bestelling wordt verwerkt." };
        }

           // ❌ **Condition 2: If there's a mix of groepGeen and other groups, do not allow**
           if (timerData.timerIsRunning && groepGeenItems > 0 && groepOtherItems > 0) {
              console.log("❌ Mix of groepGeen and other groups found. Order not allowed.");
              return { conditionMet: false, message: "U kunt nog geen bestelling plaatsen met een combinatie van dranken en andere gerechten wanneer de wachttijd nog niet verstreken is." };
          }
          if (!timerData.timerIsRunning && groepGeenItems > 0 && groepOtherItems > 0) {
              console.log("❌ Mix of groepGeen and other groups found. Order not allowed.");
              return { conditionMet: true, message: "" };
          }

        // ✅ **Condition 3: If only groep1, groep3, groep4 items are present, check timer**
        if (!timerData.timerIsRunning && groepOtherItems === totalItems && totalItems > 0) {
            console.log("✅ Timer finished, and only groep1, groep3, groep4 items. Allowing order.");
            return { conditionMet: true, message: "Uw bestelling wordt verwerkt." };
        }

        // ❌ **Condition 4: If groep1, groep3, groep4 items exist but timer is running, block order**
        if (timerData.timerIsRunning && groepOtherItems > 0) {
            console.log("❌ Order contains groep1, groep3, or groep4, but the timer is still running. Order not allowed.");
            return { conditionMet: false, message: "U kunt pas bestellen als de wachttijd verstreken is." };
        }

        console.log("⚠️ No conditions met, defaulting to false.");
        return { conditionMet: false, message: "Er is een fout opgetreden bij het controleren van uw bestelling." };

    } catch (error) {
        console.error('❌ Error checking conditions:', error);
        return { conditionMet: false, message: "Er is een fout opgetreden bij het controleren van uw bestelling." };
    }
}

// ✅ **Function to Fetch Order Groups from Firebase**
async function fetchOrderGroupsFromFirebase(tafelNr) {
    try {
        // ✅ Corrected Firebase Path
        const restName = document.getElementById("restName").textContent;  
        const tafelId = `Tafel-${tafelNr}`;
        const dbRef = firebase.database().ref(`${restName}/tafel/${tafelId}/orders/orderlist`);
        const snapshot = await dbRef.once('value');
        const data = snapshot.val();

        if (!data) {
            console.log("⚠️ No order data found.");
            return [];
        }

        // ✅ Convert Firebase object into an array of items
        const orderItems = Object.values(data).map(item => ({
            description: item.description || "Onbekend gerecht",
            group: item.group || "geen" // Default to 'geen' if missing
        }));

        console.log("🛠️ Corrected Firebase Order Data:", orderItems);
        return orderItems;

    } catch (error) {
        console.error("❌ Error fetching order data from Firebase:", error);
        return [];
    }
}






function formatTime(milliseconds) {
    // Convert milliseconds to seconds
    var totalSeconds = Math.floor(milliseconds / 1000);
    
    // Calculate minutes and seconds
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    
    // Format minutes and seconds with leading zeros if necessary
    var formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    var formattedSeconds = seconds < 10 ? "0" + seconds : seconds;
    console.log(formattedMinutes + ":" + formattedSeconds)
    // Return formatted time string
    return formattedMinutes + ":" + formattedSeconds;
}



function proceedToSendOrder(drinksOnly = false) {
    // 如果是只发饮料，临时只显示饮料在 paypad
    if (drinksOnly && window.__sendingDrinksOnly) {
      // 你可以在这里自定义只发饮料的下单逻辑
      // 例如只渲染饮料到 paypad，或直接调用 closeSale 只传饮料
      // 这里只是简单弹出支付界面，具体实现可根据后端接口调整
      // 例如 window.orderInstance.sendPartialOrder(window.__sendingDrinksOnly)
      // 暂时复用原有逻辑
    }
    $('#paypad').show(); // Show the paypad div
    $('#paypad-overlay').show();
    $('#close-sale').show();   
}

 function areItemsAdded() {
    return $('#receipt-details tr').length > 0; // Check if there are any rows in the order list
  }






$(document).ready(function() {
  // Toggle visibility of the categorie section and the overlay
  $('#toggle-footer-btn').click(function() {
    $('#categorie').toggle();   // Toggle the visibility of the categorie section
    $('#overlay-2').toggle();   // Toggle the visibility of the overlay
  });

  // Event listener for the overlay to close the categorie section and hide the overlay itself
  $('#overlay-2').click(function() {
    $('#categorie').hide();  // Hide the categorie section
    $(this).hide();          // Hide the overlay
  });

  // Toggle visibility of submenus for btn-lvl1
  $('.btn-lvl1').click(function() {
    // Hide all submenus
    $('.submenu').hide();
    // Show the submenu corresponding to the clicked button
    var targetSubMenu = $(this).attr('data-target');
    $('#' + targetSubMenu).toggle();
    // Hide overlay-2 when a category button is clicked
    $('#overlay-2').hide();
  });
  // 额外处理food/drink/service分类按钮点击时隐藏overlay-2
  $('#btn-food-main, #btn-drink-main, #btn-service-main').click(function() {
    $('#overlay-2').hide();
  });

  // 统一处理二级按钮点击：隐藏子菜单、类别容器与遮罩层（使用事件委托，支持动态添加）
  $(document).off('click.hideSubmenu', '.btn-lvl2').on('click.hideSubmenu', '.btn-lvl2', function(e){
    $('.submenu').hide();
    $('#categorie').hide();
    $('#overlay-2').hide();
  });

  // Toggle Cat4-Cat8 submenu when Cat3 button is clicked
  $('#cat3').click(function(event) {
    event.preventDefault(); // Prevent default action of the link
    $('#lvl3SubMenu').toggle(); // Toggle the display of the Cat4-Cat8 submenu
  });

  // Add click event listener to level 3 buttons (btn-lvl3)
  $('.btn-lvl3').click(function() {
    // Add any further functionality for level 3 buttons here if needed
    $('#lvl3SubMenu').hide();
     $('#categorie').hide();
     $('#overlay-2').toggle(); 
  });

    // ===== 动态填充 Service 一级分类（依赖 window.AppConfig.serviceCat） =====
  function initServiceCategoryFromConfig() {
      // 等待 AppConfig 就绪
      if (!window.AppConfig || !window.AppConfig.configReady) {
        setTimeout(initServiceCategoryFromConfig, 60);
        return;
      }
      const cfg = window.AppConfig.serviceCat || window.AppConfig.serviceCategory; // 兼容两种命名
      const $btn = $('#btn-service-main');
      const $wrap = $('#serviceSubMenu');
      if (!cfg) {
        // 无配置则隐藏按钮
        $btn.hide();
        return;
      }
      if (cfg.displayName) $btn.text(cfg.displayName);

      // 直接跳转模式：如果配置提供 directTarget (DOM id) 或 directLink (URL/hash)
  if (cfg.directTarget != null || cfg.directLink) {
        // 统一转成字符串（支持数字 16）
        const targetStr = cfg.directTarget != null ? String(cfg.directTarget).trim() : null;
        $wrap.remove(); // 不需要子菜单

        if (targetStr) {
          // 模仿 food / drinks 子分类使用的锚点方式，直接设置 href，浏览器自带滚动
          $btn.attr('href', targetStr.startsWith('#') ? targetStr : `#${targetStr}`);
        } else if (cfg.directLink) {
          $btn.attr('href', cfg.directLink);
        }

        // 不自定义 click，交给通用 document click 监听（带平滑滚动 + 高亮）
        $btn.off('click.serviceDirect').on('click.serviceDirect', function(){
          $('#overlay-2').hide();
          $('#categorie').hide();
          if (typeof window.executeServiceAction === 'function') {
            try { window.executeServiceAction('direct', cfg); } catch(err){ console.warn('executeServiceAction error', err); }
          }
        });
        $btn.show();
        return; // 结束：不生成 submenu
      }

      $wrap.empty();
      const items = Array.isArray(cfg.items) ? cfg.items : [];
      items.forEach(item => {
        const label = item.label || item.name || 'Item';
        const action = item.action || item.id || '';
        const $a = $('<a/>')
          .addClass('btn btn-outline-secondary btn-menu btn-lvl2')
          .attr('href', '#')
          .attr('data-service-item', action)
          .text(label);
        if (action) $a.attr('data-action', action);
        $a.on('click', function(e){
          e.preventDefault();
          // 复用现有二级按钮行为：关闭所有子菜单、隐藏类别、切换 overlay
          $('.submenu').hide();
          $('#categorie').hide();
          $('#overlay-2').toggle();
          // 可选：执行外部自定义行为
          if (action && typeof window.executeServiceAction === 'function') {
            try { window.executeServiceAction(action, item); } catch(err){ console.warn('executeServiceAction error', err); }
          }
        });
        $wrap.append($a);
      });
      if ($wrap.children().length === 0) {
        // 没有子项则隐藏按钮避免空展开
        $btn.hide();
      } else {
        $btn.show();
        // 子菜单模式下也按需求点击后收起整个 categorie 面板
        $btn.off('click.serviceHide').on('click.serviceHide', function(){
          $('#categorie').hide();
          $('#overlay-2').hide();
        });
      }
    }
  // 供外部（firebase-loader.js）重试调用
  window.initServiceCategoryFromConfig = initServiceCategoryFromConfig;
  initServiceCategoryFromConfig();

  // Service button functionality
  $('#service-btn').click(function() {
    $('#categorie').hide();
    $('#overlay-2').toggle(); 
  });
});

// === FAB wiring (mobile) ===
document.addEventListener('DOMContentLoaded', () => {
  const fabContainer = document.getElementById('fab-dial');
  const fabMain = document.getElementById('fab-main');
  const plusIcon = document.getElementById('fab-icon-plus');
  const closeIcon = document.getElementById('fab-icon-close');
  if (!fabContainer || !fabMain) return;
  // Enable no-trigger mode (hide the plus button; actions controlled elsewhere)
  fabContainer.classList.add('no-trigger');

  const toggleFab = () => {
    const expanded = fabContainer.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    fabContainer.setAttribute('aria-expanded', String(next));
    if (next) {
      plusIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
      fabMain.classList.add('open');
    } else {
      closeIcon.classList.add('hidden');
      plusIcon.classList.remove('hidden');
      fabMain.classList.remove('open');
    }
  };

  fabMain.addEventListener('click', (e) => { e.preventDefault(); toggleFab(); });
  // In no-trigger mode we don't need the click on fabMain; keep for safety, but hidden.

  fabContainer.querySelectorAll('.fab-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-action');
      // Delegate to existing buttons to reuse logic/UI side effects
      switch(action){
        case 'history': document.getElementById('order-history')?.click(); break;
        case 'last': document.getElementById('show-bevestig-btn')?.click(); break;
        case 'send': document.getElementById('order-verzend')?.click(); break;
        case 'clear': document.getElementById('order-clear')?.click(); break;
      }
      // auto close after action
      fabContainer.setAttribute('aria-expanded', 'false');
      closeIcon.classList.add('hidden');
      plusIcon.classList.remove('hidden');
      fabMain.classList.remove('open');
    });
  });

  // Close FAB if clicking outside
  document.addEventListener('click', (e) => {
    // Skip closing if click originated from toggle-order-list (we may be auto-opening) or skip flag active
    const skipUntil = window._fabSkipCloseUntil || 0;
    if (Date.now() < skipUntil) return;
    if (e.target && (e.target.id === 'toggle-order-list' || e.target.closest('#toggle-order-list'))) return;
    if (!fabContainer.contains(e.target) && fabContainer.getAttribute('aria-expanded')==='true') {
      fabContainer.setAttribute('aria-expanded','false');
      closeIcon.classList.add('hidden');
      plusIcon.classList.remove('hidden');
      fabMain.classList.remove('open');
    }
  });
});







document.getElementById("show-bevestig-btn").addEventListener("click", async function () {
    const RestNameUrl = document.getElementById("restNaam").innerText.trim();
    const tafelId = `Tafel-${document.getElementById("tafelNummer").innerText.trim()}`;
    const historyPath = `${RestNameUrl}/tafel/${tafelId}/orders/history/`;

    try {
        // Fetch the last order from Firebase
        const lastOrderSnapshot = await firebase.database().ref(historyPath).orderByKey().limitToLast(1).once("value");
        const lastOrderData = lastOrderSnapshot.val();

        if (lastOrderData) {
            const lastOrderKey = Object.keys(lastOrderData)[0]; // Get the key of the last order
            const orderDetails = lastOrderData[lastOrderKey].orderDetails;

            // Render the order details
            renderOrderDetails(lastOrderKey, orderDetails);
        } else {
            showNotification("U heeft nog niets besteld.", "error", 2500);
        }
    } catch (error) {
        console.error("Error fetching last order:", error);
  showNotification('Fout bij het ophalen van de laatste bestelling.', 'error', 4000);
    }
});


function renderOrderDetails(orderKey, orderDetails) {
    // Check if the container already exists and remove it
    const existingContainer = document.getElementById("order-history-container");
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create a new fixed-position div to hold the table
    const container = document.createElement("div");
    container.id = "order-history-container";
    container.style.position = "fixed";
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.width = "90%";
    container.style.maxWidth = "700px";
    container.style.maxHeight = "70%";
    container.style.overflowY = "auto";
    container.style.backgroundColor = "#fff";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "10px";
    container.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    container.style.padding = "20px";
    container.style.zIndex = "10005";

    // Add a close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Sluiten";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.border = "none";
    closeButton.style.backgroundColor = "#f44336";
    closeButton.style.color = "#fff";
    closeButton.style.padding = "5px 10px";
    closeButton.style.borderRadius = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "14px";
    closeButton.addEventListener("click", () => {
        container.remove();
    });
    container.appendChild(closeButton);

    // Format the time using the first order item's time
    const firstOrderTime = orderDetails[0][0]; // Assuming the first item has the relevant time
    const tijdFormatted = new Date(firstOrderTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

    // Add a message with the formatted time at the top-left
    const timeMessage = document.createElement("div");
    timeMessage.innerText = `Om ${tijdFormatted}`;
    timeMessage.style.fontSize = "16px";
    timeMessage.style.fontWeight = "bold";
    timeMessage.style.color = "#333";
    timeMessage.style.marginBottom = "15px"; // Add spacing between message and table
    container.appendChild(timeMessage);

    // Create the table
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontFamily = "Arial, sans-serif";
    table.style.fontSize = "14px";

    // Table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Aantal", "Naam", "Btw", "Prijs"].forEach(headerText => {
        const th = document.createElement("th");
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f2f2f2";
        th.style.color = "#333";
        th.style.textAlign = "left";
        th.innerText = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");
    let total = 0;

  orderDetails.forEach(orderItem => {
    const row = document.createElement("tr");

    // Extract data from the orderItem array
    const quantity = orderItem[2];
    const price = orderItem[3];
    const taxRate = orderItem[4];
    const sku = orderItem[1];
    const productName = orderItem[5] ? `${orderItem[5]} (#${sku})` : sku;

    // Calculate tax and item total
    const taxAmount = (price / (1 + taxRate)) * taxRate * quantity;
    const itemTotal = price * quantity;
    total += itemTotal;

    // Append data to the row
    [
      quantity,
      productName,
      `€${taxAmount.toFixed(2)}`,
      `€${itemTotal.toFixed(2)}`
    ].forEach(cellData => {
      const td = document.createElement("td");
      td.style.border = "1px solid #ddd";
      td.style.padding = "8px";
      td.style.color = "#000"; // Ensure font color is black
      td.style.textAlign = "left";
      td.innerText = cellData;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

    // Append the total row
    const totalRow = document.createElement("tr");
    totalRow.style.fontWeight = "bold";

    ["", "Totaal", "", `€${total.toFixed(2)}`].forEach((cellData, index) => {
        const td = document.createElement("td");
        td.style.border = "1px solid #ddd";
        td.style.padding = "8px";
        td.style.textAlign = index === 1 ? "right" : "left";
        td.style.color = "#000"; // Ensure font color is black
        td.innerText = cellData;
        totalRow.appendChild(td);
    });
    tbody.appendChild(totalRow);

    table.appendChild(tbody);

    // Append table to container
    container.appendChild(table);

    // Append container to the body
    document.body.appendChild(container);
}

function renderOrderHistory(orderHistory) {
    // Check if the container already exists and remove it
    const existingContainer = document.getElementById("order-history-container");
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create a new fixed-position div to hold the table
    const container = document.createElement("div");
    container.id = "order-history-container";
    container.style.position = "fixed";
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.width = "95%";
    container.style.maxWidth = "900px";
    container.style.maxHeight = "80%";
    container.style.overflowY = "auto";
    container.style.backgroundColor = "#fff";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "10px";
    container.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    container.style.padding = "20px";
    container.style.zIndex = "10005";

    // Add a close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Sluiten";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.border = "none";
    closeButton.style.backgroundColor = "#f44336";
    closeButton.style.color = "#fff";
    closeButton.style.padding = "5px 10px";
    closeButton.style.borderRadius = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "14px";
    closeButton.addEventListener("click", () => {
        container.remove();
    });
    container.appendChild(closeButton);

    // Calculate total amount across all orders
    let totalAmount = 0;

    // Create a title with total amount
    const title = document.createElement("div");
    title.innerText = `Totaal: €${totalAmount.toFixed(2)}`;
    title.style.fontSize = "18px";
    title.style.fontWeight = "bold";
    title.style.color = "#333";
    title.style.marginBottom = "15px"; // Add spacing between title and table
    container.appendChild(title);

    // Create the table
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontFamily = "Arial, sans-serif";
    table.style.fontSize = "14px";

    // Table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Bestel#", "Tijd", "Aantal", "Naam", "Prijs"].forEach(headerText => {
        const th = document.createElement("th");
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f2f2f2";
        th.style.color = "#333";
        th.style.textAlign = "left";
        th.innerText = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");

    let lastInvoiceNumber = null; // Track the last invoice number to determine when it changes
    let isEven = false; // Alternate the row color for each invoice number

    // Iterate through order history and populate the table
    orderHistory.forEach(order => {
        const invoiceNumber = order.invoiceNumber;
        const formattedTime = new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

        // Check if the invoice number has changed
        if (lastInvoiceNumber !== invoiceNumber) {
            isEven = !isEven; // Toggle the color scheme
            lastInvoiceNumber = invoiceNumber;
        }

        // Iterate through each item in the order
    order.orderDetails.forEach(item => {
      const quantity = item[2];
      const sku = item[1];
      const productName = item[5] ? `${item[5]} (#${sku})` : sku;
      const price = item[3] * quantity;

      totalAmount += price; // Add to the total amount

      // Append data to the row
      const row = document.createElement("tr");
      row.style.backgroundColor = isEven ? "#ffffff" : "#f9f9f9"; // Alternate background colors
      row.style.transition = "background-color 0.3s ease"; // Smooth transition

      [invoiceNumber, formattedTime, quantity, productName, `€${price.toFixed(2)}`].forEach(cellData => {
        const td = document.createElement("td");
        td.style.border = "1px solid #ddd";
        td.style.padding = "8px";
        td.style.color = "#000"; // Ensure font color is black
        td.style.textAlign = "left";
        td.innerText = cellData;
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });
    });

    table.appendChild(tbody);

    // Update the title with the calculated total amount
    title.innerText = `Totaal: €${totalAmount.toFixed(2)}`;

    // Append table to container
    container.appendChild(table);

    // Append container to the body
    document.body.appendChild(container);
}





function showMessage(message) {
  $('#message-box').html(message).fadeIn(); // Set message content and show message box
  setTimeout(function() {
    $('#message-box').fadeOut(); // Hide message box after 3 seconds
  }, 3000);
}

 
//取消下单的按钮
$('#verzend-close').click(function() {

$('#paypad').hide();
$('#paypad-overlay').hide();

}

);



$(document).on('click', '#close-sale', async function () {
  try {
    await waitForAppConfig();

    const rest = AppConfig.restName;
    const tafelId = AppConfig.tafelId;
    const savedPin = AppConfig.pincode;

    if (!rest || !tafelId || !savedPin) {
      console.error("❌ AppConfig incomplete: rest, tafelId or pincode missing.");
      return;
    }

    const db = firebase.database();
    const tableRef = db.ref(`${rest}/tafel/${tafelId}`);
    const snapshot = await tableRef.once('value');
    const tableData = snapshot.val();

    if (!tableData) {
  showNotification('Tafelgegevens niet gevonden.', 'error', 4000);
      return;
    }

    const tafelPin = tableData.Pincode || "";
    const status = tableData.Status || "gesloten";

    console.log(`🔐 PIN check — uit URL: ${savedPin}, uit Firebase: ${tafelPin}, status: ${status}`);

    if (String(savedPin) !== String(tafelPin)) {
      showNotification(`Het wachtwoord is onjuist, u kunt op dit moment geen bestelling plaatsen!`, "error", 2500);
      return;
    }

    if (status !== 'open') {
      showNotification(`Sorry, de tafel is nog niet geopend en bestellingen kunnen niet worden ontvangen!`, "error", 2500);
      return;
    }

    const timerText = $('#timer').text().trim();
    const invoiceNumText = $('#lastInvoiceNum').text().trim();
    let InvoiceNumber = parseInt(invoiceNumText, 10);
    if (isNaN(InvoiceNumber)) InvoiceNumber = 0;

    // ✅ 继续订单提交流程
    order.closeSale(timerText, InvoiceNumber, AppConfig.tafelRaw);

    $('#paypad').hide();
    $('#paypad-overlay').hide();

  } catch (error) {
    console.error('🚨 Fout bij PIN-verificatie:', error);
  showNotification('Er is een fout opgetreden bij het controleren van de pincode of tafelstatus.', 'error', 4000);
  }
});






  $(function() {
    $("#dialog").dialog({
      modal: true,
      width: 390,
      height: 260,
      autoOpen: false,
      
      show: {
        effect: "blind",
        duration: 800
      },
      hide: {
        effect: "slide",
        duration: 1200
      }
    });

    $("#close-sale").on("click", function() {
      $("#dialog").dialog("open");
    });

// Function to update the button styling based on the order list state
function updateButtonStyle() {
    const button = document.getElementById('toggle-order-list');
    cartButton.classList.add('animate-button');
    setTimeout(() => {
        button.classList.remove('animate-button'); // Remove the class after the animation ends
    }, 200); // Adjust the duration (in milliseconds) to match the animation duration
}


///////////////////////////////////////////////////

// Helper: open FAB actions panel (mobile)
function openFabActions(){
  const fab = document.getElementById('fab-dial');
  if(!fab) return; // desktop or FAB not present
  fab.setAttribute('aria-expanded','true');
  const plus = document.getElementById('fab-icon-plus');
  const close = document.getElementById('fab-icon-close');
  plus && plus.classList.add('hidden');
  close && close.classList.remove('hidden');
  const fabMain = document.getElementById('fab-main');
  fabMain && fabMain.classList.add('open');
  positionFabActions();
}
function closeFabActions(){
  const fab = document.getElementById('fab-dial');
  if(!fab) return;
  fab.setAttribute('aria-expanded','false');
  const plus = document.getElementById('fab-icon-plus');
  const close = document.getElementById('fab-icon-close');
  close && close.classList.add('hidden');
  plus && plus.classList.remove('hidden');
  const fabMain = document.getElementById('fab-main');
  fabMain && fabMain.classList.remove('open');
}

$('#toggle-order-list').click(function() {
  const wasHidden = $('#mainBody').is(':hidden');
  $('#mainBody').toggle();
  if (wasHidden && $('#mainBody').is(':visible')) {
    scrollToElement('order-verzend');
  // Set a short skip-close window to prevent immediate outside click collapse
    window._fabSkipCloseUntil = Date.now() + 400;
    // Directly mark expanded (no trigger mode)
    const fab = document.getElementById('fab-dial');
    if(fab){
      fab.setAttribute('aria-expanded','true');
    positionFabActions();
    }
  } else if(!wasHidden && $('#mainBody').is(':hidden')) {
    closeFabActions(); // auto collapse when closing
  }
});


$('#history-close').click(function() {
$('#historyContainer').hide();
});


/////////////////////////////////////////////////////

// === Dynamic positioning of fab-actions just below receipt, clamped to viewport ===
function positionFabActions(){
  const fab = document.getElementById('fab-dial');
  const actions = document.getElementById('fab-actions');
  const mainBody = document.getElementById('mainBody');
  if(!fab || !actions || !mainBody || mainBody.style.display==='none') return;
  const receipt = document.querySelector('#mainBody .receipt');
  const gap = 12; // space below receipt
  const minBottom = 10; // min distance from bottom edge
  const panelH = actions.offsetHeight || 120;
  fab.style.top=''; fab.style.bottom='';
  if(receipt){
    const rect = receipt.getBoundingClientRect();
    const desiredTop = rect.bottom + gap;
    if(desiredTop + panelH + minBottom <= window.innerHeight){
      fab.style.top = desiredTop + 'px';
      return;
    }
  }
  fab.style.bottom = minBottom + 'px';
}

window.addEventListener('resize', positionFabActions);
window.addEventListener('orientationchange', positionFabActions);
// Mutation observer to reposition when order lines change
const receiptDetailsEl = document.getElementById('receipt-details');
if(receiptDetailsEl && window.MutationObserver){
  const obs = new MutationObserver(()=> positionFabActions());
  obs.observe(receiptDetailsEl,{childList:true});
}


// function attachDropdownEventListener() {
//     // Add event listener for dropdown menu
//     $(document).on("change", "#filter-dropdown", function() {
//         const filterValue = this.value;
//         // document.getElementById("overlay-history").style.display = "block";
//         fetchFilteredData(filterValue);

//     });
// }





///////////////////////////////////////////////////////////





// Function to fetch order history data



function scrollToElement(id) {
    var element = document.getElementById(id);
    element.scrollIntoView({ block: 'start', behavior: 'smooth' });
}




  });
//////////////////////////////////////////////////////////////////////////////////////


// function fetchOrderHistoryData(tafelNr) {
//     console.log("Fetching order history data...");
//     // Call Google Apps Script function to fetch order history data
//     google.script.run.withSuccessHandler(function(data) {
//         // Populate data into orderHistories div
//         document.getElementById("orderHistories").innerHTML = data;
        
//         // Set orderHistories div to be visible
//         document.getElementById("orderHistories").style.display = "block";
        
//         // Add event listener for dropdown menu
//         document.getElementById("filter-dropdown").addEventListener("change", function() {
//             const filterValue = this.value;
//             $('#ronde').text(filterValue);
//             fetchFilteredData(filterValue);
//         });
//     }).getOrderHistory(tafelNr);
// }


// Get a reference to the button
const cartButton = document.getElementById('toggle-order-list');


// Function to update the button styling based on the order list state
function updateButtonStyle() {
    const button = document.getElementById('toggle-order-list');
    cartButton.classList.add('animate-button');
    setTimeout(() => {
        button.classList.remove('animate-button'); // Remove the class after the animation ends
    }, 200); // Adjust the duration (in milliseconds) to match the animation duration
}

//////////////mainBody div wipe up close effects
let startY;
let touchMoved = false;

document.addEventListener('touchstart', (e) => {
  startY = e.touches[0].clientY;
  touchMoved = false;
});

document.addEventListener('touchmove', (e) => {
  let currentY = e.touches[0].clientY;
  let diffY = currentY - startY;
  if (diffY < -250) {
    touchMoved = true;
    document.getElementById('mainBody').style.display = 'none';
  }
});

document.addEventListener('touchend', (e) => {
  if (!touchMoved) {
    let currentY = e.changedTouches[0].clientY;
    let diffY = currentY - startY;
    if (diffY > 400) { // Adjust this threshold value as needed
      document.getElementById('mainBody').style.display = 'block';
    }
  }
});
// Hide #mainBody when swiping up
document.addEventListener('touchmove', (e) => {
  let currentY = e.touches[0].clientY;
  let diffY = currentY - startY;
  if (diffY < -250) {
    touchMoved = true;
    document.getElementById('mainBody').style.display = 'none';
  if (typeof closeFabActions === 'function') closeFabActions(); // Collapse FAB when hiding mainBody
  }
});

// Hide #mainBody when clicking outside of it, except the #toggle-order-list button
document.addEventListener('click', (e) => {
  const mainBody = document.getElementById('mainBody');
  const toggleOrderListButton = document.getElementById('toggle-order-list');

  // Check if the clicked element or any of its ancestors has the class 'quantity-adjust'
  const isQuantityAdjustButton = e.target.closest('.quantity-adjust, .modify-quantity, .delete, .increase-quantity, .decrease-quantity');

  if (
    mainBody && 
    !mainBody.contains(e.target) && 
    (!toggleOrderListButton || !toggleOrderListButton.contains(e.target)) &&
    !isQuantityAdjustButton // Exclude clicks on quantity-adjust buttons
  ) {
    mainBody.style.display = 'none';
  if (typeof closeFabActions === 'function') closeFabActions(); // Collapse FAB when hiding mainBody
  }
});

