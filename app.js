// Flashcard data (loaded from JSON)
let flashcards = [];
let allFlashcards = []; // Keep original unfiltered list
let filteredFlashcards = []; // Current filtered list

// App state
let currentCardIndex = 0;
let isFlipped = false;
let notesExpanded = false;
let currentFilter = 'all'; // 'all', 'critical', 'non-critical'

// DOM elements
const flashcard = document.getElementById('flashcard');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const answerButton = document.getElementById('answer-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const shuffleButton = document.getElementById('shuffle-button');
const cardCounter = document.getElementById('card-counter');

// Notes DOM elements
const notesToggleButton = document.getElementById('notes-toggle-button');
const notesContent = document.getElementById('notes-content');
const notesTextarea = document.getElementById('notes-textarea');
const notesSaveButton = document.getElementById('notes-save-button');
const notesClearButton = document.getElementById('notes-clear-button');
const notesDisplay = document.getElementById('notes-display');
const notesText = document.getElementById('notes-text');

// Critical DOM elements
const criticalButton = document.getElementById('critical-button');

// Filter DOM elements
const filterSelect = document.getElementById('filter-select');

// Load flashcards from JSON file
async function loadFlashcards() {
    try {
        // Add cache-busting parameter to ensure latest version is loaded
        const cacheBuster = new Date().getTime();
        const response = await fetch(`questions-answers.json?v=${cacheBuster}`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error('Failed to load flashcards');
        }
        const loadedFlashcards = await response.json();
        allFlashcards = loadedFlashcards;
        flashcards = loadedFlashcards;
        filteredFlashcards = loadedFlashcards;
        
        // Log for debugging
        console.log(`Loaded ${flashcards.length} flashcards`);
        
        // Initialize the app after loading
        init();
    } catch (error) {
        console.error('Error loading flashcards:', error);
        questionText.innerHTML = "Error loading flashcards";
        answerText.innerHTML = "Please check that questions-answers.json exists";
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
    const card = filteredFlashcards[currentCardIndex];
    
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
    const card = filteredFlashcards[currentCardIndex];
    if (!card || !card.id) return;
    
    try {
        const isCritical = await isCardCritical(card.id);
        if (isCritical) {
            await unmarkCardAsCritical(card.id);
            updateCriticalButton(false);
        } else {
            await markCardAsCritical(card.id);
            updateCriticalButton(true);
        }
        // Don't re-apply filter - keep the current card visible
    } catch (error) {
        console.error('Error toggling critical state:', error);
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
}

function updateFilterSelect() {
    filterSelect.value = currentFilter;
}

// Event listeners
flashcard.addEventListener('click', flipCard);
answerButton.addEventListener('click', showAnswer);
prevButton.addEventListener('click', goToPrevious);
nextButton.addEventListener('click', goToNext);
shuffleButton.addEventListener('click', shuffleFlashcards);

// Notes event listeners
notesToggleButton.addEventListener('click', toggleNotesSection);
notesSaveButton.addEventListener('click', saveCurrentNote);
notesClearButton.addEventListener('click', clearCurrentNote);

// Critical event listeners
criticalButton.addEventListener('click', toggleCritical);

// Filter event listeners
filterSelect.addEventListener('change', (e) => {
    applyFilter(e.target.value);
});

// Prevent card flip when clicking buttons (event bubbling)
answerButton.addEventListener('click', (e) => e.stopPropagation());
prevButton.addEventListener('click', (e) => e.stopPropagation());
nextButton.addEventListener('click', (e) => e.stopPropagation());
shuffleButton.addEventListener('click', (e) => e.stopPropagation());
notesToggleButton.addEventListener('click', (e) => e.stopPropagation());
notesSaveButton.addEventListener('click', (e) => e.stopPropagation());
notesClearButton.addEventListener('click', (e) => e.stopPropagation());
notesTextarea.addEventListener('click', (e) => e.stopPropagation());
criticalButton.addEventListener('click', (e) => e.stopPropagation());
filterSelect.addEventListener('click', (e) => e.stopPropagation());

// Prevent card flip when clicking links inside cards
questionText.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.stopPropagation();
    }
});
answerText.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.stopPropagation();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFlashcards);
} else {
    loadFlashcards();
}

