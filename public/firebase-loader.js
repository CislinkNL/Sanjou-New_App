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
      // ✅ 确保 WhatsApp 号码始终是字符串格式
      const recipients = config.whatsappRecipients || [];
      AppConfig.whatsappPhone = Array.isArray(recipients)
        ? recipients.map(num => String(num))
        : [String(recipients)];
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
        // 禁用谷歌翻译脚本
        var script = document.getElementById('google-translate-script');
        if (script) script.parentNode.removeChild(script);
      } else {
        // 显示谷歌翻译脚本（如有）
        var script = document.getElementById('google-translate-script');
        if (script) script.style.display = '';
      }
    }
    // 1. PIN校验弹窗逻辑
    const showPinModal = () => {
      return new Promise((resolve) => {
        const modal = document.getElementById('pin-modal');
        const input = document.getElementById('pin-input');
        const errorDiv = document.getElementById('pin-error');
        const submitBtn = document.getElementById('pin-submit');
        if (!modal || !input || !submitBtn) {
          resolve(null); // 没有弹窗直接通过
          return;
        }
        modal.style.display = 'flex';
        input.value = '';
        errorDiv.textContent = 'Voer een 3- of 4-cijferige pincode in om verder te gaan.';
        input.focus();
        const tryCheck = async () => {
          const pin = input.value.trim();
          if (!/^\d{3,4}$/.test(pin)) {
            errorDiv.textContent = 'Pincode moet 3 of 4 cijfers zijn.';
            return;
          }
          // 校验PIN
          const rest = AppConfig.restName;
          const tafelId = AppConfig.tafelId;
          if (!rest || !tafelId) {
            errorDiv.textContent = 'URL参数不完整。';
            return;
          }
          try {
            const db = firebase.database();
            const tableRef = db.ref(`${rest}/tafel/${tafelId}`);
            const snapshot = await tableRef.once('value');
            const tableData = snapshot.val();
            if (!tableData) {
              errorDiv.textContent = 'Tafelgegevens niet gevonden.';
              return;
            }
            const tafelPin = String(tableData.Pincode || '');
            if (pin !== tafelPin) {
              errorDiv.textContent = 'Pincode is onjuist, probeer opnieuw.';
              errorDiv.style.color = 'red';
              errorDiv.style.fontWeight = 'bold';
              // 强制覆盖可能的CSS样式
              errorDiv.style.setProperty('color', 'red', 'important');
              errorDiv.style.setProperty('font-weight', 'bold', 'important');
              return;
            }
            // 校验通过
            AppConfig.pincode = pin;
            modal.style.display = 'none';
            resolve(pin);
          } catch (e) {
            errorDiv.textContent = 'Fout bij het controleren van de pincode.';
          }
        };
        submitBtn.onclick = tryCheck;
        input.onkeydown = (e) => { if (e.key === 'Enter') tryCheck(); };
      });
    };

    await loadFirebaseConfig();
    if (checkAuthStatus() === 'denied') {
      console.warn('⛔ Auth denied, initialization stopped.');
      return;
    }
    await showPinModal();
    
    maybeEnableGoogleTranslate();
    await loadAantalPers();
    await loadCategories();
    setupCategoryClickAutoHide();
    console.log("✅ firebase-loader.js initialization complete");
  });
})();