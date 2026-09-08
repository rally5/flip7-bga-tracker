/**
 * Flip 7: Vengeance Draw Odds & Player Bust Risk Engine
 * Exact 114 Card Deck Model (91 Number + 3 Itemized Special + 20 Lumped Action)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Deck Definition: Exactly 114 Cards
    // Numbers 1 to 13 = 91 cards
    // Special 0, Special 7, Special 13 = 1 copy each (3 cards)
    // Generic Lumped Action Deck = 20 cards
    // Total = 114 cards
    const CARD_DEFS = [
        // Standard Numbers (91 cards total)
        { id: 'num_1', name: '1', type: 'standard', value: 1, initialCount: 1 },
        { id: 'num_2', name: '2', type: 'standard', value: 2, initialCount: 2 },
        { id: 'num_3', name: '3', type: 'standard', value: 3, initialCount: 3 },
        { id: 'num_4', name: '4', type: 'standard', value: 4, initialCount: 4 },
        { id: 'num_5', name: '5', type: 'standard', value: 5, initialCount: 5 },
        { id: 'num_6', name: '6', type: 'standard', value: 6, initialCount: 6 },
        { id: 'num_7', name: '7', type: 'standard', value: 7, initialCount: 7 },
        { id: 'num_8', name: '8', type: 'standard', value: 8, initialCount: 8 },
        { id: 'num_9', name: '9', type: 'standard', value: 9, initialCount: 9 },
        { id: 'num_10', name: '10', type: 'standard', value: 10, initialCount: 10 },
        { id: 'num_11', name: '11', type: 'standard', value: 11, initialCount: 11 },
        { id: 'num_12', name: '12', type: 'standard', value: 12, initialCount: 12 },
        { id: 'num_13', name: '13', type: 'standard', value: 13, initialCount: 13 },

        // Itemized Special Cards (1 copy each = 3 cards)
        { id: 'spec_0', name: 'Special 0', type: 'special', value: 'S0', initialCount: 1 },
        { id: 'spec_7', name: 'Special 7', type: 'special', value: 'S7', initialCount: 1 },
        { id: 'spec_13', name: 'Special 13', type: 'special', value: 'S13', initialCount: 1 },

        // Generic Lumped Action Cards Deck (20 cards)
        { id: 'action_deck', name: 'Action Cards', type: 'action_lump', value: 'ACT', initialCount: 20 }
    ];

    // State Tracking
    let drawPile = {};
    let discardPile = {};
    let myHand = {}; // Stores counts of cards in player's hand

    // Initialize Game State
    function initGame() {
        CARD_DEFS.forEach(card => {
            drawPile[card.id] = card.initialCount;
            discardPile[card.id] = 0;
            myHand[card.id] = 0;
        });
        updateUI();
        logMessage('Game state initialized. 114 cards restored to draw deck.');
        document.getElementById('reshuffleBanner').classList.add('hidden');
    }

    // Total Draw Pile Count
    function getTotalDrawCount() {
        return Object.values(drawPile).reduce((sum, val) => sum + val, 0);
    }

    // Total Discard Count
    function getTotalDiscardCount() {
        return Object.values(discardPile).reduce((sum, val) => sum + val, 0);
    }

    // Total Cards in My Hand
    function getTotalMyHandCount() {
        return Object.values(myHand).reduce((sum, val) => sum + val, 0);
    }

    // Draw Card by Opponent or Discard (- Draw)
    function drawCardOther(cardId) {
        if (drawPile[cardId] > 0) {
            drawPile[cardId]--;
            discardPile[cardId]++;
            updateUI();
            const cardDef = CARD_DEFS.find(c => c.id === cardId);
            logMessage(`Drawn (Other): ${cardDef.name}. Remaining in pile: ${drawPile[cardId]}`);
            return true;
        }
        return false;
    }

    // Draw Card into My Hand (+ Hand)
    function drawCardToMyHand(cardId) {
        if (drawPile[cardId] > 0) {
            drawPile[cardId]--;
            myHand[cardId]++;
            updateUI();
            const cardDef = CARD_DEFS.find(c => c.id === cardId);
            logMessage(`+ Added to My Hand: ${cardDef.name}. Total in hand: ${myHand[cardId]}`);
            return true;
        }
        return false;
    }

    // Remove Card from My Hand
    function removeCardFromMyHand(cardId) {
        if (myHand[cardId] > 0) {
            myHand[cardId]--;
            discardPile[cardId]++;
            updateUI();
            const cardDef = CARD_DEFS.find(c => c.id === cardId);
            logMessage(`Removed ${cardDef.name} from My Hand to Discard.`);
        }
    }

    // Undo / Restore Card back to Draw Pile
    function restoreCardToDraw(cardId) {
        const cardDef = CARD_DEFS.find(c => c.id === cardId);
        if (drawPile[cardId] < cardDef.initialCount) {
            drawPile[cardId]++;
            if (myHand[cardId] > 0) {
                myHand[cardId]--;
            } else if (discardPile[cardId] > 0) {
                discardPile[cardId]--;
            }
            updateUI();
            logMessage(`Restored ${cardDef.name} back to draw deck.`);
        }
    }

    // Reshuffle Discards into Draw Deck (Active Cards in My Hand stay excluded!)
    function triggerReshuffle() {
        const discardCountBefore = getTotalDiscardCount();
        const myHandCount = getTotalMyHandCount();

        CARD_DEFS.forEach(card => {
            // Draw pile becomes discard pile
            drawPile[card.id] = discardPile[card.id];
            discardPile[card.id] = 0;
            // Cards in myHand remain where they are!
        });

        updateUI();

        const banner = document.getElementById('reshuffleBanner');
        const bannerText = document.getElementById('reshuffleBannerText');
        bannerText.innerHTML = `Shuffled <strong>${discardCountBefore}</strong> discarded cards into draw deck. <strong>${myHandCount}</strong> cards in your hand were excluded.`;
        banner.classList.remove('hidden');

        logMessage(`🔄 RESHUFFLE: ${discardCountBefore} cards added to draw deck. ${myHandCount} cards excluded in hand.`, true);
    }

    // Calculate Player Bust Risk
    function calculatePlayerBustRisk() {
        const totalDraw = getTotalDrawCount();
        if (totalDraw === 0) return 0;

        let bustCountInDrawPile = 0;
        CARD_DEFS.forEach(card => {
            // If player holds this card in hand and it's a number card (or special number card)
            if (myHand[card.id] > 0 && card.type === 'standard') {
                bustCountInDrawPile += drawPile[card.id];
            }
        });

        return (bustCountInDrawPile / totalDraw) * 100;
    }

    // Render Cards Grid
    function renderGrids() {
        const stdContainer = document.getElementById('standardCardsGrid');
        const specContainer = document.getElementById('specialCardsGrid');
        const actContainer = document.getElementById('actionCardsGrid');

        const totalDraw = getTotalDrawCount();

        stdContainer.innerHTML = '';
        specContainer.innerHTML = '';
        actContainer.innerHTML = '';

        CARD_DEFS.forEach(card => {
            const remCount = drawPile[card.id];
            const initCount = card.initialCount;

            // Core Formula: Next-Draw Odds Percentage
            const oddsPercent = totalDraw > 0 ? (remCount / totalDraw) * 100 : 0;
            const oddsFormatted = oddsPercent.toFixed(1) + '%';

            // Determine Odds Badge Color Class
            let oddsClass = 'odds-low';
            if (oddsPercent >= 14.0) {
                oddsClass = card.id === 'num_13' || card.id === 'spec_13' ? 'odds-extreme' : 'odds-high';
            } else if (oddsPercent >= 8.0) {
                oddsClass = 'odds-med';
            }

            const fillWidth = (remCount / initCount) * 100;

            const tile = document.createElement('div');
            let tileTypeClass = '';
            if (card.type === 'special') tileTypeClass = 'special-card';
            if (card.type === 'action_lump') tileTypeClass = 'action-lump-card';

            tile.className = `card-tile ${tileTypeClass}`;
            tile.innerHTML = `
                <div class="card-tile-header">
                    <div class="card-number">${card.name}</div>
                    <div class="draw-odds-badge ${oddsClass}">
                        <span class="odds-label">NEXT DRAW</span>
                        <span>${oddsFormatted}</span>
                    </div>
                </div>
                <div class="card-tile-body">
                    <div class="count-info">
                        <span>Remaining</span>
                        <span class="remaining">${remCount} / ${initCount}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${fillWidth}%; background-color: var(--accent-blue);"></div>
                    </div>
                    <!-- Dual Draw Buttons requested by user -->
                    <div class="card-controls-dual">
                        <button class="btn-card-action btn-draw-other" data-id="${card.id}">- Draw</button>
                        <button class="btn-card-action btn-draw-hand" data-id="${card.id}">+ Hand</button>
                    </div>
                    <div class="card-controls-undo">
                        <button class="btn-undo-small" data-id="${card.id}">Undo +1</button>
                    </div>
                </div>
            `;

            if (card.type === 'standard') {
                stdContainer.appendChild(tile);
            } else if (card.type === 'special') {
                specContainer.appendChild(tile);
            } else {
                actContainer.appendChild(tile);
            }
        });

        // Attach Button Listeners
        document.querySelectorAll('.btn-draw-other').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                drawCardOther(id);
            });
        });

        document.querySelectorAll('.btn-draw-hand').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                drawCardToMyHand(id);
            });
        });

        document.querySelectorAll('.btn-undo-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                restoreCardToDraw(id);
            });
        });
    }

    // Render My Hand Display & Bust Risk
    function renderMyHandAndBustRisk() {
        const container = document.getElementById('myHandCardsContainer');
        container.innerHTML = '';

        let hasCards = false;

        CARD_DEFS.forEach(card => {
            const countInHand = myHand[card.id];
            if (countInHand > 0) {
                hasCards = true;
                for (let i = 0; i < countInHand; i++) {
                    const chip = document.createElement('span');
                    chip.className = 'hand-card-chip';
                    chip.innerHTML = `${card.name} <span class="remove-chip" data-id="${card.id}">&times;</span>`;
                    container.appendChild(chip);
                }
            }
        });

        if (!hasCards) {
            container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">No cards in hand. Click "+ Hand" on any card below to add it.</span>';
        }

        // Attach Remove Hand Chip Listeners
        document.querySelectorAll('.remove-chip').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                removeCardFromMyHand(id);
            });
        });

        // Calculate and Update Bust Risk Value
        const bustRiskPct = calculatePlayerBustRisk();
        const bustValEl = document.getElementById('playerBustVal');
        const bustHintEl = document.getElementById('playerBustHint');

        bustValEl.textContent = bustRiskPct.toFixed(1) + '%';

        if (bustRiskPct > 30.0) {
            bustValEl.style.color = 'var(--odds-high)';
            bustHintEl.textContent = '🔥 High Bust Danger! Drawing now is risky.';
        } else if (bustRiskPct > 15.0) {
            bustValEl.style.color = 'var(--odds-med)';
            bustHintEl.textContent = '⚠️ Moderate Bust Danger.';
        } else {
            bustValEl.style.color = 'var(--odds-low)';
            bustHintEl.textContent = '✅ Safe! Low duplicate probability.';
        }
    }

    // Update Overview Stats
    function updateUI() {
        const totalDraw = getTotalDrawCount();
        const totalDiscard = getTotalDiscardCount();
        const totalMyHand = getTotalMyHandCount();

        document.getElementById('statDrawCount').textContent = totalDraw;
        document.getElementById('statDiscardCount').textContent = totalDiscard;
        document.getElementById('statMyHandCount').textContent = totalMyHand;
        document.getElementById('statDrawPercent').textContent = `${totalDraw} / 114 Cards Remaining`;

        renderGrids();
        renderMyHandAndBustRisk();
    }

    // Log Helper
    function logMessage(text, isHighlight = false) {
        const stream = document.getElementById('logStream');
        const entry = document.createElement('div');
        entry.className = `log-entry ${isHighlight ? 'highlight' : ''}`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        entry.innerHTML = `<span class="timestamp">[${time}]</span> ${text}`;
        stream.prepend(entry);
    }

    // BGA Auto-Sync Log Listener & Server Polling
    const broadcastChannel = new BroadcastChannel('flip7_bga_channel');
    broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (data && data.type === 'BGA_EVENT') {
            handleBgaLogString(data.logText);
        }
    };

    let eventSince = 0;
    function startServerPolling() {
        async function poll() {
            try {
                const res = await fetch('/api/poll?since=' + eventSince);
                if (res.ok) {
                    const data = await res.json();
                    eventSince = data.nextSince;

                    const dot = document.getElementById('bgaDot');
                    const statusText = document.getElementById('bgaStatusText');
                    const statBgaStatus = document.getElementById('statBgaStatus');
                    const statBgaChannel = document.getElementById('statBgaChannel');

                    if (data.connected) {
                        if (dot) dot.className = 'dot connected';
                        if (statusText) statusText.innerHTML = '🟢 BGA Sync Connected (Live)';
                        if (statBgaStatus) {
                            statBgaStatus.textContent = '🟢 Connected';
                            statBgaStatus.style.color = 'var(--odds-low)';
                        }
                        if (statBgaChannel) statBgaChannel.textContent = `BGA Sync Active (Last ping: ${data.lastPingSecAgo}s ago)`;
                    } else {
                        if (dot) dot.className = 'dot waiting';
                        if (statusText) statusText.innerHTML = '🟡 Server Active (Waiting for BGA tab)';
                        if (statBgaStatus) {
                            statBgaStatus.textContent = '🟡 Listener Ready';
                            statBgaStatus.style.color = 'var(--odds-med)';
                        }
                        if (statBgaChannel) statBgaChannel.textContent = 'Waiting for Tampermonkey ping...';
                    }

                    if (data.events && data.events.length > 0) {
                        data.events.forEach(evt => {
                            if (evt.type === 'BGA_EVENT') {
                                handleBgaLogString(evt.logText);
                            }
                        });
                    }
                }
            } catch (err) {
                const dot = document.getElementById('bgaDot');
                const statusText = document.getElementById('bgaStatusText');
                if (dot) dot.className = 'dot offline';
                if (statusText) statusText.innerHTML = '⚪ Local File Mode';
            }
        }

        poll();
        setInterval(poll, 1000);
    }

    startServerPolling();

    function handleBgaLogString(logText) {
        if (!logText) return;
        const lower = logText.toLowerCase();

        // Reshuffle detection
        if (lower.includes('reshuffle') || lower.includes('reshuffled') || lower.includes('shuffled the discard')) {
            triggerReshuffle();
            return;
        }

        // Special Cards
        if (lower.includes('special 13') || lower.includes('13 special')) {
            drawCardOther('spec_13');
            return;
        }
        if (lower.includes('special 7') || lower.includes('7 special')) {
            drawCardOther('spec_7');
            return;
        }
        if (lower.includes('special 0') || lower.includes('0 special')) {
            drawCardOther('spec_0');
            return;
        }

        // Standard Cards (13 down to 1)
        for (let i = 13; i >= 1; i--) {
            const regex = new RegExp(`\\b${i}\\b`);
            if (regex.test(lower) && !lower.includes(`special ${i}`)) {
                drawCardOther(`num_${i}`);
                return;
            }
        }

        // Generic Action Cards (Freeze, Flip 3, Second Chance, Modifier, Action)
        if (lower.includes('action') || lower.includes('freeze') || lower.includes('flip 3') || lower.includes('second chance') || lower.includes('modifier')) {
            drawCardOther('action_deck');
            return;
        }
    }

    // Buttons
    document.getElementById('btnClearHand').addEventListener('click', () => {
        CARD_DEFS.forEach(card => {
            discardPile[card.id] += myHand[card.id];
            myHand[card.id] = 0;
        });
        updateUI();
        logMessage('Cleared My Hand cards into discard pile.');
    });

    document.getElementById('btnResetAll').addEventListener('click', () => {
        if (confirm('Reset 114 card deck and start a new game?')) {
            initGame();
        }
    });

    document.getElementById('btnReshuffle').addEventListener('click', () => {
        triggerReshuffle();
    });

    document.getElementById('btnTestLog').addEventListener('click', () => {
        const input = document.getElementById('inputTestLog');
        const val = input.value.trim();
        if (val) {
            handleBgaLogString(val);
            input.value = '';
        }
    });

    document.getElementById('inputTestLog').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btnTestLog').click();
        }
    });

    // Script Modal
    const scriptModal = document.getElementById('scriptModal');
    document.getElementById('btnScriptModal').addEventListener('click', () => {
        document.getElementById('scriptCodeBlock').textContent = getTampermonkeyScriptCode();
        document.getElementById('bookmarkletCodeBlock').textContent = getBookmarkletCode();
        scriptModal.classList.add('active');
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => {
        scriptModal.classList.remove('active');
    });

    document.getElementById('btnCopyScript').addEventListener('click', () => {
        navigator.clipboard.writeText(getTampermonkeyScriptCode()).then(() => {
            alert('Tampermonkey script copied!');
        });
    });

    function getBookmarkletCode() {
        return `javascript:(function(){const c=new BroadcastChannel('flip7_bga_channel');function p(e){if(!e||e.dataset.t)return;e.dataset.t="1";const t=e.innerText||e.textContent;if(t){c.postMessage({type:'BGA_EVENT',logText:t});fetch('http://localhost:3000/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({logText:t,timestamp:Date.now()})}).catch(()=>{});}}function i(){const l=document.querySelector('#logs')||document.querySelector('#game_logs')||document.body;if(!l){setTimeout(i,1000);return;}new MutationObserver(m=>m.forEach(n=>n.addedNodes.forEach(x=>{if(x.nodeType===1){if(x.classList&&(x.classList.contains('log')||x.classList.contains('roundedbox'))){p(x);}else{const s=x.querySelectorAll?x.querySelectorAll('.log,.roundedbox,.log_line'):[];s.forEach(p);}}}})).observe(l,{childList:true,subtree:true});alert('⚡ Flip 7 Auto-Sync Connected!');}i();})();`;
    }

    function getTampermonkeyScriptCode() {
        return `// ==UserScript==
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

        const text = logElem.innerText || logElem.textContent;
        if (text) {
            console.log('[Flip7 Log Detected]:', text);
            sendToTracker('http://localhost:3000/api/log?text=' + encodeURIComponent(text));
        }
    }

    function initObserver() {
        const logContainer = document.querySelector('#logs') || document.querySelector('#game_logs') || document.body;

        if (!logContainer) {
            setTimeout(initObserver, 1000);
            return;
        }

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
})();`;
    }

    // Start App
    initGame();
});
