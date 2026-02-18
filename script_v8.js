
// ======================================================================
// 1. DATA & STATE
// ======================================================================

const APP_META = {
  title: "速読英単語　必修編　マスターアプリ",
  subTitle: "01 お茶の木の種類 [文化]",
};

// State
let state = {
  viewMode: 'app', // 'app' or 'print'
  tab: 'text',     // 'text' or 'vocab'
  selectedIds: new Set(),
  voice: null,
  printSettings: null,
  isPlaying: false,
  textData: null,
  vocabList: [],
  showMenu: false,
  expandedVocabIds: new Set()
};

// Data (will be loaded from JSON)
let STORY = { en: "", jp: "" };
let VOCAB_LIST = [];
let HIGHLIGHTS = [];

// ======================================================================
// 2. INITIALIZATION
// ======================================================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('data.json'); // Use local data.json
    const data = await response.json();

    // Map data.json to App Structure
    STORY = {
      en: data.text.en,
      jp: data.text.ja || ""
    };

    VOCAB_LIST = data.vocabulary.map(v => ({
      id: v.id,
      word: v.word,
      meaning: v.definition,
      sentence: v.examples?.[0]?.en || null,
      translation: v.examples?.[0]?.ja || null,
      rank: "★★★" // Mock rank or derived if available
    }));

    HIGHLIGHTS = VOCAB_LIST.map(v => v.word);

    // Initial selection: All
    state.selectedIds = new Set(VOCAB_LIST.map(v => v.id));

    // Init Voice
    initVoice();

    // Initial Render
    render();
    lucide.createIcons();

  } catch (e) {
    console.error("Failed to load data", e);
    document.getElementById('app-root').innerHTML = `<div class="p-4 text-red-500">Error loading data: ${e.message}</div>`;
  }
});

function initVoice() {
  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // Try to find a good English voice
    const en = voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.lang.startsWith('en-US')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (en) state.voice = en;
    renderHeader(); // Re-render header to update voice select
  };
  setVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = setVoice;
  }
}

// ======================================================================
// 3. ACTIONS (State Updaters)
// ======================================================================

function setState(updates) {
  state = { ...state, ...updates };
  render();
}

function setTab(tab) {
  setState({ tab });
}

function toggleSelect(id) {
  const newSet = new Set(state.selectedIds);
  if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
  setState({ selectedIds: newSet });
}

function toggleAll() {
  if (state.selectedIds.size === VOCAB_LIST.length) {
    setState({ selectedIds: new Set() });
  } else {
    setState({ selectedIds: new Set(VOCAB_LIST.map(v => v.id)) });
  }
}

function toggleMenu() {
  setState({ showMenu: !state.showMenu });
}

function toggleVocabExpand(id) {
  const newSet = new Set(state.expandedVocabIds);
  if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
  setState({ expandedVocabIds: newSet });
}

function onPrintRequest(format) {
  const items = VOCAB_LIST.filter(v => state.selectedIds.has(v.id));
  if (items.length === 0) {
    alert("単語を選択してください");
    return;
  }
  setState({
    viewMode: 'print',
    printSettings: { format, items },
    showMenu: false
  });
}

function backToApp() {
  setState({ viewMode: 'app', printSettings: null });
}

function setVoice(voiceName) {
  const v = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
  setState({ voice: v });
}

function playStory() {
  if (state.isPlaying) {
    window.speechSynthesis.cancel();
    setState({ isPlaying: false });
    return;
  }
  const ut = new SpeechSynthesisUtterance(STORY.en);
  if (state.voice) ut.voice = state.voice;
  ut.rate = 0.9;
  ut.onend = () => setState({ isPlaying: false });
  window.speechSynthesis.speak(ut);
  setState({ isPlaying: true });
}

function playWord(text) {
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(text);
  if (state.voice) ut.voice = state.voice;
  window.speechSynthesis.speak(ut);
}

// ======================================================================
// 4. RENDERING (Components)
// ======================================================================

function render() {
  const root = document.getElementById('app-root');

  if (state.viewMode === 'print') {
    root.innerHTML = renderPrintView();
  } else {
    root.innerHTML = renderAppView();
  }

  lucide.createIcons();
}

function renderAppView() {
  return `
    <div class="min-h-screen bg-slate-50 text-slate-900 font-serif pb-20">
        ${renderHeader()}
        ${renderTabNav()}
        <main class="max-w-3xl mx-auto p-4">
            ${state.tab === 'text' ? renderTextComponent() : renderVocabComponent()}
        </main>
    </div>
    `;
}

function renderHeader() {
  // Voices options
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const options = voices.map(v =>
    `<option value="${v.name}" ${state.voice?.name === v.name ? 'selected' : ''} class="text-black">${v.name}</option>`
  ).join('');

  return `
    <header class="bg-blue-900 text-white p-5 shadow sticky top-0 z-20">
        <div class="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 class="font-bold text-2xl md:text-3xl leading-tight">${APP_META.title}</h1>
            <p class="text-blue-200 text-lg mt-1">${APP_META.subTitle}</p>
          </div>
          <div class="bg-black/20 p-2 rounded flex items-center">
            <i data-lucide="volume-2" class="text-blue-200 mr-2 w-5 h-5"></i>
            <select class="bg-transparent text-white text-base max-w-[200px]" onchange="setVoice(this.value)">
                ${options}
            </select>
          </div>
        </div>
    </header>
    `;
}

function renderTabNav() {
  return `
    <div class="max-w-4xl mx-auto mt-4 px-4 sticky top-24 z-10">
        <div class="flex bg-white rounded shadow border border-slate-200 overflow-hidden">
          <button onclick="setTab('text')" class="flex-1 py-4 font-bold flex justify-center items-center gap-2 text-xl ${state.tab === 'text' ? 'bg-blue-100 text-blue-900' : 'text-slate-500 hover:bg-slate-50'}">
            <i data-lucide="file-text" class="w-6 h-6"></i> Text
          </button>
          <button onclick="setTab('vocab')" class="flex-1 py-4 font-bold flex justify-center items-center gap-2 text-xl ${state.tab === 'vocab' ? 'bg-indigo-100 text-indigo-900' : 'text-slate-500 hover:bg-slate-50'}">
            <i data-lucide="book-open" class="w-6 h-6"></i> Vocab
          </button>
        </div>
    </div>
    `;
}

function renderTextComponent() {
  const words = STORY.en.split(/(\s+)/).map((word) => {
    // Simple includes check for highlights
    const isHighlight = HIGHLIGHTS.some(h => word.toLowerCase().includes(h.toLowerCase()) && word.trim().length > 1);
    if (isHighlight) {
      return `<span class="bg-yellow-200 text-blue-900 font-bold px-1 rounded">${word}</span>`;
    }
    return word;
  }).join('');

  return `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-800">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-blue-900">ENGLISH STORY</h2>
          <button onclick="playStory()" class="px-5 py-2 rounded-full text-base font-bold shadow flex items-center gap-2 ${state.isPlaying ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'}">
            <i data-lucide="${state.isPlaying ? 'pause' : 'play'}" class="w-5 h-5"></i> ${state.isPlaying ? 'Stop' : 'Listen'}
          </button>
        </div>
        <p class="text-2xl leading-loose text-justify text-slate-800 font-serif tracking-wide">
          ${words}
        </p>
      </div>
      <div class="bg-slate-100 p-6 rounded-lg border-l-4 border-slate-400">
        <h2 class="text-lg font-bold text-slate-600 mb-3">日本語訳</h2>
        <p class="leading-loose text-slate-700 text-lg">${STORY.jp}</p>
      </div>
    </div>
    `;
}

function renderVocabComponent() {
  const isAllSelected = state.selectedIds.size === VOCAB_LIST.length;

  // Menu Item Helper
  const menuItem = (id, label, icon) => `
        <button onclick="onPrintRequest('${id}')" class="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b last:border-0 text-slate-700 text-sm">
            <span class="text-blue-500"><i data-lucide="${icon}" class="w-4 h-4"></i></span> ${label}
        </button>
    `;

  return `
    <div class="space-y-4">
        <!-- Toolbar -->
        <div class="bg-blue-50 border border-blue-200 p-6 rounded flex justify-between items-center sticky top-44 z-10 shadow-sm">
            <button onclick="toggleAll()" class="flex items-center gap-3 font-bold text-slate-700 text-xl">
                <i data-lucide="${isAllSelected ? 'check-square' : 'square'}" class="${isAllSelected ? 'text-blue-600' : ''} w-8 h-8"></i>
                全選択 (${state.selectedIds.size})
            </button>
            
            <div class="relative">
                <button onclick="toggleMenu()" class="bg-blue-700 text-white px-6 py-3 rounded shadow font-bold text-base flex items-center gap-2 hover:bg-blue-800">
                  <i data-lucide="printer" class="w-6 h-6"></i> プリント作成
                </button>
                ${state.showMenu ? `
                  <div class="absolute right-0 top-full mt-3 w-72 bg-white rounded shadow-xl border border-slate-200 z-30 animate-in fade-in zoom-in duration-200">
                    <div class="bg-slate-100 p-4 text-base font-bold text-slate-500 border-b">形式を選択</div>
                    ${menuItem('list', '暗記リスト', 'list')}
                    ${menuItem('test-meaning', '意味テスト', 'file-question')}
                    ${menuItem('test-spelling', 'スペルテスト', 'file-question')}
                    ${menuItem('test-example', '例文テスト', 'file-text')}
                    ${menuItem('cards', '単語カード', 'grid')}
                    ${menuItem('foldable', '折りたたみ', 'scissors')}
                  </div>
                ` : ''}
            </div>
        </div>

        <!-- List -->
        <div class="space-y-3">
            ${VOCAB_LIST.map(item => renderVocabCard(item)).join('')}
        </div>
    </div>
    `;
}

function renderVocabCard(item) {
  const isSelected = state.selectedIds.has(item.id);
  const isExpanded = state.expandedVocabIds.has(item.id);

  return `
    <div class="bg-white rounded-lg shadow border transition-colors ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200'}">
      <div class="flex">
        <div onclick="toggleSelect(${item.id})" class="w-16 flex items-center justify-center cursor-pointer border-r border-slate-100 hover:bg-slate-50">
          <i data-lucide="${isSelected ? 'check-square' : 'square'}" class="${isSelected ? 'text-blue-600' : 'text-slate-300'} w-8 h-8"></i>
        </div>
        <div class="flex-1 p-5 cursor-pointer" onclick="toggleVocabExpand(${item.id})">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <span class="bg-blue-100 text-blue-800 text-base font-bold w-12 h-8 flex items-center justify-center rounded flex-shrink-0">${item.id}</span>
              <h3 class="text-2xl font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}">${item.word}</h3>
              <button onclick="event.stopPropagation(); playWord('${item.word}')" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500">
                <i data-lucide="volume-2" class="w-6 h-6"></i>
              </button>
            </div>
            <span class="text-slate-400 text-lg mt-1 flex-shrink-0">${isExpanded ? '▲' : '▼'}</span>
          </div>
          <p class="text-xl text-slate-700 mt-2 truncate">${item.meaning}</p>
        </div>
      </div>
      
      ${isExpanded ? `
        <div class="p-6 bg-slate-50 border-t ml-20">
          ${item.sentence ? `
            <div class="mb-4">
              <div class="flex items-center gap-3 mb-2">
                <span class="text-xs bg-slate-200 px-2 py-1 rounded font-bold">EX</span>
                <button onclick="playWord('${item.sentence.replace(/'/g, "\\'")}')" class="text-sm flex items-center gap-2 border px-3 py-1 rounded bg-white font-bold">
                    <i data-lucide="play" class="w-4 h-4"></i> Listen
                </button>
              </div>
              <p class="text-xl leading-relaxed">${item.sentence}</p>
              <p class="text-lg text-slate-500 mt-1">${item.translation}</p>
            </div>
          ` : ''}
          <!-- Mic Feature Skipped for simplicity in this rendering pass, can be added if requested specifically again -->
           <div class="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200">
             <span class="text-xs text-slate-400">Recorder feature coming soon</span>
           </div>
        </div>
      ` : ''}
    </div>
    `;
}

function renderPrintView() {
  const { format, items } = state.printSettings;
  const date = new Date().toLocaleDateString();

  const getTitle = () => {
    switch (format) {
      case 'list': return '単語リスト';
      case 'test-meaning': return '意味テスト';
      case 'test-spelling': return 'スペルテスト';
      case 'test-example': return '例文テスト';
      case 'cards': return '単語カード';
      case 'foldable': return '折りたたみシート';
      default: return '印刷';
    }
  };

  let contentHtml = '';

  if (format === 'list') {
    contentHtml = `
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-black p-2 w-10 text-center">No.</th>
                <th class="border border-black p-2 w-1/3">Word</th>
                <th class="border border-black p-2">Meaning</th>
                <th class="border border-black p-2 w-12 text-center">Chk</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr class="avoid-break">
                  <td class="border border-black p-2 text-center">${i + 1}</td>
                  <td class="border border-black p-2 font-bold text-lg">${item.word}</td>
                  <td class="border border-black p-2">${item.meaning}</td>
                  <td class="border border-black p-2"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
  } else if (format === 'test-meaning') {
    contentHtml = `
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-black p-2 w-10 text-center">No.</th>
                <th class="border border-black p-2 w-1/3">Word</th>
                <th class="border border-black p-2">Meaning (日本語)</th>
                <th class="border border-black p-2 w-12 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr class="avoid-break">
                  <td class="border border-black p-3 text-center text-slate-500">${i + 1}</td>
                  <td class="border border-black p-3 font-bold text-lg">${item.word}</td>
                  <td class="border border-black p-3"></td>
                  <td class="border border-black p-3"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
  } else if (format === 'test-spelling') {
    contentHtml = `
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-black p-2 w-10 text-center">No.</th>
                <th class="border border-black p-2">Meaning</th>
                <th class="border border-black p-2 w-1/3">Word (English)</th>
                <th class="border border-black p-2 w-12 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr class="avoid-break">
                  <td class="border border-black p-3 text-center text-slate-500">${i + 1}</td>
                  <td class="border border-black p-3">${item.meaning}</td>
                  <td class="border border-black p-3 align-bottom">
                    <div class="text-right text-[10px] text-slate-400">(${item.word.length} letters)</div>
                  </td>
                  <td class="border border-black p-3"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
  } else if (format === 'test-example') {
    contentHtml = `
          <div class="space-y-6">
            ${items.map((item, i) => {
      if (!item.sentence) return '';
      const masked = item.sentence.replace(new RegExp(`\\b${item.word}\\b`, 'gi'), '_______');
      return `
                <div class="avoid-break border-b border-slate-300 pb-4">
                  <div class="flex gap-4">
                    <span class="font-bold w-6 text-center">${i + 1}.</span>
                    <div class="flex-1">
                      <p class="text-lg mb-1 leading-relaxed">
                        ${masked.includes('_______') ? masked : item.sentence.replace(item.word, '_______')}
                      </p>
                      <p class="text-xs text-slate-500">${item.translation}</p>
                    </div>
                  </div>
                  <div class="mt-2 ml-10 text-xs text-slate-400 italic">Hint: ${item.meaning}</div>
                </div>
              `;
    }).join('')}
          </div>
        `;
  } else if (format === 'cards') {
    contentHtml = `
          <div class="grid grid-cols-2 border-l border-t border-slate-300">
            ${items.map((item) => `
              <div class="avoid-break border-r border-b border-slate-300 h-40 flex flex-col items-center justify-center text-center p-4 relative">
                <span class="absolute top-2 left-2 text-xs text-slate-400">No. ${item.id}</span>
                <p class="text-2xl font-bold mb-2">${item.word}</p>
                <div class="w-3/4 border-t border-dashed border-slate-300 my-2"></div>
                <p class="text-xs">${item.meaning}</p>
                <span class="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-black"></span>
                <span class="absolute -top-1 -right-1 w-2 h-2 border-r border-t border-black"></span>
                <span class="absolute -bottom-1 -left-1 w-2 h-2 border-l border-b border-black"></span>
                <span class="absolute -bottom-1 -right-1 w-2 h-2 border-r border-b border-black"></span>
              </div>
            `).join('')}
          </div>
        `;
  } else if (format === 'foldable') {
    contentHtml = `
          <div class="relative">
            <p class="text-center text-xs italic mb-2 text-slate-400">--- Center Fold Line ---</p>
            <div class="grid grid-cols-2 border-2 border-black">
              ${items.map((item, i) => `
                  <div class="avoid-break p-2 border-b border-r border-black flex justify-between items-center ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}">
                    <span class="text-xs text-slate-400">${i + 1}</span>
                    <span class="font-bold">${item.word}</span>
                  </div>
                  <div class="avoid-break p-2 border-b border-black text-xs flex items-center ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}">
                    ${item.meaning}
                  </div>
              `).join('')}
            </div>
            <div class="absolute top-6 bottom-0 left-1/2 w-px border-l-2 border-dashed border-slate-400 transform -translate-x-1/2 pointer-events-none"></div>
          </div>
        `;
  }

  return `
    <div class="print-container bg-white font-serif text-black">
      <!-- Control Bar -->
      <div class="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow z-50">
        <div class="flex items-center gap-4">
          <button onclick="backToApp()" class="flex items-center gap-2 hover:text-blue-300">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> 戻る
          </button>
          <div class="h-6 w-px bg-slate-600"></div>
          <div>
            <h2 class="font-bold">${getTitle()}</h2>
            <p class="text-xs text-slate-400">${items.length}件</p>
          </div>
        </div>
        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold shadow flex items-center gap-2">
          <i data-lucide="printer" class="w-4 h-4"></i> 印刷する
        </button>
      </div>

      <!-- Spacer -->
      <div class="h-24 no-print"></div>

      <!-- Paper -->
      <div class="paper">
        <header class="border-b-2 border-black pb-2 mb-6 flex justify-between items-end avoid-break">
          <div>
            <h1 class="text-xl font-bold">${APP_META.title}</h1>
            <p class="text-sm">${APP_META.subTitle} - ${getTitle()}</p>
          </div>
          <div class="text-right text-sm">
            <p>Date: ${date}</p>
            <div class="mt-4 border-b border-black w-32"></div>
            <p class="text-xs">Name</p>
          </div>
        </header>

        ${contentHtml}
      </div>
    </div>
    `;
}
