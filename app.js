// Flashcard data (loaded from JSON)
let flashcards = [];
let allFlashcards = []; // Keep original unfiltered list
let filteredFlashcards = []; // Current filtered list

// Debug: Log that script is loaded
console.log('✓ app.js script loaded');
console.log('Current URL:', window.location.href);
console.log('Protocol:', window.location.protocol);

// Mark script as loaded
if (typeof window !== 'undefined') {
    window.appScriptLoaded = true;
    window.appScriptLoading = false;
}

// App state
let currentCardIndex = 0;
let isFlipped = false;
let notesExpanded = false;
let currentFilter = 'all'; // 'all', 'critical', 'non-critical'
let isTogglingCritical = false; // Flag to prevent re-entrancy in toggleCritical

// DOM elements - will be initialized after DOM is ready
let flashcard, questionText, answerText, answerButton, prevButton, nextButton;
let shuffleButton, cardCounter, notesToggleButton, notesContent;
let notesTextarea, notesSaveButton, notesClearButton, notesDisplay, notesText;
let criticalButton, filterSelect, flashcardButtonsContainer;

// Initialize DOM elements
function initDOMElements() {
    flashcard = document.getElementById('flashcard');
    questionText = document.getElementById('question-text');
    answerText = document.getElementById('answer-text');
    answerButton = document.getElementById('answer-button');
    prevButton = document.getElementById('prev-button');
    nextButton = document.getElementById('next-button');
    shuffleButton = document.getElementById('shuffle-button');
    cardCounter = document.getElementById('card-counter');
    
    // Notes DOM elements
    notesToggleButton = document.getElementById('notes-toggle-button');
    notesContent = document.getElementById('notes-content');
    notesTextarea = document.getElementById('notes-textarea');
    notesSaveButton = document.getElementById('notes-save-button');
    notesClearButton = document.getElementById('notes-clear-button');
    notesDisplay = document.getElementById('notes-display');
    notesText = document.getElementById('notes-text');
    
    // Critical DOM elements
    criticalButton = document.getElementById('critical-button');
    
    // Filter DOM elements
    filterSelect = document.getElementById('filter-select');
    flashcardButtonsContainer = document.querySelector('.flashcard-buttons');
    
    // Verify critical elements
    if (!questionText || !answerText) {
        console.error('Critical DOM elements not found!');
        return false;
    }
    return true;
}

// Load flashcards from JSON file
async function loadFlashcards() {
    // Ensure DOM elements are available
    if (!questionText || !answerText) {
        console.error('DOM elements not found. Retrying...');
        setTimeout(loadFlashcards, 100);
        return;
    }
    
    // Show loading state - this updates the text so fallback doesn't trigger
    if (questionText) {
        questionText.innerHTML = 'Loading flashcards...';
        questionText.style.color = '';
    }
    if (answerText) {
        answerText.innerHTML = 'Please wait...';
        answerText.style.color = '';
    }
    
    try {
        // Add cache-busting parameter to ensure latest version is loaded
        const cacheBuster = new Date().getTime();
        const jsonUrl = `questions-answers.json?v=${cacheBuster}`;
        
        console.log('Attempting to fetch:', jsonUrl);
        console.log('Current URL:', window.location.href);
        
        let response;
        try {
            // Try relative path first
            response = await fetch(jsonUrl, {
                cache: 'no-store'
            });
            console.log('Fetch response status:', response.status);
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            // Show error immediately
            if (questionText) {
                questionText.innerHTML = `Fetch Error: ${fetchError.message}`;
            }
            if (answerText) {
                answerText.innerHTML = 'Check console and ensure server is running';
            }
            throw fetchError;
        }
        
        if (!response.ok) {
            const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            console.error('Response not OK:', errorMsg);
            if (questionText) {
                questionText.innerHTML = `Error: ${errorMsg}`;
            }
            if (answerText) {
                answerText.innerHTML = 'Make sure questions-answers.json exists';
            }
            throw new Error(errorMsg);
        }
        
        const loadedFlashcards = await response.json();
        console.log('JSON parsed, got', loadedFlashcards?.length || 0, 'items');
        
        // Validate loaded data
        if (!Array.isArray(loadedFlashcards)) {
            const errorMsg = 'Invalid data: not an array';
            console.error(errorMsg, typeof loadedFlashcards);
            if (questionText) {
                questionText.innerHTML = `Error: ${errorMsg}`;
            }
            if (answerText) {
                answerText.innerHTML = 'JSON file format is incorrect';
            }
            throw new Error(errorMsg);
        }
        
        if (loadedFlashcards.length === 0) {
            const errorMsg = 'No flashcards in file';
            console.error(errorMsg);
            if (questionText) {
                questionText.innerHTML = `Error: ${errorMsg}`;
            }
            if (answerText) {
                answerText.innerHTML = 'The JSON file is empty';
            }
            throw new Error(errorMsg);
        }
        
        allFlashcards = loadedFlashcards;
        flashcards = loadedFlashcards;
        filteredFlashcards = loadedFlashcards;
        
        // Log for debugging
        console.log(`✓ Successfully loaded ${flashcards.length} flashcards`);
        
        // Initialize the app after loading
        await init();
    } catch (error) {
        console.error('Error loading flashcards:', error);
        const errorMsg = error.message || 'Unknown error';
        if (questionText) {
            questionText.innerHTML = `Error: ${errorMsg}`;
            questionText.style.color = 'red';
        }
        if (answerText) {
            answerText.innerHTML = `URL: ${window.location.href}<br>Use: python3 -m http.server 8000`;
            answerText.style.color = 'red';
        }
    }
}

// Initialize the app
async function init() {
    if (flashcards.length === 0) {
        questionText.innerHTML = "No flashcards available";
        answerText.innerHTML = "No flashcards available";
        return;
    }
    
    await renderCard();
    updateNavigationButtons();
    updateCounter();
    updateAnswerButton();
    updateFilterSelect();
    await updateCriticalFilterOption();
    await updateFilterCounts();
}

// Convert URLs in text to clickable links
function convertUrlsToLinks(text) {
    if (!text) return '';
    
    // URL regex pattern: matches http://, https://, and www. URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    
    // Escape HTML in text first to prevent XSS, but preserve newlines
    let escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Replace URLs with clickable links
    return escapedText.replace(urlRegex, (match) => {
        // Ensure URL has protocol
        let url = match;
        if (match.toLowerCase().startsWith('www.')) {
            url = 'https://' + match;
        }
        
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });
}

// Render the current card
async function renderCard() {
    // Safety check: ensure we have cards and valid index
    if (!filteredFlashcards || filteredFlashcards.length === 0) {
        console.error('No flashcards available to render');
        questionText.innerHTML = "No flashcards available";
        answerText.innerHTML = "No flashcards available";
        return;
    }
    
    // Ensure index is within bounds
    if (currentCardIndex < 0 || currentCardIndex >= filteredFlashcards.length) {
        currentCardIndex = 0;
    }
    
    const card = filteredFlashcards[currentCardIndex];
    if (!card) {
        console.error('Card not found at index:', currentCardIndex);
        questionText.innerHTML = "Card not found";
        answerText.innerHTML = "Card not found";
        return;
    }
    
    // Convert question text and make URLs clickable
    const questionHtml = convertUrlsToLinks(card.question);
    questionText.innerHTML = questionHtml;
    
    // Display all answers (join multiple answers with newlines or bullets)
    if (card.answers && card.answers.length > 0) {
        // If multiple answers, display them as a bulleted list
        if (card.answers.length === 1) {
            const answerHtml = convertUrlsToLinks(card.answers[0]);
            answerText.innerHTML = answerHtml;
        } else {
            // Format multiple answers with bullet points
            const answersHtml = card.answers.map(answer => {
                const linkified = convertUrlsToLinks(answer);
                return `• ${linkified}`;
            }).join('<br>');
            answerText.innerHTML = answersHtml;
        }
    } else {
        answerText.textContent = "No answer available";
    }
    
    // Reset to question side when navigating
    if (isFlipped) {
        flipCard();
    }
    
    // Load notes for the current card
    await loadNotesForCurrentCard();
    
    // Load critical state (button is always visible)
    await loadCriticalState();
}

// Flip the card
function flipCard() {
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped', isFlipped);
    updateAnswerButton();
}

// Show answer (toggle between question and answer)
function showAnswer() {
    flipCard();
}

// Update answer button text based on flip state
function updateAnswerButton() {
    if (isFlipped) {
        answerButton.textContent = "Show Question";
    } else {
        answerButton.textContent = "Show Answer";
    }
    // Always load critical state (button is always visible)
    loadCriticalState();
}

// Navigate to previous card
async function goToPrevious() {
    if (currentCardIndex > 0) {
        // Save current card's note before navigating
        await saveCurrentNote();
        currentCardIndex--;
        await renderCard();
        updateNavigationButtons();
        updateCounter();
    }
}

// Navigate to next card
async function goToNext() {
    if (currentCardIndex < filteredFlashcards.length - 1) {
        // Save current card's note before navigating
        await saveCurrentNote();
        currentCardIndex++;
        await renderCard();
        updateNavigationButtons();
        updateCounter();
    }
}

// Update navigation buttons state
function updateNavigationButtons() {
    prevButton.disabled = currentCardIndex === 0;
    nextButton.disabled = currentCardIndex === filteredFlashcards.length - 1;
}

// Update card counter
function updateCounter() {
    cardCounter.textContent = `${currentCardIndex + 1} / ${filteredFlashcards.length}`;
}

// Shuffle flashcards using Fisher-Yates algorithm
async function shuffleFlashcards() {
    // Save current card's note before shuffling
    await saveCurrentNote();
    
    // Create a copy of the filtered array to avoid mutating the original
    const shuffled = [...filteredFlashcards];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    filteredFlashcards = shuffled;
    
    // Reset to first card and question side
    currentCardIndex = 0;
    if (isFlipped) {
        flipCard();
    }
    
    // Re-render the card
    await renderCard();
    updateNavigationButtons();
    updateCounter();
}

// IndexedDB functionality
const DB_NAME = 'FlashcardsDB';
const DB_VERSION = 2; // Incremented to add critical store
const STORE_NAME = 'notes';
const CRITICAL_STORE_NAME = 'critical';

// Open IndexedDB database
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create notes object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'cardId' });
                objectStore.createIndex('cardId', 'cardId', { unique: true });
            }
            // Create critical object store if it doesn't exist
            if (!db.objectStoreNames.contains(CRITICAL_STORE_NAME)) {
                const criticalStore = db.createObjectStore(CRITICAL_STORE_NAME, { keyPath: 'cardId' });
                criticalStore.createIndex('cardId', 'cardId', { unique: true });
            }
        };
    });
}

// Get note from IndexedDB
async function getNote(cardId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(cardId);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.note : null);
            };
        });
    } catch (error) {
        console.error('Error getting note from IndexedDB:', error);
        return null;
    }
}

// Save note to IndexedDB
async function saveNote(cardId, note) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            if (note && note.trim()) {
                const data = { cardId: cardId, note: note.trim() };
                const request = store.put(data);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            } else {
                // Delete if note is empty
                const request = store.delete(cardId);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            }
        });
    } catch (error) {
        console.error('Error saving note to IndexedDB:', error);
    }
}

// Delete note from IndexedDB
async function deleteNote(cardId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(cardId);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('Error deleting note from IndexedDB:', error);
    }
}

// Notes functionality
async function loadNotesForCurrentCard() {
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) return;
    
    try {
        const savedNote = await getNote(card.id);
        
        if (savedNote) {
            notesTextarea.value = savedNote;
            notesText.textContent = savedNote;
            notesDisplay.style.display = 'block';
        } else {
            notesTextarea.value = '';
            notesText.textContent = '';
            notesDisplay.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading note:', error);
    }
}

async function saveCurrentNote() {
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) return;
    
    const note = notesTextarea.value.trim();
    
    try {
        await saveNote(card.id, note);
        
        if (note) {
            notesText.textContent = note;
            notesDisplay.style.display = 'block';
        } else {
            notesText.textContent = '';
            notesDisplay.style.display = 'none';
        }
    } catch (error) {
        console.error('Error saving note:', error);
    }
}

async function clearCurrentNote() {
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) return;
    
    notesTextarea.value = '';
    
    try {
        await deleteNote(card.id);
        notesText.textContent = '';
        notesDisplay.style.display = 'none';
    } catch (error) {
        console.error('Error clearing note:', error);
    }
}

function toggleNotesSection() {
    notesExpanded = !notesExpanded;
    if (notesExpanded) {
        notesContent.style.display = 'block';
    } else {
        notesContent.style.display = 'none';
    }
}

// Critical cards functionality
async function isCardCritical(cardId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CRITICAL_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CRITICAL_STORE_NAME);
            const request = store.get(cardId);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result !== undefined);
            };
        });
    } catch (error) {
        console.error('Error checking critical state:', error);
        return false;
    }
}

async function markCardAsCritical(cardId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CRITICAL_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CRITICAL_STORE_NAME);
            const data = { cardId: cardId, markedAt: new Date().toISOString() };
            const request = store.put(data);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('Error marking card as critical:', error);
    }
}

async function unmarkCardAsCritical(cardId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CRITICAL_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CRITICAL_STORE_NAME);
            const request = store.delete(cardId);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('Error unmarking card as critical:', error);
    }
}

async function loadCriticalState() {
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) return;
    
    try {
        const isCritical = await isCardCritical(card.id);
        updateCriticalButton(isCritical);
    } catch (error) {
        console.error('Error loading critical state:', error);
    }
}

function updateCriticalButton(isCritical) {
    if (isCritical) {
        criticalButton.classList.add('marked');
    } else {
        criticalButton.classList.remove('marked');
    }
}

async function toggleCritical() {
    // Lock to prevent concurrent executions
    if (isTogglingCritical) {
        return;
    }
    isTogglingCritical = true;
    
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) {
        isTogglingCritical = false;
        return;
    }
    
    // Save the current card ID and index BEFORE any async operations
    const currentCardId = card.id;
    const savedIndex = currentCardIndex;
    
    try {
        const isCritical = await isCardCritical(card.id);
        if (isCritical) {
            await unmarkCardAsCritical(card.id);
            updateCriticalButton(false);
        } else {
            await markCardAsCritical(card.id);
            updateCriticalButton(true);
        }
        
        // CRITICAL: Restore the saved index immediately after toggle
        // Always restore to the exact same index - the card should still be there
        // since we're not re-applying the filter
        currentCardIndex = savedIndex;
        
        // Safety check: ensure index is within bounds
        if (currentCardIndex >= filteredFlashcards.length) {
            currentCardIndex = Math.max(0, filteredFlashcards.length - 1);
        }
        
        // Double-check: verify the card at this index is still the same
        const cardAtIndex = filteredFlashcards[currentCardIndex];
        if (!cardAtIndex || cardAtIndex.id !== currentCardId) {
            // If card changed (shouldn't happen), find it in the list
            const cardIndex = filteredFlashcards.findIndex(c => c.id === currentCardId);
            if (cardIndex !== -1) {
                currentCardIndex = cardIndex;
            } else {
                // Last resort: restore saved index even if out of bounds
                currentCardIndex = savedIndex;
            }
        }
        
        // Update filter option availability and counts after toggling
        await updateCriticalFilterOption();
        await updateFilterCounts();
        
        // Don't re-apply filter - keep the current card visible
        // Don't call renderCard - it will reset the card to question side
    } catch (error) {
        console.error('Error toggling critical state:', error);
        // Restore index on error
        currentCardIndex = savedIndex;
        if (currentCardIndex >= filteredFlashcards.length) {
            currentCardIndex = Math.max(0, filteredFlashcards.length - 1);
        }
    } finally {
        isTogglingCritical = false;
    }
}

// Filter functionality
async function applyFilter(filterType) {
    currentFilter = filterType;
    
    // Save current note before filtering
    await saveCurrentNote();
    
    if (filterType === 'all') {
        filteredFlashcards = [...allFlashcards];
    } else {
        // Get all critical card IDs
        const criticalCardIds = new Set();
        try {
            const db = await openDB();
            const transaction = db.transaction([CRITICAL_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CRITICAL_STORE_NAME);
            const request = store.getAll();
            
            await new Promise((resolve, reject) => {
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    request.result.forEach(item => criticalCardIds.add(item.cardId));
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error getting critical cards:', error);
        }
        
        if (filterType === 'critical') {
            filteredFlashcards = allFlashcards.filter(card => criticalCardIds.has(card.id));
        } else if (filterType === 'non-critical') {
            filteredFlashcards = allFlashcards.filter(card => !criticalCardIds.has(card.id));
        }
    }
    
    // Reset to first card
    currentCardIndex = 0;
    if (isFlipped) {
        flipCard();
    }
    
    // Update UI
    await renderCard();
    updateNavigationButtons();
    updateCounter();
    updateFilterSelect();
    await updateCriticalFilterOption();
    await updateFilterCounts();
}

async function hasCriticalCards() {
    try {
        const db = await openDB();
        const transaction = db.transaction([CRITICAL_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CRITICAL_STORE_NAME);
        const request = store.count();
        
        return new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result > 0);
            };
        });
    } catch (error) {
        console.error('Error checking critical cards:', error);
        return false;
    }
}

function updateFilterSelect() {
    filterSelect.value = currentFilter;
    updateFilterCounts();
}

async function updateFilterCounts() {
    // Get all critical card IDs
    const criticalCardIds = new Set();
    try {
        const db = await openDB();
        const transaction = db.transaction([CRITICAL_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CRITICAL_STORE_NAME);
        const request = store.getAll();
        
        await new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                request.result.forEach(item => criticalCardIds.add(item.cardId));
                resolve();
            };
        });
    } catch (error) {
        console.error('Error getting critical cards for counts:', error);
    }
    
    // Calculate counts
    const totalCount = allFlashcards.length;
    const criticalCount = allFlashcards.filter(card => criticalCardIds.has(card.id)).length;
    const nonCriticalCount = totalCount - criticalCount;
    
    // Update option texts
    const filterAll = document.getElementById('filter-all');
    const filterCritical = document.getElementById('filter-critical');
    const filterNonCritical = document.getElementById('filter-non-critical');
    
    if (filterAll) {
        filterAll.textContent = `All Questions (${totalCount})`;
    }
    if (filterCritical) {
        filterCritical.textContent = `Only Red (${criticalCount})`;
    }
    if (filterNonCritical) {
        filterNonCritical.textContent = `Only Green (${nonCriticalCount})`;
    }
}

async function updateCriticalFilterOption() {
    const hasCritical = await hasCriticalCards();
    const criticalOption = filterSelect.querySelector('option[value="critical"]');
    
    if (criticalOption) {
        if (!hasCritical) {
            // Disable the option if there are no critical cards
            criticalOption.disabled = true;
            
            // If currently on "Only Red" filter and there are no red cards, switch to "All Questions"
            if (currentFilter === 'critical') {
                currentFilter = 'all';
                filterSelect.value = 'all';
                await applyFilter('all');
            }
        } else {
            // Enable the option if there are critical cards
            criticalOption.disabled = false;
        }
    }
}

// Event listeners
function shouldFlipCard(e) {
    // Don't flip if clicking/touching on buttons or button containers
    if (e.target.closest('.flashcard-buttons') || 
        e.target.closest('button') || 
        e.target.closest('.answer-navigation-wrapper') ||
        e.target.closest('.filter-section') ||
        e.target.closest('.card-counter')) {
        return false;
    }
    return true;
}

// Critical event listeners - handle both click and touch events
let criticalButtonTouchHandled = false;
// isTogglingCritical is declared at the top level to prevent re-entrancy

// Prevent any events from the button container from bubbling
// This will be set up after DOM is ready
function setupButtonContainerEvents() {
    if (flashcardButtonsContainer) {
        flashcardButtonsContainer.addEventListener('click', (e) => e.stopPropagation());
        flashcardButtonsContainer.addEventListener('touchstart', (e) => e.stopPropagation());
        flashcardButtonsContainer.addEventListener('touchend', (e) => e.stopPropagation());
    }
}

// Setup all event listeners - called after DOM is ready
function setupEventListeners() {
    if (!flashcard || !answerButton || !prevButton || !nextButton || !shuffleButton) {
        console.error('Cannot setup event listeners - DOM elements not ready');
        return;
    }
    
    // Flashcard flip events
    flashcard.addEventListener('click', (e) => {
        if (shouldFlipCard(e)) {
            flipCard();
        }
    });

    // Handle touch events for mobile
    flashcard.addEventListener('touchend', (e) => {
        if (shouldFlipCard(e)) {
            e.preventDefault();
            flipCard();
        }
    });
    
    // Navigation buttons
    answerButton.addEventListener('click', showAnswer);
    prevButton.addEventListener('click', goToPrevious);
    nextButton.addEventListener('click', goToNext);
    shuffleButton.addEventListener('click', shuffleFlashcards);

    // Notes event listeners
    if (notesToggleButton) {
        notesToggleButton.addEventListener('click', toggleNotesSection);
    }
    if (notesSaveButton) {
        notesSaveButton.addEventListener('click', saveCurrentNote);
    }
    if (notesClearButton) {
        notesClearButton.addEventListener('click', clearCurrentNote);
    }

    // Critical button events
    if (criticalButton) {
        criticalButton.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        criticalButton.addEventListener('touchend', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            criticalButtonTouchHandled = true;
            await toggleCritical();
            // Reset after a short delay to allow click event to be ignored
            setTimeout(() => {
                criticalButtonTouchHandled = false;
            }, 300);
        });

        criticalButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Ignore click if it was already handled by touch event (mobile)
            if (!criticalButtonTouchHandled) {
                await toggleCritical();
            }
        });
    }

    // Filter event listeners
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            applyFilter(e.target.value);
        });
    }

    // Prevent card flip when clicking buttons (event bubbling)
    answerButton.addEventListener('click', (e) => e.stopPropagation());
    prevButton.addEventListener('click', (e) => e.stopPropagation());
    nextButton.addEventListener('click', (e) => e.stopPropagation());
    shuffleButton.addEventListener('click', (e) => e.stopPropagation());
    if (notesToggleButton) notesToggleButton.addEventListener('click', (e) => e.stopPropagation());
    if (notesSaveButton) notesSaveButton.addEventListener('click', (e) => e.stopPropagation());
    if (notesClearButton) notesClearButton.addEventListener('click', (e) => e.stopPropagation());
    if (notesTextarea) notesTextarea.addEventListener('click', (e) => e.stopPropagation());
    if (filterSelect) filterSelect.addEventListener('click', (e) => e.stopPropagation());

    // Prevent card flip when clicking links inside cards
    if (questionText) {
        questionText.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.stopPropagation();
            }
        });
    }
    if (answerText) {
        answerText.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.stopPropagation();
            }
        });
    }
}

// Initialize when DOM is ready
function startApp() {
    console.log('Starting app initialization...');
    
    // Mark that app is initializing (prevents fallback message)
    if (typeof window !== 'undefined') {
        window.appInitializing = true;
    }
    
    // Initialize DOM elements first
    if (!initDOMElements()) {
        console.error('Failed to initialize DOM elements. Retrying...');
        setTimeout(startApp, 100);
        return;
    }
    
    console.log('✓ DOM elements initialized');
    
    // Update loading text immediately to prevent fallback message
    if (questionText) {
        questionText.innerHTML = 'Initializing...';
        questionText.style.color = '';
    }
    
    // Setup button container events
    setupButtonContainerEvents();
    
    // Setup all event listeners
    setupEventListeners();
    
    console.log('✓ Event listeners setup complete');
    console.log('Loading flashcards...');
    loadFlashcards().catch(error => {
        console.error('Failed to load flashcards:', error);
        if (questionText) {
            questionText.innerHTML = `Error: ${error.message || 'Failed to load'}`;
            questionText.style.color = 'red';
        }
        if (answerText) {
            answerText.innerHTML = 'Check console for details';
            answerText.style.color = 'red';
        }
    });
}

// Simple initialization - same for desktop and mobile
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // DOM already loaded
    startApp();
}

