// Global initialization function (only called after user clicks “Yes”)
function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'nl',
        includedLanguages: 'en',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
}

// Global store for translations
let customTranslations = {};

// Load from Firebase
async function loadTranslationsFromFirebase() {
    await waitForAppConfig();

    const restName = AppConfig?.restName;
    if (!restName) {
        console.error("❌ Cannot load translations: restName is missing.");
        return;
    }

    try {
        const ref = firebase.database().ref(`${restName}/translations`);
        const snapshot = await ref.once("value");
        const data = snapshot.val();

        window.customTranslations = data || {};
        console.log("✅ Translations loaded:", window.customTranslations);

        applyCustomTranslations?.();
    } catch (error) {
        console.error("❌ Error loading translations from Firebase:", error);
        window.customTranslations = {};
    }
}

// Apply translations if available, fallback to Google
function applyCustomTranslations() {
    const language = document.documentElement.lang || 'nl';

    if (customTranslations[language]) {
        replaceTextInDocument(customTranslations[language], false);
        document.getElementById("google_translate_element").style.display = "none";
    } else {
        console.warn(`No translations found for ${language}, falling back to Google Translate.`);
        replaceTextInDocument(customTranslations["nl"] || {}, true);
        document.getElementById("google_translate_element").style.display = "block";
        // ❌ Do NOT auto-init Google Translate here
    }
}

// DOM loaded: show popup if language differs
document.addEventListener("DOMContentLoaded", () => {
    const userLang = navigator.language || navigator.userLanguage;
    const pageLang = 'nl';
    const langCode = userLang.slice(0, 2);

    const languageNativeNames = {
        'en': 'English'
    };

    if (langCode !== pageLang) {
        document.getElementById("translate-popup").style.display = "flex";

        // ✅ YES - initialize Translate only when user agrees
        document.getElementById("translate-yes").addEventListener("click", () => {
            document.getElementById("translate-popup").style.display = "none";
            document.getElementById("google_translate_element").style.display = "block";
            googleTranslateElementInit(); // ✅ Initialize
            setTimeout(() => {
                applyTranslation(languageNativeNames[langCode]);
            }, 1000);
        });

        // ✅ NO - completely remove all translate DOM
        document.getElementById("translate-no").addEventListener("click", () => {
            document.getElementById("translate-popup").style.display = "none";

            const iframe = document.querySelector("iframe.goog-te-banner-frame");
            if (iframe) iframe.remove();

            const container = document.getElementById("google_translate_element");
            if (container) container.innerHTML = "";
        });
    }

    loadTranslationsFromFirebase();
    monitorLanguageChange();
});

function monitorLanguageChange() {
    const observer = new MutationObserver(applyCustomTranslations);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}

function applyCustomTranslationsMessageBar(selector = '.add-to-order', targetElement = document.body) {
    const language = document.documentElement.lang || 'nl';
    const targetElements = targetElement.querySelectorAll(selector);

    if (customTranslations[language]) {
        targetElements.forEach(el => {
            replaceTextInDocument(customTranslations[language], false, el);
        });
    }
}

function replaceTextInDocument(dictionary, revert = false, targetElement = document.body) {
    if (!dictionary || typeof dictionary !== 'object') return;

    const sortedDictionary = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length);

    function translateText(text) {
        let translated = text;
        let changed = false;
        for (const [original, translatedStr] of sortedDictionary) {
            const regex = new RegExp(revert ? translatedStr : original, "g");
            if (regex.test(translated)) {
                translated = translated.replace(regex, revert ? original : translatedStr);
                changed = true;
            }
        }
        return { translated, changed };
    }

    function translateElement(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            // ✅ 跳过订单与小票相关的元素，保持原始荷兰语描述
            if (parent && parent.closest('.receipt-details, #receipt-details, .order-item-description, .item-description')) {
                continue;
            }
            if (parent && (parent.getAttribute("translate") === "yes" || !parent.hasAttribute("translate"))) {
                const originalText = node.nodeValue;
                const { translated, changed } = translateText(originalText);
                if (changed && originalText !== translated) {
                    node.nodeValue = translated;
                    if (customTranslations[document.documentElement.lang]) {
                        parent.classList.add("notranslate");
                    }
                }
            }
        }
    }

    translateElement(targetElement);
}

// Auto click Google Translate language
function applyTranslation(languageNativeName) {
    const spanElements = document.querySelectorAll('span');
    const selectLang = Array.from(spanElements).find(span => span.textContent.trim() === "Select Language");

    if (selectLang) {
        selectLang.click();
        setTimeout(() => {
            const observer = new MutationObserver((_, obs) => {
                const updated = document.querySelectorAll('.VIpgJd-ZVi9od-xl07Ob-lTBxed a span');
                const target = Array.from(updated).find(span => span.textContent.includes(languageNativeName));
                if (target) {
                    target.click();
                    document.getElementById("google_translate_element").style.display = "none";
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }, 1000);
    }
}
