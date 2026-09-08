// ==UserScript==
// @name         BGA Flip 7 Vengeance Card Tracker Auto Sync
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-syncs flipped cards from Board Game Arena to Flip 7 Vengeance Odds Tracker
// @author       Antigravity
// @match        https://*.boardgamearena.com/*
// @match        http://*.boardgamearena.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=boardgamearena.com
// @connect      localhost
// @connect      127.0.0.1
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Flip7 Auto-Sync] Script loaded on BGA');

    function sendToTracker(url) {
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onerror: function(e) { console.log('[Flip7 Sync Error]', e); }
            });
        }
    }

    function processLogElement(logElem) {
        if (!logElem || logElem.dataset.tracked) return;
        logElem.dataset.tracked = "true";

        // BGA often uses images or CSS classes for cards, so innerText is missing the numbers.
        // We will send the innerHTML so the app can parse the HTML tags directly!
        const text = logElem.innerHTML || logElem.innerText || logElem.textContent;
        if (text) {
            console.log('[Flip7 Log HTML Detected]:', text);
            sendToTracker('http://localhost:3000/api/log?text=' + encodeURIComponent(text));
        }
    }

    function initObserver() {
        const logContainer = document.querySelector('#logs') || document.querySelector('#game_logs') || document.body;

        if (!logContainer) {
            setTimeout(initObserver, 1000);
            return;
        }

        // Send connection heartbeat ping every 3s
        setInterval(function() {
            sendToTracker('http://localhost:3000/api/ping');
        }, 3000);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.classList && (node.classList.contains('log') || node.classList.contains('roundedbox'))) {
                            processLogElement(node);
                        } else {
                            const subLogs = node.querySelectorAll ? node.querySelectorAll('.log, .roundedbox, .log_line') : [];
                            subLogs.forEach(processLogElement);
                        }
                    }
                });
            });
        });

        observer.observe(logContainer, { childList: true, subtree: true });
        console.log('[Flip7 Auto-Sync] Observer attached to BGA logs container.');
    }

    if (document.readyState === 'complete') {
        initObserver();
    } else {
        window.addEventListener('load', initObserver);
    }
})();
