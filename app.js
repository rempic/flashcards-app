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
        const response = await fetch('questions-answers.json');
        if (!response.ok) {
            throw new Error('Failed to load flashcards');
        }
        flashcards = await response.json();
        
        // Initialize the app after loading
        init();
    } catch (error) {
        console.error('Error loading flashcards:', error);
        questionText.textContent = "Error loading flashcards";
        answerText.textContent = "Please check that questions-answers.json exists";
    }
}

// Initialize the app
function init() {
    if (flashcards.length === 0) {
        questionText.textContent = "No flashcards available";
        answerText.textContent = "No flashcards available";
        return;
    }
    
    renderCard();
    updateNavigationButtons();
    updateCounter();
    updateAnswerButton();
}

// Render the current card
function renderCard() {
    const card = flashcards[currentCardIndex];
    questionText.textContent = card.question;
    
    // Display all answers (join multiple answers with newlines or bullets)
    if (card.answers && card.answers.length > 0) {
        // If multiple answers, display them as a bulleted list
        if (card.answers.length === 1) {
            answerText.textContent = card.answers[0];
        } else {
            // Format multiple answers with bullet points
            answerText.textContent = card.answers.map(answer => `• ${answer}`).join('\n');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFlashcards);
} else {
    loadFlashcards();
}

