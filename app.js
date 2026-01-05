// Flashcard data (loaded from JSON)
let flashcards = [];

// App state
let currentCardIndex = 0;
let isFlipped = false;

// DOM elements
const flashcard = document.getElementById('flashcard');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const answerButton = document.getElementById('answer-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const shuffleButton = document.getElementById('shuffle-button');
const cardCounter = document.getElementById('card-counter');

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
        flashcards = await response.json();
        
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
function init() {
    if (flashcards.length === 0) {
        questionText.innerHTML = "No flashcards available";
        answerText.innerHTML = "No flashcards available";
        return;
    }
    
    renderCard();
    updateNavigationButtons();
    updateCounter();
    updateAnswerButton();
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
function renderCard() {
    const card = flashcards[currentCardIndex];
    
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
}

// Navigate to previous card
function goToPrevious() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        renderCard();
        updateNavigationButtons();
        updateCounter();
    }
}

// Navigate to next card
function goToNext() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        renderCard();
        updateNavigationButtons();
        updateCounter();
    }
}

// Update navigation buttons state
function updateNavigationButtons() {
    prevButton.disabled = currentCardIndex === 0;
    nextButton.disabled = currentCardIndex === flashcards.length - 1;
}

// Update card counter
function updateCounter() {
    cardCounter.textContent = `${currentCardIndex + 1} / ${flashcards.length}`;
}

// Shuffle flashcards using Fisher-Yates algorithm
function shuffleFlashcards() {
    // Create a copy of the array to avoid mutating the original
    const shuffled = [...flashcards];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    flashcards = shuffled;
    
    // Reset to first card and question side
    currentCardIndex = 0;
    if (isFlipped) {
        flipCard();
    }
    
    // Re-render the card
    renderCard();
    updateNavigationButtons();
    updateCounter();
}

// Event listeners
flashcard.addEventListener('click', flipCard);
answerButton.addEventListener('click', showAnswer);
prevButton.addEventListener('click', goToPrevious);
nextButton.addEventListener('click', goToNext);
shuffleButton.addEventListener('click', shuffleFlashcards);

// Prevent card flip when clicking buttons (event bubbling)
answerButton.addEventListener('click', (e) => e.stopPropagation());
prevButton.addEventListener('click', (e) => e.stopPropagation());
nextButton.addEventListener('click', (e) => e.stopPropagation());
shuffleButton.addEventListener('click', (e) => e.stopPropagation());

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

