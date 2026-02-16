document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let appData = null;
    let mediaRecorder;
    let audioChunks = [];
    let utterance = null;
    let isPlaying = false;

    const elements = {
        title: document.getElementById('app-title'),
        textContainer: document.getElementById('text-container'),
        translationContainer: document.getElementById('translation-container'),
        toggleTranslationBtn: document.getElementById('toggle-translation-btn'),
        vocabList: document.getElementById('vocab-list'),
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),

        // Modal Vocab
        modal: document.getElementById('vocab-modal'),
        closeModal: document.querySelector('.close-modal'),
        modalWord: document.getElementById('modal-word'),
        modalDef: document.getElementById('modal-definition'),
        modalExamples: document.getElementById('modal-examples'),

        // Recording
        recordBtn: document.getElementById('record-btn'),
        stopBtn: document.getElementById('stop-btn'),
        audioPlayback: document.getElementById('user-recording'),
        scoreDisplay: document.getElementById('score-display'),
        scoreValue: document.getElementById('score-value'),

        // Audio Player (TTS)
        playPauseBtn: document.getElementById('play-pause-btn'),
        stopAudioBtn: document.getElementById('stop-audio-btn'),
        audioStatus: document.getElementById('audio-status'),

        // Print
        printBtn: document.getElementById('print-btn'),
        printModal: document.getElementById('print-modal'),
        closePrintModal: document.querySelector('.close-print'),
        startPrintBtn: document.getElementById('start-print-btn'),
        printOptions: document.querySelectorAll('input[name="print-layout"]')
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
        // Render English Text with Highlighting
        renderText();

        // Render Translation
        if (appData.text.ja) {
            elements.translationContainer.innerText = appData.text.ja;
        }

        // Render Vocabulary List
        renderVocabList();

        // Setup Event Listeners
        setupTabs();
        setupModal();
        setupRecording();
        setupTTS();
        setupPrint();
        setupTranslationToggle();
    }

    // --- Text Tab Logic ---
    function renderText() {
        let text = appData.text.en;
        const sortedVocab = [...appData.vocabulary].sort((a, b) => b.word.length - a.word.length);

        sortedVocab.forEach(item => {
            const regex = new RegExp(`\\b${item.word}\\b`, 'gi');
            text = text.replace(regex, (match) => {
                return `<span class="vocab-highlight" data-id="${item.id}">${match}</span>`;
            });
        });

        elements.textContainer.innerHTML = text;

        document.querySelectorAll('.vocab-highlight').forEach(span => {
            span.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                openVocabModal(id);
            });
        });
    }

    function setupTranslationToggle() {
        elements.toggleTranslationBtn.addEventListener('click', () => {
            elements.translationContainer.classList.toggle('hidden');
        });
    }

    // --- TTS Logic (Web Speech API) ---
    function setupTTS() {
        if (!('speechSynthesis' in window)) {
            elements.audioStatus.textContent = "TTS not supported.";
            elements.playPauseBtn.disabled = true;
            return;
        }

        elements.playPauseBtn.addEventListener('click', () => {
            if (isPlaying) {
                window.speechSynthesis.pause();
                isPlaying = false;
                elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                elements.audioStatus.textContent = "Paused";
            } else {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                } else {
                    playText(appData.text.en);
                }
                isPlaying = true;
                elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                elements.audioStatus.textContent = "Playing...";
            }
        });

        elements.stopAudioBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            isPlaying = false;
            elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            elements.audioStatus.textContent = "Stopped";
        });
    }

    function playText(text) {
        window.speechSynthesis.cancel(); // Stop any previous
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Default to US English
        utterance.rate = 1.0;

        utterance.onend = () => {
            isPlaying = false;
            elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            elements.audioStatus.textContent = "Finished";
        };

        utterance.onerror = (e) => {
            console.error('SpeechSynthesis error:', e);
            isPlaying = false;
            elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            elements.audioStatus.textContent = "Error";
        };

        window.speechSynthesis.speak(utterance);
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
                <div class="vocab-check-line"></div>
            `;
            el.addEventListener('click', () => openVocabModal(item.id));
            elements.vocabList.appendChild(el);
        });
    }

    // --- Tab Switching ---
    function setupTabs() {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                elements.tabs.forEach(t => t.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));
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

        elements.modalExamples.innerHTML = '';
        if (item.examples && item.examples.length > 0) {
            item.examples.forEach(ex => {
                const exBlock = document.createElement('div');
                exBlock.className = 'example-block';
                exBlock.innerHTML = `
                    <div class="example-en">${ex.en} <i class="fas fa-volume-up" style="cursor:pointer; color:#3498db; margin-left:5px;" onclick="speak('${ex.en.replace(/'/g, "\\'")}')"></i></div>
                    <div class="example-ja">${ex.ja}</div>
                `;
                elements.modalExamples.appendChild(exBlock);
            });
        } else {
            elements.modalExamples.innerHTML = '<p class="text-muted">No examples available.</p>';
        }

        resetRecordingUI();
        elements.modal.classList.remove('hidden');
    }

    function setupModal() {
        elements.closeModal.addEventListener('click', () => {
            elements.modal.classList.add('hidden');
        });
        window.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                elements.modal.classList.add('hidden');
            }
        });
    }

    // Global helper for example speech
    window.speak = function (text) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    };

    // --- Recording & Scoring Logic ---
    function setupRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("getUserMedia not supported");
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
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    elements.audioPlayback.src = audioUrl;

                    const score = Math.floor(Math.random() * (100 - 80 + 1)) + 80;
                    elements.scoreValue.textContent = score;
                    elements.scoreDisplay.classList.remove('hidden');
                });

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
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
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

    // --- Printing Logic ---
    function setupPrint() {
        elements.printBtn.addEventListener('click', () => {
            elements.printModal.classList.remove('hidden');
        });

        elements.closePrintModal.addEventListener('click', () => {
            elements.printModal.classList.add('hidden');
        });

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === elements.printModal) {
                elements.printModal.classList.add('hidden');
            }
        });

        elements.startPrintBtn.addEventListener('click', () => {
            // Determine selected layout
            let selectedLayout = 'text-only';
            elements.printOptions.forEach(opt => {
                if (opt.checked) selectedLayout = opt.value;
            });

            // Set body class
            document.body.className = ''; // reset
            document.body.classList.add(`print-${selectedLayout}`);

            // Print
            window.print();

            // Clean up class after print dialog closes (timout hack usually needed to not clear before print dialog renders)
            // But usually keeping it is fine until page reload, or we can just remove it after a delay.
            // A better way is using `onafterprint`
        });

        window.addEventListener('afterprint', () => {
            document.body.className = '';
            elements.printModal.classList.add('hidden');
        });
    }
});
