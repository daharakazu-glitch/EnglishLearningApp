document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let appData = null;
    let mediaRecorder;
    let audioChunks = [];

    const elements = {
        title: document.getElementById('app-title'),
        textContainer: document.getElementById('text-container'),
        vocabList: document.getElementById('vocab-list'),
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        modal: document.getElementById('vocab-modal'),
        closeModal: document.querySelector('.close-modal'),
        modalWord: document.getElementById('modal-word'),
        modalDef: document.getElementById('modal-definition'),
        modalExamples: document.getElementById('modal-examples'),
        recordBtn: document.getElementById('record-btn'),
        stopBtn: document.getElementById('stop-btn'),
        audioPlayback: document.getElementById('user-recording'),
        scoreDisplay: document.getElementById('score-display'),
        scoreValue: document.getElementById('score-value')
    };

    // --- Initialization ---
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            appData = data;
            initApp();
        })
        .catch(err => console.error('Error loading data:', err));

    function initApp() {
        // Set Title
        // elements.title.textContent = appData.title || "English Learning App"; // Optional override

        // Render English Text with Highlighting
        renderText();

        // Render Vocabulary List
        renderVocabList();

        // Setup Event Listeners
        setupTabs();
        setupModal();
        setupRecording();
    }

    // --- Text Tab Logic ---
    function renderText() {
        let text = appData.text.en;
        
        // Naive highlighting: iterate through vocab list and replace occurrences
        // Sort by length (descending) to avoid partial matches on shorter words being replaced inside longer ones
        const sortedVocab = [...appData.vocabulary].sort((a, b) => b.word.length - a.word.length);

        // We use a temporary placeholder strategy to avoid re-replacing inside HTML tags
        // But for simplicity, we'll split by spaces and match tokens if possible, 
        // OR use a careful regex replace.
        // Given complexity, let's try a direct regex with word boundaries for each word.
        
        sortedVocab.forEach(item => {
            const regex = new RegExp(`\\b${item.word}\\b`, 'gi'); // Case insensitive, whole word
            // We wrap it in a span with a data-id to link to the vocab details
            text = text.replace(regex, (match) => {
                return `<span class="vocab-highlight" data-id="${item.id}">${match}</span>`;
            });
        });

        // Convert newlines to paragraphs
        // The simple pre-wrap in CSS handles newlines, but we can also wrap in <p> if needed.
        // For now, raw injection with pre-wrap is fine.
        elements.textContainer.innerHTML = text;

        // Add click listeners to highlights
        document.querySelectorAll('.vocab-highlight').forEach(span => {
            span.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                openVocabModal(id);
            });
        });
    }

    // --- Vocabulary Tab Logic ---
    function renderVocabList() {
        elements.vocabList.innerHTML = '';
        appData.vocabulary.forEach(item => {
            const el = document.createElement('div');
            el.className = 'vocab-item';
            el.innerHTML = `
                <div class="vocab-word">${item.word}</div>
                <div class="vocab-def">${item.definition}</div>
            `;
            el.addEventListener('click', () => openVocabModal(item.id));
            elements.vocabList.appendChild(el);
        });
    }

    // --- Tab Switching ---
    function setupTabs() {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all
                elements.tabs.forEach(t => t.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));

                // Activate clicked
                tab.classList.add('active');
                const targetId = tab.dataset.tab;
                document.getElementById(targetId).classList.add('active');
            });
        });
    }

    // --- Modal Logic ---
    function openVocabModal(id) {
        const item = appData.vocabulary.find(v => v.id === id);
        if (!item) return;

        elements.modalWord.textContent = item.word;
        elements.modalDef.textContent = item.definition;
        
        // Render Examples
        elements.modalExamples.innerHTML = '';
        if (item.examples && item.examples.length > 0) {
            item.examples.forEach(ex => {
                const exBlock = document.createElement('div');
                exBlock.className = 'example-block';
                exBlock.innerHTML = `
                    <div class="example-en">${ex.en}</div>
                    <div class="example-ja">${ex.ja}</div>
                `;
                elements.modalExamples.appendChild(exBlock);
            });
        } else {
            elements.modalExamples.innerHTML = '<p class="text-muted">No examples available.</p>';
        }

        // Reset Recording state
        resetRecordingUI();

        elements.modal.classList.remove('hidden');
    }

    function setupModal() {
        elements.closeModal.addEventListener('click', () => {
            elements.modal.classList.add('hidden');
        });

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                elements.modal.classList.add('hidden');
            }
        });
    }

    // --- Recording & Scoring Logic ---
    function setupRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("getUserMedia not supported on your browser!");
            elements.recordBtn.disabled = true;
            elements.recordBtn.textContent = "Mic Not Supported";
            return;
        }

        elements.recordBtn.addEventListener('click', startRecording);
        elements.stopBtn.addEventListener('click', stopRecording);
    }

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' }); // or webm
                    const audioUrl = URL.createObjectURL(audioBlob);
                    elements.audioPlayback.src = audioUrl;
                    
                    // Generate random score
                    const score = Math.floor(Math.random() * (100 - 80 + 1)) + 80;
                    elements.scoreValue.textContent = score;
                    elements.scoreDisplay.classList.remove('hidden');
                });

                // UI Updates
                elements.recordBtn.disabled = true;
                elements.recordBtn.classList.add('recording');
                elements.stopBtn.disabled = false;
                elements.scoreDisplay.classList.add('hidden');
                elements.audioPlayback.src = "";
            })
            .catch(err => {
                console.error("Error accessing microphone:", err);
                alert("Could not access microphone.");
            });
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            // Stop all tracks to release mic
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // UI Updates
            elements.recordBtn.disabled = false;
            elements.recordBtn.classList.remove('recording');
            elements.stopBtn.disabled = true;
        }
    }

    function resetRecordingUI() {
        elements.scoreDisplay.classList.add('hidden');
        elements.audioPlayback.src = "";
        elements.recordBtn.disabled = false;
        elements.stopBtn.disabled = true;
    }
});
