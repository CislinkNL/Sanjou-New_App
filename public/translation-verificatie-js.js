// translation-verificatie-js.js
// translation script: Firebase configuration
const FIREBASE_URL = "https://cislink-default-rtdb.europe-west1.firebasedatabase.app";  // Replace with your Firebase URL
const FIREBASE_SECRET = "LXJknPDcIrdVSwuNX9jx2MrtflVnHSCoYR4u0dOl"; // Replace with your Firebase secret
// Global initialization for Google Translate
          function googleTranslateElementInit() {
          new google.translate.TranslateElement({
            pageLanguage: 'zh-CN',
            includedLanguages: 'en,nl',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
    
        }

// Initialize `customTranslations` as an empty object
let customTranslations = {};

// Function to load translations from Firebase and populate `customTranslations`
async function loadTranslationsFromFirebase() {
  await waitForAppConfig(); // 确保 AppConfig 可用

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

    applyCustomTranslations?.(); // 调用翻译应用函数（如果存在）

  } catch (error) {
    console.error("❌ Error loading translations from Firebase:", error);
    window.customTranslations = {};
  }
}


// Function to apply custom translation based on language settings or fallback to Google Translate
function applyCustomTranslations() {
    const language = document.documentElement.lang || 'zh'; // Default to Simplified Chinese
    let customTranslationApplied = false;

    // Check if translations for the selected language exist in `customTranslations`
    if (customTranslations[language]) {
        replaceTextInDocument(customTranslations[language], false); // Custom translations applied
        customTranslationApplied = true;
        document.getElementById("google_translate_element").style.display = "none"; // Hide Google Translate if custom translations are applied
    } else {
        console.warn(`No translations found for language: ${language}. Using fallback or automatic translation.`);
        replaceTextInDocument(customTranslations["zh"] || {}, true); // Fallback to Simplified Chinese or empty

        // Show Google Translate if custom translations weren't applied
        document.getElementById("google_translate_element").style.display = "block";
        googleTranslateElementInit(); // Initialize Google Translate as fallback
    }
}

// Modify applyCustomTranslations to accept a selector for specific elements with a class, like `.your-button-class`
// Main function to apply custom translations based on a selector within a target element
function applyCustomTranslationsMessageBar(selector = '.add-to-order', targetElement = document.body) {
    const language = document.documentElement.lang || 'zh'; // Default to Simplified Chinese

    // Select only elements matching the selector within the target element
    const targetElements = targetElement.querySelectorAll(selector);

    // Check if translations for the selected language exist in `customTranslations`
    if (customTranslations[language]) {
        targetElements.forEach(element => {
            replaceTextInDocument(customTranslations[language], false, element);
        });
    } else {
        console.warn(`No translations found for language: ${language}.`);
    }
}

// Helper function to replace text in the specified element with custom translations
function replaceTextInDocument(dictionary, revert = false, targetElement) {
    if (!dictionary || typeof dictionary !== 'object') {
        console.warn("No dictionary provided for translation.");
        return;
    }

    const text = targetElement.textContent;
    Object.keys(dictionary).forEach(original => {
        const translation = dictionary[original];
        const regex = new RegExp(revert ? translation : original, "g");
        targetElement.textContent = text.replace(regex, revert ? original : translation);
    });
}



// Run once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    const userLang = navigator.language || navigator.userLanguage;
    const pageLang = 'zh-CN'; // Target language for the page

const languageNativeNames = {
    'en': 'English',
    'zh': '中文（简体）', // Simplified Chinese
    'zh-TW': '中文（繁體）', // Traditional Chinese
    'nl': 'Nederlands', // Dutch
    'de': 'Deutsch', // German
    'fr': 'français'
};

    const langCode = userLang.slice(0, 2); // Extract primary language code (e.g., "nl" for Dutch)



    // Load translations from Firebase and apply them
    loadTranslationsFromFirebase();
    monitorLanguageChange(); // Start observing for language changes
});

// Helper function to observe <html> for language changes to trigger translation
function monitorLanguageChange() {
    const observer = new MutationObserver(applyCustomTranslations);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    
}








function replaceTextInDocument(dictionary, revert = false, targetElement = document.body) {
    if (!dictionary || typeof dictionary !== 'object') {
        console.warn("No dictionary provided for translation.");
        return;
    }

    // Sort dictionary entries by phrase length in descending order (longer phrases first)
    const sortedDictionary = Object.entries(dictionary).sort(
        ([a], [b]) => b.length - a.length
    );

    // Helper function to translate text and track if a change was made
    function translateText(text) {
        let translatedText = text;
        let wasTranslated = false;

        for (const [original, translation] of sortedDictionary) {
            const regex = new RegExp(revert ? translation : original, "g");
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, revert ? original : translation);
                wasTranslated = true;
            }
        }
        return { translatedText, wasTranslated };
    }

    // Translate each text node only if the parent element has `translate="yes"`
    function translateElement(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;

        while ((node = walker.nextNode())) {
            const parent = node.parentElement;

            // Only process elements with `translate="yes"` or no `translate` attribute at all
            if (parent && (parent.getAttribute("translate") === "yes" || !parent.hasAttribute("translate"))) {
                const originalText = node.nodeValue;
                const { translatedText, wasTranslated } = translateText(originalText);

                // Update the node only if a translation occurred and the text has changed
                if (wasTranslated && originalText !== translatedText) {
                    node.nodeValue = translatedText;
                    if (customTranslations[document.documentElement.lang]) {
                        parent.classList.add("notranslate"); // Only mark as 'notranslate' if custom translation applied
                    }
                }
            }
        }
    }

    // Apply translations to the specified target element and its children
    translateElement(targetElement);
}


// Function to apply translation in Google Translate widget
function applyTranslation(languageNativeName) {
    const spanElements = document.querySelectorAll('span');
    const selectLanguageElement = Array.from(spanElements).find(
        span => span.textContent.trim() === "Select Language"
    );

    if (selectLanguageElement) {
        selectLanguageElement.click(); // Open the dropdown
        console.log("Dropdown opened for language selection:", languageNativeName);

        setTimeout(() => {
            const observer = new MutationObserver((mutations, obs) => {
                const updatedSpanElements = document.querySelectorAll('.VIpgJd-ZVi9od-xl07Ob-lTBxed a span');
                if (updatedSpanElements) {
                    const targetLang = Array.from(updatedSpanElements).find(
                        span => span.textContent.trim().includes(languageNativeName)
                    );

                    if (targetLang) {
                        targetLang.click(); // Select the target language
                        document.getElementById("google_translate_element").style.display = "none"; // Hide translate element 
                        obs.disconnect(); // Stop observing once the language is selected
                    } else {
                        console.log("Waiting for target language to load:", languageNativeName);
                    }
                } else {
                    console.warn("Updated span elements for language selection not found.");
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }, 1000);
    } else {
        console.warn("Select Language element not found.");
    }
}
