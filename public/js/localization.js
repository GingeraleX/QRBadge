/**
 * localization.js
 * Manages i18next initialization and page translation.
 */

// Step 1: load translations for the given lang
async function loadTranslations(lang) {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
        console.error(`Could not load /locales/${lang}.json`);
        return {};
    }
    // Return the JSON content
    return response.json();
}

// Step 2: initialize i18next with fetched resources
async function initLocalization() {
    const userLang = localStorage.getItem('lang') || 'it';
    const translationData = await loadTranslations(userLang);

    // i18next expects an object of shape:
    // {
    //   en: {
    //     translation: { ... }
    //   }
    // }
    // So we build that structure here:
    const resources = {};
    resources[userLang] = {
        translation: translationData
    };

    // Initialize i18next
    i18next.init({
        lng: userLang,
        debug: false, // set to true for debugging
        resources: resources
    }, function(err, t) {
        if (err) {
            console.error("i18next init error:", err);
        } else {
            // Once i18next is ready, translate the static elements
            applyTranslations();
        }
    });
}

// Step 3: Translate static elements on the page
function applyTranslations() {
    // Translate any elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.innerText = i18next.t(key);
    });

    // Translate placeholders if needed
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = i18next.t(key);
    });
}

// Step 4: function to change language on the fly
async function changeLocale(newLang) {
    localStorage.setItem('lang', newLang);
    await initLocalization();  // Re-initialize with the new language
}

function syncLanguage() {
    // 1) Check localStorage for saved language
    const savedLang = localStorage.getItem("lang");
    const defaultLang = "it";  // or "it", or whatever you want as fallback

    // 2) Apply the language logic
    //    If we do "changeLocale(...)" here, it will load and apply translations.
    if (savedLang) {
        changeLocale(savedLang);
    } else {
        changeLocale(defaultLang);
    }

    // 3) Update all <select> elements that use the language selection
    const langSelects = document.querySelectorAll("select[onchange='changeLocale(this.value)']");
    langSelects.forEach((selectEl) => {
        // If we have a saved language, use that; otherwise use default
        selectEl.value = savedLang || defaultLang;
    });
}
