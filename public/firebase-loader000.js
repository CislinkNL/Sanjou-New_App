(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const restName = urlParams.get("rest");
  const tafelRaw = urlParams.get("tafel");
  const pincode = urlParams.get("pincode");
  const tafelId = tafelRaw ? `Tafel-${tafelRaw}` : null;

  window.AppConfig = {
    restName,
    tafelRaw,
    tafelId,
    pincode,
    configReady: false
  };

  if (!restName || !tafelRaw) {
    console.warn("⚠️ Missing ?rest or ?tafel in URL");
    return;
  }

  const database = firebase.database();

  const loadFirebaseConfig = () => {
    return database.ref(`/${restName}/config`).once("value").then(snapshot => {
      const config = snapshot.val();
      if (!config) {
        console.warn("No config found in Firebase for:", restName);
        return;
      }

      AppConfig.pythonAuth = config.pythonAuth || "";
      AppConfig.restNaam = config.restNaam || "";
      AppConfig.whatsappPhone = config.whatsappRecipients || [];
      AppConfig.whatsappBerichtAan = config.whatsappBerichtAan === true;
      AppConfig.translateOn = config.translateOn !== false;
      AppConfig.restUrlName = config.restUrlName || "";
      AppConfig.titleImage = config.titleImage || "";
      AppConfig.serverAccessKey = config.server_access || "";
      AppConfig.timeLimit = config.timeLimit !== undefined ? config.timeLimit : true;
      AppConfig.WebHook = config.WebHook || "";
      AppConfig.isAuth = config.isAuth || false;
      AppConfig.configReady = true;

      if (config.restNaam) document.title = config.restNaam;

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };
      const setImage = (id, url) => {
        const el = document.getElementById(id);
        if (el) el.src = url;
      };

      setImage("titleImage", config.titleImage);
      setText("restName", config.restUrlName);
      setText("restNaam", config.restUrlName);
      setText("limiet_eten", config.etenLimiet);
      setText("limiet_dessert", config.dessertLimiet);
      setText("refreshURL", config.url2);
      setText("webhook", config.WebHook);
      setText("webhookHealthUrl", config.WebHookStatus);
      setText("maxTijd", config.maxTijd);
      setText("eerste_ronde_tijd", config.eerste_ronde_tijd);
      setText("pythonAuth", config.pythonAuth);
      setText("savedPin", config.savedPincode);
      setText("tafelNummer", tafelRaw);

      setImage("logo-img-receipt", config.titleImage);
      setText("tafel-nummer", `Tafel - ${tafelRaw}`);
    });
  };

  const loadCategories = () => {
    return database.ref(`/${restName}/categorie`).once("value").then(snapshot => {
      const catData = snapshot.val();
      if (!catData) return;

      document.getElementById("btn-food-main").textContent = "Eten";
      document.getElementById("btn-drink-main").textContent = "Dranken";

      const foodContainer = document.getElementById("foodSubMenu");
      const drinkContainer = document.getElementById("drinksSubMenu");
      foodContainer.innerHTML = "";
      drinkContainer.innerHTML = "";

      const renderCat = (container, type, list) => {
        list.forEach(cat => {
          const btn = document.createElement("a");
          btn.className = `btn btn-outline-success btn-lg active btn-menu btn-lvl2 ${type === 'food' ? 'btn-foodlvl2' : 'btn-drinkslvl2'}`;
          btn.href = `#${cat.target}`;
          btn.id = cat.id;
          btn.setAttribute("role", "button");
          btn.setAttribute("aria-pressed", "true");
          btn.textContent = cat.name;
          container.appendChild(btn);
        });
      };

      if (catData.food) renderCat(foodContainer, 'food', catData.food);
      if (catData.drinks) renderCat(drinkContainer, 'drinks', catData.drinks);

      // === Load serviceCat configuration (direct jump or submenu) ===
      if (catData.serviceCat) {
        // Persist raw config so javascript.js initServiceCategoryFromConfig can use it
        window.AppConfig.serviceCat = {
          displayName: catData.serviceCat.displayName || catData.serviceCat.name || 'Service',
          directTarget: catData.serviceCat.directTarget || undefined,
          directLink: catData.serviceCat.directLink || undefined,
          items: Array.isArray(catData.serviceCat.items) ? catData.serviceCat.items : undefined
        };
        // Mark config ready if base config already loaded
        // Attempt to re-run dynamic init if javascript.js already injected
        if (typeof window.$ === 'function') {
          // Delay slightly to allow DOM for button to exist
          setTimeout(() => {
            if (typeof window.initServiceCategoryFromConfig === 'function') {
              try { window.initServiceCategoryFromConfig(); } catch (e) { console.warn('initServiceCategoryFromConfig rerun failed', e); }
            } else {
              // Fallback: ensure button text updated at least
              const btn = document.getElementById('btn-service-main');
              if (btn && window.AppConfig.serviceCat.displayName) btn.textContent = window.AppConfig.serviceCat.displayName;
            }
          }, 80);
        }
      } else {
        // No config: hide service button if present
        const btn = document.getElementById('btn-service-main');
        if (btn) btn.style.display = 'none';
      }
    });
  };

  const setupCategoryClickAutoHide = () => {
    const foodBtns = document.querySelectorAll('.btn-foodlvl2');
    const drinkBtns = document.querySelectorAll('.btn-drinkslvl2');

    foodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('categorie').style.display = 'none';
      });
    });

    drinkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('categorie').style.display = 'none';
      });
    });
  };

  const loadAantalPers = () => {
    const ref = database.ref(`${restName}/tafel/${tafelId}/Persons`);
    ref.on("value", snapshot => {
      const value = snapshot.val();
      if (value !== null) {
        const el = document.getElementById("aantal_pers");
        if (el) el.textContent = value;
        console.log(`✅ Aantal personen geladen: ${value}`);
      }
    });
  };

  const checkAuthStatus = () => {
    if (AppConfig.isAuth === true) {
      return 'allowed';
    } else {
      return 'denied';
    }
  };

document.addEventListener("DOMContentLoaded", async () => {
  // 谷歌翻译开关逻辑
  function maybeEnableGoogleTranslate() {
    if (window.AppConfig && window.AppConfig.translateOn === false) {
      var script = document.getElementById('google-translate-script');
      if (script) script.parentNode.removeChild(script);
    } else {
      var script = document.getElementById('google-translate-script');
      if (script) script.style.display = '';
    }
  }

  // 1) PIN 校验弹窗（只有正确才 resolve；错误绝不放行）
  const showPinModal = () => {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById('pin-modal');
      const input = document.getElementById('pin-input');
      const errorDiv = document.getElementById('pin-error');
      const submitBtn = document.getElementById('pin-submit');

      // ✅ 强制策略：若缺少弹窗元素，则不要放行，直接报错并中止
      if (!modal || !input || !submitBtn) {
        console.error('PIN modal elementen ontbreken，阻止继续初始化。');
        reject(new Error('PIN modal missing'));
        return;
      }

      // 打开弹窗 + 禁止背景滚动
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      input.value = '';
      if (errorDiv) {
        errorDiv.textContent = 'Voer een 3- of 4-cijferige pincode in om verder te gaan.';
        // 统一样式，避免被覆盖
        errorDiv.style.setProperty('color', '', 'important');
        errorDiv.style.setProperty('font-weight', '', 'important');
      }
      input.focus();

      const tryCheck = async () => {
        const pin = (input.value || '').trim();
        if (!/^\d{3,4}$/.test(pin)) {
          if (errorDiv) errorDiv.textContent = 'Pincode moet 3 of 4 cijfers zijn.';
          return; // ❌ 不 resolve
        }

        const rest = AppConfig.restName;
        const tafelId = AppConfig.tafelId;
        if (!rest || !tafelId) {
          if (errorDiv) errorDiv.textContent = 'URL参数不完整。';
          return; // ❌ 不 resolve
        }

        try {
          const db = firebase.database();
          const snap = await db.ref(`${rest}/tafel/${tafelId}/Pincode`).once('value');
          const real = String(snap.val() || '');
          if (pin !== real) {
            if (errorDiv) {
              errorDiv.textContent = 'Pincode is onjuist, probeer opnieuw.';
              errorDiv.style.setProperty('color', 'red', 'important');
              errorDiv.style.setProperty('font-weight', 'bold', 'important');
            }
            return; // ❌ 不 resolve
          }

          // ✅ 正确：写入并放行
          AppConfig.pincode = pin;
          modal.style.display = 'none';
          document.body.style.overflow = ''; // 恢复滚动
          resolve(pin);

        } catch (e) {
          if (errorDiv) errorDiv.textContent = 'Fout bij het controleren van de pincode.';
          // ❌ 不 resolve
        }
      };

      // 绑定（避免重复绑定导致多次校验，可先移除再绑定）
      submitBtn.onclick = null;
      submitBtn.onclick = tryCheck;
      input.onkeydown = null;
      input.onkeydown = (e) => { if (e.key === 'Enter') tryCheck(); };

      // 可选：阻止点击遮罩关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          // 点击空白不关闭，不做任何事
        }
      }, { once: false });
    });
  };

  // === 初始化顺序 ===
  await loadFirebaseConfig();
  if (checkAuthStatus() === 'denied') {
    console.warn('⛔ Auth denied, initialization stopped.');
    return;
  }

  // 先静默校验 URL 自带的 pincode（正确就跳过弹窗）
  try {
    const rest = AppConfig.restName;
    const tafelId = AppConfig.tafelId;
    const urlPin = String(AppConfig.pincode || '');
    let ok = false;
    if (rest && tafelId && /^\d{3,4}$/.test(urlPin)) {
      const db = firebase.database();
      const snap = await db.ref(`${rest}/tafel/${tafelId}/Pincode`).once('value');
      ok = (urlPin === String(snap.val() || ''));
    }
    if (!ok) {
      // ❗URL 没带或不匹配 -> 强制弹窗，直到正确才会 resolve
      await showPinModal();
    }
  } catch (e) {
    // 校验异常也要求弹窗
    await showPinModal();
  }

  // 只有上面通过后才能走到这里
  maybeEnableGoogleTranslate();
  await loadAantalPers();
  await loadCategories();
  setupCategoryClickAutoHide();
  console.log("✅ firebase-loader.js initialization complete");
});

})();