// i18n.js
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');

// Initialize i18next with file backend & language detector
i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
        debug: false,
        fallbackLng: 'it', // fallback language
        backend: {
            // path where resources get loaded from
            loadPath: path.join(__dirname, '../locales/{{lng}}.json'),
        },
        detection: {
            // Options for language detection (optional)
            order: ['querystring', 'cookie', 'header'],
            caches: ['cookie']
        },
        // You can enable debug for development to see logs
        // keySeparator: false, // Set to false if your keys contain dots and you want to disable key based nesting
        // ns: ['admin'], // You can define multiple namespaces if you wish
    });

module.exports = i18next;
