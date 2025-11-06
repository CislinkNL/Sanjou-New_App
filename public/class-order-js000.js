/* global firebase, Ui, showNotification, updateQuantityLabels, applyCustomTranslations, askQuestion, Utilities, google, sendDirect, generateNewOrderNumber, startCountdown */

class Order {
    constructor() {
        this._menu = [];
        this._order = [];
        this._payment = {}; // 支付对象
        this._orderInitialized = false;   // 首次加载避免批量提示
        this._menuBootstrapped = false;   // 防止首次监听重复加载
        this._initialBadgesSynced = false; // 首屏角标是否已成功同步
        this.viewMode = 'my';

        // 暴露全局引用 & 兼容旧函数名
        if (!window.__orderInstance) {
            window.__orderInstance = this;
        }
        if (!window.updateQuantityLabelsFromFirebase) {
            window.updateQuantityLabelsFromFirebase = () => {
                try {
                    if (window.__orderInstance) {
                        updateQuantityLabels(window.__orderInstance._order);
                    }
                } catch (e) {
                    console.warn('updateQuantityLabelsFromFirebase 调用失败', e);
                }
            };
        }
    }

    /* ---------------- Getters / Setters ---------------- */
    get menu() { return this._menu; }
    get order() { return this._order; }
    get payment() { return this._payment; }
    set payment(payment) { this._payment = payment; }

    setOrder(newOrderArray) {
        if (Array.isArray(newOrderArray)) {
            this._order = newOrderArray;
        } else {
            console.error("Invalid order data. Expected an array.");
        }
    }


    setViewMode(mode) {
        const ALLOWED = new Set(['my', 'byDevice', 'summary']);
        this.viewMode = ALLOWED.has(mode) ? mode : 'my';
        Ui.receiptDetails(this); // 立即刷新视图
    }

    set menu(menuArray) {
        this._menu = [];
        (menuArray || []).forEach(menuItem => {
            const hasOptions = !!(menuItem?.hasOptions || (menuItem?.options && Object.keys(menuItem.options).length > 0));
            const optionsData = menuItem?.options || {};
            const priceDisplay = (typeof menuItem?.price === 'number' && menuItem.price > 0) ? menuItem.price : '';

            const currItem = {
                sku: menuItem.sku,
                description: menuItem.description,
                displayName: `${menuItem.sku} - ${menuItem.description}`,
                price: priceDisplay,
                taxRate: menuItem.taxRate,
                image: menuItem.image,
                id: menuItem.id || menuItem.sku,
                group: menuItem.group,
                allergy: menuItem.allergy,
                status: menuItem.status,
                hasOptions,
                options: optionsData
            };
            this._menu.push(currItem);

            // 调试
            console.log(`Item Loaded: ${currItem.description}`);
            console.log("Has Options?:", currItem.hasOptions);
            console.log("Options Data:", currItem.options);
        });

        console.log("Final Menu Data:", this._menu);
    }

    /* ---------------- Config / Auth ---------------- */
    async waitForAppConfig() {
        while (!window.AppConfig?.configReady) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    /* ---------------- Pincode 校验 ---------------- */
    async ensurePincodeValid() {
        const restName = window.AppConfig?.restName;
        const rawTafelId = window.AppConfig?.tafelId;
        const tafelId = this._getNormalizedTafelId(rawTafelId);
        const inputPin = String(window.AppConfig?.pincode || '');

        // 基础检查
        if (!restName || !tafelId) {
            console.warn('ensurePincodeValid: restName/tafelId 缺失');
            return false;
        }
        if (!/^\d{3,4}$/.test(inputPin)) {
            console.warn('ensurePincodeValid: 还未输入有效的 PIN');
            return false;
        }

        // 读实时库里的正确 PIN
        const snap = await firebase.database()
            .ref(`${restName}/tafel/${tafelId}/Pincode`)
            .once('value');
        const realPin = String(snap.val() || '');

        if (inputPin !== realPin) {
            console.warn('ensurePincodeValid: PIN 不匹配，阻止菜单加载');
            if (typeof showNotification === 'function') {
                showNotification('Pincode onjuist, menukaart wordt niet geladen.', 'error', 4000);
            }
            return false;
        }
        return true;
    }



    async authenticate() {
        await this.waitForAppConfig();

        const PythonAuthUrl = window.AppConfig?.pythonAuth;
        if (!PythonAuthUrl) {
            console.error("Missing 'pythonAuth' URL in AppConfig.");
            return;
        }

        try {
            const response = await fetch(PythonAuthUrl, { method: 'GET' });
            if (!response.ok) throw new Error(`Failed to authenticate with the backend: ${response.statusText}`);

            const data = await response.json();
            if (data.token) {
                await firebase.auth().signInWithCustomToken(data.token);
                console.log("✅ Authenticated with custom token");
            } else {
                throw new Error("No token received from backend");
            }
        } catch (error) {
            console.error("Authentication error:", error?.message || error);
        }
    }

    /* ---------------- Key 工具 ---------------- */
    _getNormalizedTafelId(raw) {
        if (!raw) return '';
        return raw.startsWith('Tafel-') ? raw : `Tafel-${raw}`;
    }

    safeKey(raw) {
        return String(raw ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[.#$\[\]\/\u0000-\u001F\u007F]/g, '-')
            .replace(/-+/g, '-');
    }

    optionsKeyFrom(options) {
        if (!options || typeof options !== 'object') return 'default';
        const pairs = Object.entries(options)
            .filter(([k, v]) => v !== undefined && v !== null && v !== '')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${this.safeKey(k)}:${this.safeKey(typeof v === 'object' ? JSON.stringify(v) : v)}`);
        return pairs.length ? pairs.join('|') : 'default';
    }

    _buildLineKey(sku, optionsObj) {
        const base = this.safeKey(sku);
        const opts = this.optionsKeyFrom(optionsObj || {});
        if (opts === 'default') return base;
        const rawKey = `${base}__${opts}`;
        return rawKey.replace(/[^A-Za-z0-9_:\-|]/g, '_').substring(0, 180);
    }

    /* ---------------- 数据加载 ---------------- */
    async loadMenuFromFirebase() {
        // 🔒 双保险：必须先通过 PIN  
        const restName = window.AppConfig?.restName;
        const rawTafelId = window.AppConfig?.tafelId;
        const tafelId = this._getNormalizedTafelId(rawTafelId);
        const inputPin = String(window.AppConfig?.pincode || '');
        if (!restName || !tafelId || !/^\d{3,4}$/.test(inputPin)) {
            console.warn('[loadMenuFromFirebase] PIN 未就绪，取消加载');
            return;
        }
        // 和后端 PIN 比一下，防止 URL 携带的是错 PIN  
        try {
            const snap = await firebase.database().ref(`${restName}/tafel/${tafelId}/Pincode`).once('value');
            if (inputPin !== String(snap.val() || '')) {
                console.warn('[loadMenuFromFirebase] PIN 不匹配，取消加载');
                return;
            }
        } catch (e) {
            console.warn('[loadMenuFromFirebase] 校验 PIN 失败，取消加载', e);
            return;
        }

        if (!restName || !tafelId) {
            console.error("Missing restName or tafelId in AppConfig.");
            return;
        }

        const MENU_DATABASE_PATH = `${restName}/menukaart`;
        const EXCEPTIONS_PATH = `${restName}/menukaart/exceptions`;
        const ORDER_DATABASE_PATH = `${restName}/tafel/${tafelId}/orders/orderlist`;
        const ORDER_NUMBER_PATH = `${restName}/tafel/${tafelId}/orders/orderNumbers`;
        const SERVER_ACCESS_PATH = `${restName}/server_access`;
        const DINNER_ONLY_PATH = `${restName}/dinnerOnlyDishes`;
        const TABLE_PATH = `${restName}/tafel/${tafelId}`;

        const db = firebase.database();
        const menuRef = db.ref(MENU_DATABASE_PATH);
        const exceptionsRef = db.ref(EXCEPTIONS_PATH);
        const orderRef = db.ref(ORDER_DATABASE_PATH);
        const orderNumRef = db.ref(ORDER_NUMBER_PATH);
        const serverAccessRef = db.ref(SERVER_ACCESS_PATH);
        const dinnerOnlyRef = db.ref(DINNER_ONLY_PATH);
        const tableRef = db.ref(TABLE_PATH);

        try {
            // 校验 server_access
            const serverAccessSnapshot = await serverAccessRef.once("value");
            const serverAccess = serverAccessSnapshot.val();
            if (serverAccess !== "Time9changeit") {
                console.error("Access denied: server_access is invalid.");
                showNotification('Access to the menu is restricted. Please contact support.', 'error', 6000);
                return;
            }

            // 读取当前桌台信息
            const tableSnapshot = await tableRef.once("value");
            const tableData = tableSnapshot.val();
            const menuType = tableData?.menuType || "dinner";

            // 获取 dinnerOnly SKU 列表
            const dinnerSkusSnapshot = await dinnerOnlyRef.once("value");
            const dinnerOnlySkus = dinnerSkusSnapshot.exists() ? Object.keys(dinnerSkusSnapshot.val()) : [];

            // exceptions
            const exceptionsSnapshot = await exceptionsRef.once("value");
            const exceptionsData = exceptionsSnapshot.val();
            const exceptionSkus = exceptionsData ? Object.keys(exceptionsData) : [];
            console.log("Fetched exceptions:", exceptionSkus);

            // menu
            const menuSnapshot = await menuRef.once("value");
            const menuData = menuSnapshot.val();

            if (menuData) {
                const itemsArray = Object.keys(menuData)
                    .map((sku) => {
                        const menuItem = menuData[sku] || {};
                        const optionsData = menuItem.options || {};
                        const hasOptions = menuItem.hasOptions !== undefined
                            ? menuItem.hasOptions
                            : Object.keys(optionsData).length > 0;
                        return {
                            ...menuItem,
                            sku,
                            group: menuItem.group || "unknown",
                            hasOptions,
                            options: optionsData
                        };
                    })
                    .filter((item) => {
                        const isAvailable = item.status === "beschikbaar";
                        const isNotException = !exceptionSkus.includes(item.sku);
                        const isAllowedByMenuType = menuType === "dinner" || !dinnerOnlySkus.includes(item.sku);
                        return isAvailable && isNotException && isAllowedByMenuType;
                    })
                    .sort((a, b) => (a.sortingNrm || 0) - (b.sortingNrm || 0));

                this.menu = itemsArray;
                console.log("✅ 加载的菜单数据:", itemsArray);
            } else {
                console.warn("No menu data available in Firebase for this restaurant.");
            }

            // 渲染菜单
            Ui.menu(this);

            // 订单
            const orderSnapshot = await orderRef.once("value");
            const orderData = orderSnapshot.val();

            if (orderData) {
                console.log('[loadMenuFromFirebase] orderlist snapshot keys:', Object.keys(orderData).length);
                const orderArray = Array.isArray(orderData)
                    ? orderData
                    : Object.keys(orderData).map((key) => ({
                        description: orderData[key].description || "No description",
                        quantity: orderData[key].quantity || 0,
                        price: parseFloat(orderData[key].price) || 0,
                        group: orderData[key].group || "unknown",
                        allergy: orderData[key].allergy || "",
                        taxRate: parseFloat(orderData[key].taxRate) || 0,
                        sku: key,
                        lineKey: key
                    }));

                this._order = orderArray;
                Ui.receiptDetails(this);
                Ui.summary(this);
                if (window.BadgeManager) {
                    window.BadgeManager.scheduleInitial(this._order, () => { this._initialBadgesSynced = true; });
                } else {
                    updateQuantityLabels(this._order);
                    this._initialBadgesSynced = true;
                }
            } else {
                console.log("No orders found for the current table.");
                this._order = [];
                Ui.receiptDetails(this);
                Ui.summary(this);
                if (window.BadgeManager) {
                    window.BadgeManager.scheduleInitial(this._order, () => { this._initialBadgesSynced = true; });
                } else {
                    updateQuantityLabels(this._order);
                    this._initialBadgesSynced = true;
                }
            }
        } catch (error) {
            console.error("Error fetching menu or order data from Firebase:", error);
        }
    }


    /* ---------------- 实时监听 ---------------- */
    async setupRealtimeListeners() {
        const RestNameUrl = window.AppConfig?.restName;
        const rawTafelId = window.AppConfig?.tafelId;
        const tafelId = this._getNormalizedTafelId(rawTafelId);
        if (!RestNameUrl || !tafelId) {
            console.error("Missing restName or tafelId in AppConfig.");
            return;
        }

        const MENU_DATABASE_PATH = `${RestNameUrl}/menukaart`;
        const databasePath = `/${RestNameUrl}/tafel/${tafelId}`;
        console.log(`Setting up real-time listener for path: ${databasePath}`);

        const tafelIdRef = firebase.database().ref(databasePath);
        try {
            await this.authenticate();
        } catch (error) {
            console.error("Failed to authenticate. Cannot load menu:", error);
            return;
        }

        const db = firebase.database();
        let debounceTimeout;
        const menuRef = db.ref(MENU_DATABASE_PATH);

        // 启动时先加载一次
        try {
            // 等到有合法 PIN 才允许首轮加载
            while (!/^\d{3,4}$/.test(String(window.AppConfig?.pincode || ''
            ))) {
                await new Promise(r => setTimeout(r, 600));
            }
            await this.loadMenuFromFirebase();
            this._menuBootstrapped = true;
        } catch (e) {
            console.error('Initial loadMenuFromFirebase failed:', e);
        }

        // menukaart 监听
        menuRef.on('value', async () => {
            if (this._menuBootstrapped) {
                console.log('[menuRef] Skip initial value event (already bootstrapped)');
                this._menuBootstrapped = false;
                return;
            }
            console.log('[menuRef] Firebase menu value change detected; scheduling reload');
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(async () => {
                console.log('[menuRef] Debounced reload executing');
                this.menu = [];
                const menuContainer = document.getElementById('menu');
                if (menuContainer) {
                    menuContainer.innerHTML = '';
                    console.log('[menuRef] Menu container cleared');
                }
                await this.loadMenuFromFirebase();
                console.log('[menuRef] Menu reloaded');
                showNotification('Menukaart is bijgewerkt.', 'info', 3000);
            }, 200);
        });

        // tafel 子键变化
        tafelIdRef.on('child_changed', async (snapshot) => {
            const key = snapshot.key;
            const data = snapshot.val();
            console.log(`Key changed: ${key}, New Value: ${data}`);

            if (key === 'Status' && data) {
                const statusInput = document.querySelector('input[name="status"]');
                const tafelStatusElement = document.getElementById("tafelStatus");
                if (statusInput) statusInput.value = data;
                if (tafelStatusElement) tafelStatusElement.innerText = `${tafelId} is ${data}`;
                if (data === "afgesloten") showNotification(`Tafel is afgesloten`, "error", 5000);
                if (data === 'open') showNotification(`Tafel is nu open`, "success", 5000);
            }

            if (key === 'Pincode' && data) {
                const pincodeInput = document.querySelector('input[name="pincode"]');
                if (pincodeInput) {
                    pincodeInput.value = data;
                    showNotification(`Uw pincode is - ${data}`, "info", 5000);
                } else {
                    showNotification(`Tafel pincode is gewijzigd`, "info", 15000);
                }
            }
            if (key === 'menuType') {
                console.log(`[Realtime] menuType changed to ${data}, reloading menu...`);

                this.menu = [];
                const menuContainer = document.getElementById('menu');
                if (menuContainer) {
                    menuContainer.innerHTML = '';
                    console.log('[Realtime] Menu container cleared');
                }

                await this.loadMenuFromFirebase();
                showNotification(`Menu type gewijzigd naar "${data}", menu opnieuw geladen.`, "info", 4000);
                return;
            }

            if (key === 'Persons' && data) {
                const personenInput = document.getElementById('aantal_pers');
                if (personenInput) {
                    personenInput.innerText = data;
                    showNotification(`Het aantal personen is aangepast naar ${data} personen.`, "info", 5000);
                } else {
                    showNotification(`Het aantal personen is aangepast naar ${data} personen.`, "info", 15000);
                }
            }
        });

        // orderlist 监听
        const ORDER_DATABASE_PATH = `${RestNameUrl}/tafel/${tafelId}/orders/orderlist`;
        const orderRef = db.ref(ORDER_DATABASE_PATH);

        orderRef.on('value', async (snapshot) => {
            // 调试：打印原始 orderlist 数据
            console.log("🔥 监听到的 orderlist 数据:", snapshot.val());

            /* ✅ 修复1：安全构造 currentOrder，拷贝并过滤空项 */
            const currentOrder = Array.isArray(this._order)
                ? this._order.filter(x => x && typeof x === 'object')
                : [];

            if (snapshot.exists()) {
                const data = snapshot.val() || {};

                const rows = Object.entries(data).map(([lineKey, v]) => ({
                    lineKey,
                    sku: (v && v.sku) || lineKey,
                    description: (v && v.description) || 'No description',
                    quantity: Number(v && v.quantity) || 0,
                    price: Number(v && v.price) || 0,
                    group: (v && v.group) || 'unknown',
                    allergy: (v && v.allergy) || '',
                    options: (v && v.options) || {},
                    deviceId: (v && v.deviceId) ? String(v.deviceId).trim() : 'unknown',
                    byDevice: (v && typeof v.byDevice === 'object') ? v.byDevice : {},
                    taxRate: Number(v && v.taxRate) || 0,
                    subtotal: Number(v && v.subtotal) || (Number(v && v.price) || 0) * (Number(v && v.quantity) || 0),
                    taxAmount: Number(v && v.taxAmount) || 0
                }));

                /* ✅ 修复2：删除检测时使用兜底键 (lineKey || sku)，并过滤空洞 */
                currentOrder.forEach(item => {
                    const keyA = item.lineKey || item.sku;
                    if (!keyA) return;
                    const stillThere = rows.find(n => (n.lineKey || n.sku) === keyA);
                    if (!stillThere) {
                        showNotification(`${item.description || item.sku} is verwijderd uit de lijst`, 'removeFoodInfo', 2000);
                    }
                });

                const changed = JSON.stringify(this._order) !== JSON.stringify(rows);
                if (changed) {
                    const prevMap = {};
                    currentOrder.forEach(l => { const k = l.lineKey || l.sku; if (k) prevMap[k] = l; });

                    this._order = rows;
                    Ui.receiptDetails(this);

                    setTimeout(() => {
                        if (this._initialBadgesSynced) {
                            if (window.BadgeManager) window.BadgeManager.update(this._order);
                            else updateQuantityLabels(this._order);
                        } else {
                            if (window.BadgeManager) window.BadgeManager.scheduleInitial(this._order, () => { this._initialBadgesSynced = true; });
                            else { updateQuantityLabels(this._order); this._initialBadgesSynced = true; }
                        }
                    }, 50);

                    if (this._orderInitialized) {
                        rows.forEach(line => {
                            const prev = prevMap[line.lineKey || line.sku];
                            if (!prev) {
                                showNotification(`${line.description} x ${line.quantity} toegevoegd`, 'addFoodInfo', 2000);
                            } else if (line.quantity > prev.quantity) {
                                const delta = line.quantity - prev.quantity;
                                if (delta > 0) {
                                    showNotification(`${line.description} +${delta} (totaal ${line.quantity})`, 'addFoodInfo', 2000);
                                }
                            }
                        });
                    } else {
                        this._orderInitialized = true;
                    }
                }
            } else {
                if (this._order.length) {
                    this._order = [];
                    Ui.receiptDetails(this);
                    setTimeout(() => {
                        if (window.BadgeManager) window.BadgeManager.update(this._order);
                        else updateQuantityLabels(this._order);
                    }, 50);
                }
            }

        });

        // orderNumbers 监听
        const ORDER_Number_PATH = `${RestNameUrl}/tafel/${tafelId}/orders/orderNumbers`;
        const orderNumberRef = db.ref(ORDER_Number_PATH);
        orderNumberRef.on('value', snapshot => {
            const newOrderNumber = snapshot.val();
            if (newOrderNumber !== null) {
                document.getElementById('lastInvoiceNum').innerText = newOrderNumber;
                document.getElementById('invoice-number').textContent = `Bestel#  ${newOrderNumber}`;
                console.log(`Order number updated to ${newOrderNumber}`);
            }
        });

        // refresh 监听
        const refreshPath = `${RestNameUrl}/refresh/`;
        const refreshRef = db.ref(refreshPath);
        const refreshUrl = document.getElementById("refreshURL").innerText.trim();
        refreshRef.on('value', (snapshot) => {
            const refreshValue = snapshot.val();
            if (refreshValue === 1) {
                refreshRef.set(0).then(() => {
                    window.location.href = refreshUrl;
                }).catch((error) => {
                    console.error("Error resetting refresh value:", error);
                });
            }
        });

        console.log("Real-time listener for order list set up successfully.");
    }

    /* ---------------- 下单（事务） ---------------- */
    addOrderLine(quantity, description, group, allergy, sku, price, selectedOptions) {
        const menuItem = this.menu.find(item => String(item.sku) === String(sku));
        if (!menuItem) {
            console.error(`Menu item not found for SKU: ${sku}`);
            return;
        }
        const taxRate = parseFloat(menuItem.taxRate) || 0;
        const unitPrice = parseFloat(price) || parseFloat(menuItem.price) || 0;
        const normalizedOptions = selectedOptions || {};

        const safeKey = this._buildLineKey(sku, normalizedOptions);

        const restName = document.getElementById("restNaam")?.innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer")?.innerText.trim()}`;
        if (!restName || !tafelId) {
            console.error('Missing restName or tafelId for transaction.');
            return;
        }
        const lineRef = firebase.database().ref(`/${restName}/tafel/${tafelId}/orders/orderlist/${safeKey}`);

        const delta = quantity;
        if (delta === 0) return;

        // 预检查限制
        const parsePosInt = (s) => {
            const n = parseInt(s, 10);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };
        const etenEl = document.getElementById('limiet_eten');
        const dessertEl = document.getElementById('limiet_dessert');
        const personsEl = document.getElementById('aantal_pers');
        const persons = parsePosInt(personsEl?.innerText) ?? 1;
        const etenPer = parsePosInt(etenEl?.innerText);
        const desPer = parsePosInt(dessertEl?.innerText);
        const etenLimitTotal = etenPer == null ? Infinity : etenPer * persons;
        const dessertLimitTotal = desPer == null ? Infinity : desPer * persons;

        const currentHoofd = this._order.reduce((acc, l) => acc + (l.group === 'groep1' ? l.quantity : 0) + (l.group === 'groep4' ? l.quantity * 2 : 0), 0);
        const currentDessert = this._order.reduce((acc, l) => acc + (l.group === 'groep3' ? l.quantity : 0), 0);
        const projectedHoofd = currentHoofd + (group === 'groep1' ? quantity : 0) + (group === 'groep4' ? quantity * 2 : 0);
        const projectedDessert = currentDessert + (group === 'groep3' ? quantity : 0);
        if ((group === 'groep1' || group === 'groep4') && projectedHoofd > etenLimitTotal) {
            showNotification('Hoofdgerechten limiet bereikt', 'error', 4000); return;
        }
        if (group === 'groep3' && projectedDessert > dessertLimitTotal) {
            showNotification('Desserts limiet bereikt', 'error', 4000); return;
        }

        // deviceId
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'dev-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }

        lineRef.transaction(curr => {
            const next = curr || {};
            const prevQty = Number(next.quantity) || 0;
            next.quantity = prevQty + delta;

            next.sku = menuItem.sku;
            next.description = description;
            next.price = unitPrice;
            next.group = group;
            next.allergy = allergy;
            next.taxRate = taxRate;
            next.options = normalizedOptions;

            next.byDevice = next.byDevice || {};
            const prevMine = Number(next.byDevice[deviceId]) || 0;
            next.byDevice[deviceId] = prevMine + delta;

            next.deviceId = deviceId;

            next.subtotal = (next.price || 0) * (next.quantity || 0);
            next.taxAmount = next.subtotal * ((next.taxRate || 0) / 100);

            if (next.quantity <= 0) return null;
            return next;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error('❌ Transaction failed for line', safeKey, error);
                showNotification('Fout bij opslaan (concurrentie). Probeer opnieuw.', 'error', 4000);
                return;
            }
            if (!committed) {
                console.warn('⚠️ Transaction aborted', safeKey);
                return;
            }
            const val = snapshot.val();
            console.log('✅ Transaction applied', safeKey, val);

            // 乐观合并到本地（最终以监听为准）
            const sameKey = (l) => l.lineKey === safeKey || (l.sku === sku && JSON.stringify(l.options || {}) === JSON.stringify(normalizedOptions));
            const localIndex = this._order.findIndex(sameKey);
            if (val) {
                const base = {
                    lineKey: safeKey,
                    sku,
                    description,
                    quantity: val.quantity,
                    price: val.price,
                    taxRate: val.taxRate,
                    taxAmount: val.taxAmount,
                    subtotal: val.subtotal,
                    group,
                    allergy,
                    options: normalizedOptions,
                    deviceId: val.deviceId
                };
                if (localIndex === -1) this._order.push(base);
                else Object.assign(this._order[localIndex], base);
            } else if (localIndex !== -1) {
                this._order.splice(localIndex, 1);
            }

            Ui.receiptDetails(this);
            Ui.summary(this);
            if (window.BadgeManager) {
                if (this._initialBadgesSynced) window.BadgeManager.update(this._order);
                else window.BadgeManager.scheduleInitial(this._order, () => { this._initialBadgesSynced = true; });
            } else {
                updateQuantityLabels(this._order);
                this._initialBadgesSynced = true;
            }
        });
    }

    /* ---------------- 辅助消息 ---------------- */
    displayErrorMessage(description, message) {
        showNotification(`${description} - ${message}`, "error", 4500);
    }

    displaySuccessMessage(description, currentTotals) {
        const message = `Totaal: ${currentTotals.newCombinedGroep1And4Total} hoofdgerechten, ${currentTotals.newGroep3Total} bijgerechten`;
        showNotification(message, "success", 4500);
        Ui.receiptDetails(this);
        if (window.BadgeManager) window.BadgeManager.update(this._order);
        else updateQuantityLabels(this._order);
    }

    /* ---------------- 组计数 ---------------- */
    calculateGroupTotals(group, description, quantity) {
        const groep1Count = this._order
            .filter(item => item.group === 'groep1' && item.description !== description)
            .reduce((total, item) => total + item.quantity, 0);

        const groep3Count = this._order
            .filter(item => item.group === 'groep3' && item.description !== description)
            .reduce((total, item) => total + item.quantity, 0);

        const groep4Count = this._order
            .filter(item => item.group === 'groep4' && item.description !== description)
            .reduce((total, item) => total + item.quantity * 2, 0);

        const newGroep1Total = group === 'groep1' ? groep1Count + quantity : groep1Count;
        const newGroep3Total = group === 'groep3' ? groep3Count + quantity : groep3Count;
        const newGroep4Total = group === 'groep4' ? groep4Count + quantity * 2 : groep4Count;
        const newCombinedGroep1And4Total = newGroep1Total + newGroep4Total;

        console.log("Group Totals:", {
            groep1Count, groep3Count, groep4Count,
            newGroep1Total, newGroep3Total, newGroep4Total, newCombinedGroep1And4Total
        });

        return {
            newGroep1Total, newGroep3Total, newGroep4Total, newCombinedGroep1And4Total
        };
    }

    /* ---------------- UI 动效 ---------------- */
    triggerItemAddedBehavior(description, totalQuantity, totalAllowed, allergy) {
        const menuItem = document.querySelector(`[data-description="${description}"]`);
        if (!menuItem) return;

        const menuItemRect = menuItem.getBoundingClientRect();
        const copyImg = menuItem.querySelector('.menu-img')?.cloneNode(true);
        if (!copyImg) return;

        copyImg.classList.add('copy');
        copyImg.style.top = `${menuItemRect.top - 20}px`;
        copyImg.style.left = `${menuItemRect.left}px`;
        document.body.appendChild(copyImg);

        setTimeout(() => copyImg.classList.add('animate'), 50);
        setTimeout(() => { copyImg.parentNode && copyImg.parentNode.removeChild(copyImg); }, 500);

        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.style.display = 'block';
            const existing = messageContainer.querySelector('#messageBar');
            if (existing) existing.remove();

            const messageBar = document.createElement('div');
            messageBar.classList.add('message-bar');
            messageBar.id = 'messageBar';
            messageBar.style.whiteSpace = 'normal';
            messageBar.style.wordWrap = 'break-word';
            messageBar.style.overflowWrap = 'break-word';
            messageBar.style.maxWidth = '95vw';
            messageBar.style.margin = '0 auto';

            if (totalQuantity !== undefined && totalAllowed !== undefined) {
                messageBar.innerHTML = `<font color="white" size="2.5rem">${description}</font><br><font size="2.2rem">toegevoegd<br/> Totaal：</font> <font color="#9DC183" size="2.5rem">${totalQuantity}/${totalAllowed}</font><br/>`;
            } else {
                messageBar.innerHTML = `<font color="white">${description}</font><br>is toegevoegd<br/>`;
            }
            messageContainer.appendChild(messageBar);

            setTimeout(() => messageBar.classList.add('show'), 10);
            applyCustomTranslations?.();
            setTimeout(() => {
                messageBar.classList.remove('show');
                setTimeout(() => {
                    if (messageBar.parentNode) messageBar.remove();
                    if (!messageContainer.children.length) messageContainer.style.display = 'none';
                }, 500);
            }, 3500);
        }

        const descriptionButton = document.getElementById('descriptionButton');
        if (descriptionButton && copyImg) {
            descriptionButton.addEventListener('click', () => {
                askQuestion?.(description, copyImg.src, allergy);
            });
        }

        Ui.receiptDetails(this);
        if (window.BadgeManager) window.BadgeManager.update(this._order);
        else updateQuantityLabels(this._order);
        console.log(`"${description}" is toegevoegd`);
    }

    triggerItemNotAddedBehavior(description) {
        const menuItem = document.querySelector(`[data-description="${description}"]`);
        const copyImg = menuItem?.querySelector('.menu-img')?.cloneNode();
        if (!menuItem || !copyImg) return;

        const menuItemRect = menuItem.getBoundingClientRect();
        copyImg.classList.add('copy');
        copyImg.style.top = `${menuItemRect.top - 20}px`;
        copyImg.style.left = `${menuItemRect.left}px`;
        document.body.appendChild(copyImg);

        setTimeout(() => copyImg.classList.add('animate'), 50);
        setTimeout(() => { copyImg.parentNode && copyImg.parentNode.removeChild(copyImg); }, 500);

        const messageContainer = document.getElementById('message-container-notAdd');
        if (messageContainer) {
            messageContainer.style.display = 'block';
            const messageBar = document.createElement('div');
            messageBar.classList.add('message-bar-notAdd');
            messageBar.innerHTML = `<br/> <span style="color: #FF0000;background-color: #222; text-align: center; font-size: 1.3rem;display: block; padding: 5px;">Toevoegen mislukt:</span><br/><span style="color: goldenrod; background-color: #222;text-align: left; font-size: 1.1rem; display: block; padding: 8px;">Maximum aantal gerechten bereikt. <br/>U kunt echter nog wel dranken of <br/>bijgerechten bestellen.</span>`;
            messageContainer.appendChild(messageBar);
            setTimeout(() => messageBar.classList.add('show'), 10);
            setTimeout(() => {
                messageBar.classList.remove('show');
                setTimeout(() => {
                    messageBar.remove();
                    if (!messageContainer.children.length) messageContainer.style.display = 'none';
                }, 500);
            }, 4000);
        }

        Ui.receiptDetails(this);
        if (window.BadgeManager) window.BadgeManager.update(this._order);
        else updateQuantityLabels(this._order);
        console.log(`"${description}" <br>het max aantal bereikt`);
    }

    /* ---------------- 操作订单行（删除、清空） ---------------- */
    deleteOrderLine(sku) {
        const db = firebase.database();
        const RestNameUrl = document.getElementById("restNaam")?.innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer")?.innerText.trim()}`;
        const orderPath = `/${RestNameUrl}/tafel/${tafelId}/orders/orderlist`;

        const itemIndex = this._order.findIndex(orderItem => orderItem.sku === sku);
        if (itemIndex === -1) {
            console.error(`❌ Error: Item with SKU ${sku} not found.`);
            return;
        }

        const removedItem = this._order.splice(itemIndex, 1)[0];
        console.log(`✅ Removed item: ${JSON.stringify(removedItem)}`);

        const receiptContainer = document.getElementById("receipt-details");
        const summaryContainer = document.getElementById("summary-table");

        if (this._order.length === 0) {
            if (receiptContainer) receiptContainer.innerHTML = "";
            if (summaryContainer) summaryContainer.innerHTML = "";
            Ui.summary(this);
        }

        const updatedOrderData = this._order.length === 0 ? null : this._order.reduce((acc, item) => {
            acc[item.sku] = {
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                taxRate: item.taxRate || 0,
                taxAmount: item.taxAmount || 0,
                subtotal: item.subtotal || (item.quantity * item.price),
                group: item.group,
                allergy: item.allergy,
                options: item.options || []
            };
            return acc;
        }, {});

        db.ref(orderPath).set(updatedOrderData)
            .then(() => console.log("✅ Order successfully updated in Firebase."))
            .catch(error => console.error("❌ Failed to update Firebase:", error));

        if (receiptContainer) Ui.receiptDetails(this);
        if (summaryContainer) Ui.summary(this);
        updateQuantityLabels(this._order);
    }

    clearOrder() {
        this._order = [];
        Ui.receiptDetails(this);
    }

    /* ---------------- 小结 / 支付 ---------------- */
    getSummary() {
        const summary = { subtotal: 0, tax: 0, grandtotal: 0 };
        this._order.forEach(orderLine => {
            summary.subtotal += (orderLine.subtotal || (orderLine.price || 0) * (orderLine.quantity || 0));
            summary.tax += orderLine.tax || orderLine.taxAmount || 0;
        });
        summary.grandtotal = summary.subtotal; // 如需含税合计可调整
        return summary;
    }

    paypad(input) {
        if (!isNaN(parseInt(input))) {
            Utilities.numberPaypad(parseInt(input), this);
        } else if (input === "back") {
            Utilities.backPaypad(this);
        } else if (input === "clear") {
            Utilities.clearPaypad(this);
        }
    }

    changePayment(input) {
        const orderGrandTotal = this.getSummary().grandtotal;
        if (input.invoiceNumber != null) this.payment.invoiceNumber = input.invoiceNumber;
        if (input.amountPaid != null) this.payment.amountPaid = parseFloat(input.amountPaid);
        if (input.type != null) this.payment.type = input.type;

        if ((this.payment.amountPaid || 0) >= orderGrandTotal) {
            this.payment.changeTip = (this.payment.amountPaid || 0) - orderGrandTotal;
            Ui.closeButton(false);
        } else {
            this.payment.changeTip = 0;
            Ui.closeButton(true);
        }
        Ui.paymentSummary(this);
    }

    clearPayment() {
        this._payment = { invoiceNumber: 0, amountPaid: 0, type: "", changeTip: 0 };
        Ui.paymentSummary(this);
    }

    exportOrder(date) {
        const exportData = [];
        this.order.forEach(orderLine => {
            const currentLine = [];
            currentLine[0] = date.toISOString();
            currentLine[1] = orderLine.sku;
            currentLine[2] = orderLine.quantity;
            currentLine[3] = orderLine.price;
            currentLine[4] = orderLine.taxRate;
            currentLine[5] = orderLine.description;
            exportData.push(currentLine);
        });
        return exportData;
    }

    exportPayment(date) {
        const currentPayment = [[]];
        currentPayment[0][0] = date;
        currentPayment[0][2] = this.getSummary().grandtotal;
        return currentPayment;
    }

    /* ---------------- 结账流程 ---------------- */
    async closeSale(timerText, InvoiceNumber, tafelNr) {
        const date = new Date();
        const tafelId = `Tafel-${tafelNr}`;
        const availableOrderItems = this._order;

        const allItemsFromGroepGeen = availableOrderItems.length > 0 && availableOrderItems.every(item => item.group === "geen");
        const hasNonDrinkItems = availableOrderItems.some(item => item.group !== "geen");

        const orderData = this.exportOrder(date, availableOrderItems);
        const paymentData = this.exportPayment(date);
        const exportData = { order: orderData, payment: paymentData };

        const orderLineCount = orderData.length;
        const newInvoiceNumber = parseInt(InvoiceNumber, 10);
        const Bestelling = JSON.stringify(orderData);

        console.log("Bestellingen from closeSale:", Bestelling);
        document.getElementById("overlay").style.display = 'block';
        showNotification(`Verzenden...`, "info", 2000);

        try {
            const serverStatus = await this.getServerStatus();
            if (serverStatus === "online") {
                document.getElementById("mainBody").style.display = 'none';
                document.getElementById("overlay").style.display = 'none';
                showNotification(`Uw bestelling is succesvol verzonden!`, "success", 2500);

                try {
                    await sendDirect(timerText, tafelNr, orderLineCount, newInvoiceNumber, Bestelling);
                    await this.saveOrderHistoryToFirebase(tafelId, newInvoiceNumber, date, orderData, paymentData, orderLineCount);

                    this.clearOrderList(tafelId);
                    generateNewOrderNumber(tafelId);
                    this.orderSent = true;

                    this.clearPayment();
                    this.clearOrder();
                    this.resetQuantityLabels();
                    Ui.summary(this);

                    if (hasNonDrinkItems) {
                        console.log("Order contains food. Resetting timer...");
                        await this.resetTimerAfterOrder();
                    } else {
                        console.log("Order contains only drinks. Skipping timer reset.");
                    }
                } catch (error) {
                    console.error("Error executing sendDirect:", error?.message || error);
                    showNotification("发送订单遇到技术问题： " + (error?.message || "服务器可能被意外关闭"), "error", 5500);
                }
            } else {
                showNotification("Server is momenteel offline, probeer het later nog eens...", "error", 5500);
                document.getElementById("mainBody").style.display = 'none';
                document.getElementById("overlay").style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching server status:", error?.message || error);
            showNotification("无法获取服务器状态，请检查您的网络连接。", "error", 5500);
            document.getElementById("overlay").style.display = 'none';
        }
    }

    async getServerStatus() {
        const WebHookStatus = document.getElementById("webhookHealthUrl").innerText.trim();
        const healthCheckUrl = WebHookStatus;

        try {
            const response = await fetch(healthCheckUrl, { method: "GET" });
            return response.ok ? "online" : "offline";
        } catch (error) {
            console.error("Error during server status check:", error);
            return "offline";
        }
    }

    clearOrderList(tafelId) {
        const RestNameUrl = document.getElementById("restNaam").innerText.trim();
        const orderListPath = `/${RestNameUrl}/tafel/${tafelId}/orders/orderlist`;

        const db = firebase.database();
        db.ref(orderListPath)
            .remove()
            .then(() => console.log("Orderlist key removed from Firebase."))
            .catch((error) => console.error("Failed to remove orderlist key from Firebase:", error));
    }

    async saveOrderHistoryToFirebase(tafelId, invoiceNumber, date, orderData, paymentData, orderLineCount) {
        const RestNameUrl = document.getElementById("restNaam").innerText.trim();
        const historyPath = `${RestNameUrl}/tafel/${tafelId}/orders/history/`;
        const historyRef = firebase.database().ref(historyPath);

        const orderHistoryData = {
            date: date.toISOString(),
            timestamp: Date.now(),
            orderDetails: orderData,
            paymentDetails: paymentData,
            totalItems: orderLineCount,
            invoiceNumber: invoiceNumber,
        };

        try {
            await historyRef.child(invoiceNumber).set(orderHistoryData);
            console.log("Order history saved to Firebase:", orderHistoryData);
        } catch (error) {
            console.error("Error saving order history to Firebase:", error);
        }
    }

    /* ---------------- 重要UI：重置角标 ---------------- */
    resetQuantityLabels() {
        document.querySelectorAll('.quantityLabel').forEach(label => {
            label.textContent = 0;
            label.style.display = "none";
        });
    }

    /* ---------------- 行数量增减 / 删除（事务） ---------------- */
    adjustLineQuantity(lineKey, delta) {
        if (!delta) return;
        const restName = document.getElementById("restNaam").innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer").innerText.trim()}`;
        const ref = firebase.database().ref(`/${restName}/tafel/${tafelId}/orders/orderlist/${lineKey}`);

        if (delta > 0) {
            const line = this._order.find(l => l.lineKey === lineKey);
            const group = line?.group;
            if (group) {
                const parsePosInt = (s) => {
                    const n = parseInt(s, 10);
                    return Number.isFinite(n) && n >= 0 ? n : null;
                };
                const etenEl = document.getElementById('limiet_eten');
                const dessertEl = document.getElementById('limiet_dessert');
                const personsEl = document.getElementById('aantal_pers');
                const persons = parsePosInt(personsEl?.innerText) ?? 1;
                const etenPer = parsePosInt(etenEl?.innerText);
                const desPer = parsePosInt(dessertEl?.innerText);
                const etenLimitTotal = etenPer == null ? Infinity : etenPer * persons;
                const dessertLimitTotal = desPer == null ? Infinity : desPer * persons;
                const currentHoofd = this._order.reduce((acc, l) => acc + (l.group === 'groep1' ? l.quantity : 0) + (l.group === 'groep4' ? l.quantity * 2 : 0), 0);
                const currentDessert = this._order.reduce((acc, l) => acc + (l.group === 'groep3' ? l.quantity : 0), 0);
                if ((group === 'groep1' || group === 'groep4') && currentHoofd + (group === 'groep1' ? 1 : 2) > etenLimitTotal) {
                    showNotification('Hoofdgerechten limiet bereikt', 'error', 4000); return;
                }
                if (group === 'groep3' && currentDessert + 1 > dessertLimitTotal) {
                    showNotification('Desserts limiet bereikt', 'error', 4000); return;
                }
            }
        }

        ref.transaction(cur => {
            if (cur == null) return cur;
            const newQty = (cur.quantity || 0) + delta;
            if (newQty <= 0) return null;
            cur.quantity = newQty;
            cur.subtotal = (cur.price || 0) * newQty;
            cur.taxAmount = cur.subtotal * ((cur.taxRate || 0) / 100);
            return cur;
        }, (err, committed, snap) => {
            if (err) {
                console.error('Adjust quantity failed', lineKey, err);
                return;
            }
            if (committed && snap && snap.val()) {
                this._mergeLocalLineAfterTxn(lineKey, snap.val(), snap.val().options || {});
                this.updateAggregates();
            } else if (committed && snap && snap.val() === null) {
                this._removeLocalLine(lineKey);
                this.updateAggregates();
            }
        });
    }

    removeLine(lineKey) {
        const restName = document.getElementById("restNaam").innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer").innerText.trim()}`;
        firebase.database().ref(`/${restName}/tafel/${tafelId}/orders/orderlist/${lineKey}`).remove()
            .then(() => { this._removeLocalLine(lineKey); this.updateAggregates(); })
            .catch(e => console.error('Remove line failed', lineKey, e));
    }

    _mergeLocalLineAfterTxn(lineKey, val, optionsObj) {
        const idx = this._order.findIndex(l => l.lineKey === lineKey);
        if (idx === -1) {
            this._order.push({
                lineKey,
                sku: val.sku || lineKey,
                description: val.description || 'No description',
                quantity: val.quantity || 0,
                price: parseFloat(val.price) || 0,
                taxRate: val.taxRate || 0,
                taxAmount: val.taxAmount || 0,
                subtotal: val.subtotal || 0,
                group: val.group || 'unknown',
                allergy: val.allergy || '',
                options: optionsObj || {}
            });
        } else {
            Object.assign(this._order[idx], {
                quantity: val.quantity || 0,
                taxAmount: val.taxAmount || 0,
                subtotal: val.subtotal || 0
            });
        }
        Ui.receiptDetails(this);
    }

    _removeLocalLine(lineKey) {
        const idx = this._order.findIndex(l => l.lineKey === lineKey);
        if (idx !== -1) {
            this._order.splice(idx, 1);
            Ui.receiptDetails(this);
        }
    }

    updateAggregates() {
        const restName = document.getElementById('restNaam')?.innerText.trim();
        const tafelId = this._getNormalizedTafelId(window.AppConfig?.tafelId);
        if (!restName || !tafelId) return;
        const hoofd = this._order.reduce((a, l) => a + (l.group === 'groep1' ? l.quantity : 0) + (l.group === 'groep4' ? l.quantity * 2 : 0), 0);
        const dessert = this._order.reduce((a, l) => a + (l.group === 'groep3' ? l.quantity : 0), 0);
        const totaalPrijs = this._order.reduce((a, l) => a + (l.price || 0) * (l.quantity || 0), 0);
        firebase.database().ref(`/${restName}/tafel/${tafelId}/orders/aggregates`).update({
            hoofdgerechten: hoofd,
            desserts: dessert,
            totaalPrijs: totaalPrijs,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        }).catch(e => console.error('Update aggregates failed', e));
    }

    /* ---------------- 订单后重置计时器 ---------------- */
    async resetTimerAfterOrder() {
        try {
            const RestNameUrl = document.getElementById('restNaam').innerText.trim();
            const tafelId = `Tafel-${document.getElementById('tafelNummer').innerText.trim()}`;

            const db = firebase.database();
            const timerRef = db.ref(`${RestNameUrl}/tafel/${tafelId}/timer`);
            const roundTimeConfigRef = db.ref(`${RestNameUrl}/config/round_time`);

            let roundTimeRef = roundTimeConfigRef;
            let roundTimeSnapshot = await roundTimeConfigRef.once("value");
            if (roundTimeSnapshot.val() == null) {
                const legacyRef = db.ref(`${RestNameUrl}/settings/round_time`);
                const legacySnap = await legacyRef.once('value');
                if (legacySnap.val() != null) {
                    roundTimeRef = legacyRef;
                    roundTimeSnapshot = legacySnap;
                    console.info('[round_time] Using legacy settings/round_time path (config missing)');
                }
            }

            function normalizeRoundTimeToMinutes(val) {
                const n = Number(val);
                if (!Number.isFinite(n)) return null;
                return n > 1000 ? Math.round(n / 60000) : n; // >1000 视为毫秒
            }
            const raw = roundTimeSnapshot.val();
            const countDownMinutes = normalizeRoundTimeToMinutes(raw) ?? 1;

            const newStartTime = Date.now();
            const newEndTime = newStartTime + countDownMinutes * 60 * 1000;

            await timerRef.update({ startTime: newStartTime, duration: countDownMinutes, endTime: newEndTime });
            console.log(`✅ Timer reset after order: Duration = ${countDownMinutes} minutes, New End Time = ${new Date(newEndTime).toLocaleString()}`);
            startCountdown?.();
        } catch (error) {
            console.error("❌ Error resetting timer:", error);
        }
    }

    /* ---------------- 按设备增减份数 ---------------- */
    async adjustLineQuantityByDevice(lineKey, deviceId, delta) {
        const restName = document.getElementById("restNaam").innerText.trim();
        const tafelId = `Tafel-${document.getElementById("tafelNummer").innerText.trim()}`;
        const lineRef = firebase.database().ref(`/${restName}/tafel/${tafelId}/orders/orderlist/${lineKey}`);
        await lineRef.transaction(curr => {
            if (!curr) return curr;
            const total = Number(curr.quantity) || 0;
            const mine = Number((curr.byDevice || {})[deviceId]) || 0;
            const newTotal = total + delta;
            const newMine = mine + delta;
            if (newTotal <= 0) return null;
            curr.quantity = newTotal;
            curr.byDevice = curr.byDevice || {};
            if (newMine <= 0) delete curr.byDevice[deviceId];
            else curr.byDevice[deviceId] = newMine;
            curr.deviceId = deviceId;
            curr.subtotal = (curr.price || 0) * (curr.quantity || 0);
            curr.taxAmount = curr.subtotal * ((curr.taxRate || 0) / 100);
            return curr;
        });
    }
}

// export default Order;










// function showImmediateConfirmation() {
//     const newInvoiceNumber = document.getElementById("invoice-number").innerText.trim();
//     document.getElementById('overlay').style.display = "block";

//     // Create a confirmation message
//     const confirmationMessage = document.createElement('div');
//     confirmationMessage.id = 'confirmationMessage';
//     confirmationMessage.classList.add('fade-in'); // Apply the fade-in animation
//     confirmationMessage.style.position = 'fixed';
//     confirmationMessage.style.top = '30%';
//     confirmationMessage.style.left = '50%';
//     confirmationMessage.style.transform = 'translate(-50%, -50%)';
//     confirmationMessage.style.backgroundColor = '#222';
//     confirmationMessage.style.color = 'goldenrod';
//     confirmationMessage.style.padding = '20px';
//     confirmationMessage.style.zIndex = '99999'; // Make sure it's above other elements
//     confirmationMessage.style.borderRadius = '10px';
//     confirmationMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
//     confirmationMessage.style.fontSize = '1.5em';
//     confirmationMessage.style.width = '80%';
//     confirmationMessage.style.textAlign = 'center'; // Horizontally center-align text
//     confirmationMessage.style.justifyContent = 'center'; // Center horizontally
//     confirmationMessage.style.alignItems = 'center'; // Center vertically
//     confirmationMessage.innerHTML = "<strong>Uw bestelling " + newInvoiceNumber + "</strong><br> is succesvol verzonden.";
//     // Reset the round timer with a fresh start using configured round_time
//     (async () => {
//         try {
//             if (window.orderInstance && typeof orderInstance.resetTimerAfterOrder === 'function') {
//                 await orderInstance.resetTimerAfterOrder();
//             } else if (window.order && typeof order.resetTimerAfterOrder === 'function') {
//                 await order.resetTimerAfterOrder();
//             } else {
//                 // Fallback: manually reset based on config/round_time (or legacy settings/round_time)
//                 const RestNameUrl = document.getElementById('restNaam').innerText.trim();
//                 const tafelId = `Tafel-${document.getElementById('tafelNummer').innerText.trim()}`;
//                 const db = firebase.database();
//                 let roundTimeRef = db.ref(`${RestNameUrl}/config/round_time`);
//                 let snap = await roundTimeRef.once('value');
//                 if (snap.val() == null) { // legacy support
//                     roundTimeRef = db.ref(`${RestNameUrl}/settings/round_time`);
//                     snap = await roundTimeRef.once('value');
//                 }
//                 function normalizeRoundTimeToMinutes(val) {
//                     const n = Number(val);
//                     if (!Number.isFinite(n)) return null;
//                     return n > 1000 ? Math.round(n / 60000) : n; // >1000 视为毫秒
//                 }
//                 const raw = snap.val();
//                 const countDownMinutes = normalizeRoundTimeToMinutes(raw) ?? 15;
//                 const timerRef = db.ref(`${RestNameUrl}/tafel/${tafelId}/timer`);
//                 const now = Date.now();
//                 await timerRef.update({ startTime: now, duration: countDownMinutes, endTime: now + countDownMinutes*60*1000 });
//                 startCountdown();
//             }
//         } catch(e){ console.warn('Timer reset fallback error', e); }
//     })();

//     google.script.run.createRecord(newInvoiceNumber);
//     // Append to body
//     document.body.appendChild(confirmationMessage);

//     // Assuming confirmationMessage is the message panel element
//     confirmationMessage.style.opacity = '1'; // Ensure the panel is visible

//     // Function to hide and remove the confirmation message panel
//     function hideConfirmationMessage() {
//         confirmationMessage.style.opacity = '0'; // Fade out effect
//         setTimeout(() => {
//             confirmationMessage.remove(); // Remove the element after fade out
//             document.getElementById('overlay').style.display = "none";
//             document.getElementById('mainBody').style.display = "none";
//         }, 500); // Short delay to allow fade-out effect
//     }

//     // Close the message when clicking directly on it
//     confirmationMessage.addEventListener("click", hideConfirmationMessage);

//     // Close the message when clicking outside of it
//     document.addEventListener("click", function (event) {
//         if (!confirmationMessage.contains(event.target)) {
//             hideConfirmationMessage();
//         }
//     }, { once: true });
// }



// Function to fetch verspillingBericht from Google Apps Script

// function checkStatusAndPincodeFromServer(timerText, orderLineCount, allItemsFromGroep3, newInvoiceNumber, Bestelling) {
//     console.log("number from checkStatusAndPincode:", newInvoiceNumber)
//     document.getElementById('overlay').style.display = "block";

//     // Create the confirmation message element
//     const defaultConfirmationMessage = document.createElement('div');
//     defaultConfirmationMessage.id = 'defaultConfirmationMessage';
//     defaultConfirmationMessage.classList.add('fade-in');
//     defaultConfirmationMessage.style.position = 'fixed';
//     defaultConfirmationMessage.style.top = '30%';
//     defaultConfirmationMessage.style.left = '50%';
//     defaultConfirmationMessage.style.transform = 'translate(-50%, -50%)';
//     defaultConfirmationMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 50% transparent black background
//     defaultConfirmationMessage.style.color = 'goldenrod';
//     defaultConfirmationMessage.style.padding = '20px';
//     defaultConfirmationMessage.style.zIndex = '99999';
//     defaultConfirmationMessage.style.borderRadius = '10px';
//     defaultConfirmationMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
//     defaultConfirmationMessage.style.fontSize = '1.5em';
//     defaultConfirmationMessage.style.width = '80%';
//     defaultConfirmationMessage.style.textAlign = 'center'; // Horizontally center-align text
//     defaultConfirmationMessage.style.display = 'flex'; // Flex display for centering
//     defaultConfirmationMessage.style.justifyContent = 'center'; // Center horizontally
//     defaultConfirmationMessage.style.alignItems = 'center'; // Center vertically

//     // Append the message to the document
//     document.body.appendChild(defaultConfirmationMessage);

//     // Run server function and handle both response and verspillingBericht in the callback
//     google.script.run
//         .withSuccessHandler(function (result) {
//             const { response, verspillingBericht } = result;

//             // Show a default message during processing
//             if (allItemsFromGroep3) {
//                 defaultConfirmationMessage.innerHTML = `<strong><span>aan het verzenden...</span></strong><br>`;
//                 applyCustomTranslations();
//             } else {
//                 defaultConfirmationMessage.innerHTML = `<strong><span>aan het verzenden...</span><br>`;
//                 applyCustomTranslations();
//             }

//             // Handle the response
//             if (response === "ok") {
//                 setTimeout(() => {
//                     showImmediateConfirmation(newInvoiceNumber);
//                 }, 500);
//             } else if (response === "server_offline") {
//                 showNotification(`Server is nog niet aan!`, "error", 10000);
//             } else if (response === "invalid_pincode") {
//                 showNotification(`Uw pincode is verlopen`, "error", 10000);
//             } else if (response === "table_not_open") {
//                 showNotification(`Uw tafel is nog niet geopend voor bestellingen`, "error", 10000);
//             } else {
//                 showNotification(`Er is iets mis met onze verbinding, wilt u nogmaals proberen aub.`, "error", 10000);
//                 console.error(`Unexpected response: ${response}`);
//             }

//             // Remove the message after fade-out
//             setTimeout(() => {
//                 defaultConfirmationMessage.style.opacity = "0";
//                 setTimeout(() => {
//                     defaultConfirmationMessage.remove();
//                     document.getElementById("overlay").style.display = "none";
//                     document.getElementById("mainBody").style.display = "none";
//                 }, 500);
//             }, 500);
//         })
//         .checkStatusAndPincode(timerText, orderLineCount, allItemsFromGroep3, Bestelling, newInvoiceNumber);

// }












//////////////////////////////////////////////////////////////////////////////////
class Utilities {

    static convertFloatToString(float) {
        let priceParams = {
            style: "currency",
            currency: "EUR"
        };

        return float.toLocaleString("nl-NL", priceParams);
    }

    static roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    static numberPaypad(input, orderInstance) {
        const currentInput = this.roundToTwo(input * .01);
        const currentAmountPaid = this.roundToTwo(orderInstance.payment.amountPaid);
        const newAmountPaid = this.roundToTwo((currentAmountPaid * 10) + currentInput);

        if (currentAmountPaid === 0) {
            orderInstance.changePayment({ amountPaid: currentInput });
        } else {
            orderInstance.changePayment({ amountPaid: newAmountPaid });
        }
    }

    static backPaypad(orderInstance) {
        const currentPayment = orderInstance.payment.amountPaid;

        if (currentPayment > 0) {
            const toSubtract = ((currentPayment * 100) % 10) * 0.01;
            const newAmount = (currentPayment - toSubtract) * 0.1;
            orderInstance.changePayment({ amountPaid: newAmount });
        }
    }

    static clearPaypad(orderInstance) {
        orderInstance.changePayment({ amountPaid: 0 });
    }
}
