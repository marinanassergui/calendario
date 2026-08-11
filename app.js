// State Management
let state = {
    settings: {
        title: "Minha Viagem",
        startDate: "",
        totalDays: 30
    },
    days: []
};

// DOM Elements
const totalDaysCountEl = document.getElementById('total-days-count');
const counterTitleEl = document.getElementById('counter-title');
const counterSubtitleEl = document.getElementById('counter-subtitle');
const daysGridEl = document.getElementById('days-grid');
const emptyStateEl = document.getElementById('empty-state');

// Stats Elements
const statsCompletedEl = document.getElementById('stats-completed');
const statsNotesEl = document.getElementById('stats-notes');
const statsPercentEl = document.getElementById('stats-percent');
const progressRingCircle = document.querySelector('.progress-ring__circle');

// Controls
const searchInput = document.getElementById('search-notes-input');
const filterPills = document.querySelectorAll('.filter-pill');

// Modals & Forms
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const settingsTitleInput = document.getElementById('settings-title');
const settingsStartDateInput = document.getElementById('settings-start-date');
const settingsTotalDaysInput = document.getElementById('settings-total-days');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

const editDayModal = document.getElementById('edit-day-modal');
const editDayForm = document.getElementById('edit-day-form');
const editDayIdInput = document.getElementById('edit-day-id');
const editDayDateInput = document.getElementById('edit-day-date');
const editDayCompletedInput = document.getElementById('edit-day-completed');
const editDayNoteInput = document.getElementById('edit-day-note');
const deleteDayBtn = document.getElementById('delete-day-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDayTitle = document.getElementById('modal-day-title');

// Current filter state
let currentFilter = 'all';
let currentSearchQuery = '';

// Helper: Formata data no padrão brasileiro (DD de mmm. de AAAA)
function formatDateBr(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

// Helper: Adiciona dias a uma data e retorna YYYY-MM-DD
function addDaysToDate(baseDateStr, daysToAdd) {
    const parts = baseDateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + daysToAdd);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Helper: Diferença em dias entre duas datas (YYYY-MM-DD)
function getDaysDifference(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    const diffTime = d2 - d1;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Obtém data de hoje local no formato YYYY-MM-DD
function getTodayDateStr() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Ajusta o array de dias baseado em totalDays e startDate
function adjustDaysArray() {
    const total = parseInt(state.settings.totalDays, 10) || 30;
    const start = state.settings.startDate || getTodayDateStr();

    // Adiciona dias faltantes se o array for menor que o necessário
    while (state.days.length < total) {
        const nextNum = state.days.length + 1;
        state.days.push({
            dayNumber: nextNum,
            date: addDaysToDate(start, nextNum - 1),
            completed: false,
            note: ""
        });
    }

    // Remove dias extras se o total diminuiu
    if (state.days.length > total) {
        state.days = state.days.slice(0, total);
    }

    // Garante que todas as datas e sequências de dias estão corretas a partir de startDate
    state.days.forEach((day, index) => {
        day.dayNumber = index + 1;
        day.date = addDaysToDate(start, index);
    });

    saveDaysState();
}

// Inicializa a aplicação
function init() {
    // 1. Carrega dados do LocalStorage
    const storedSettings = localStorage.getItem('daytrack_settings');
    const storedDays = localStorage.getItem('daytrack_days');

    if (storedSettings) {
        state.settings = JSON.parse(storedSettings);
    } else {
        state.settings.title = "Minha Viagem";
        state.settings.startDate = getTodayDateStr();
        state.settings.totalDays = 30;
        localStorage.setItem('daytrack_settings', JSON.stringify(state.settings));
    }

    if (storedDays) {
        state.days = JSON.parse(storedDays);
    } else {
        state.days = [];
    }

    // Garante que a estrutura de dias está inicializada e sincronizada
    adjustDaysArray();

    // 2. Registra os Event Listeners
    setupEventListeners();

    // 3. Atualiza a Interface
    updateUI();
}

// Configura todos os ouvintes de eventos
function setupEventListeners() {
    // Barra de Pesquisa
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        renderDays();
    });

    // Filtros
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            renderDays();
        });
    });

    // Modais - Fechamento geral no overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });

    // Modal Configurações
    settingsBtn.addEventListener('click', openSettingsModal);
    settingsCloseBtn.addEventListener('click', closeAllModals);
    settingsForm.addEventListener('submit', saveSettings);
    resetAllBtn.addEventListener('click', resetAllData);

    // Modal Editar Dia
    modalCloseBtn.addEventListener('click', closeAllModals);
    editDayForm.addEventListener('submit', saveDayEdit);
    deleteDayBtn.addEventListener('click', clearDayData);
}

// Atualiza toda a Interface Gráfica
function updateUI() {
    // 1. Calcula datas do evento
    const startDate = state.settings.startDate;
    const total = parseInt(state.settings.totalDays, 10);
    const eventDate = addDaysToDate(startDate, total);

    // 2. Atualiza título e cabeçalho
    counterTitleEl.textContent = state.settings.title;
    counterSubtitleEl.textContent = `Iniciado em ${formatDateBr(startDate)} • Evento em ${formatDateBr(eventDate)}`;

    // 3. Atualiza estatísticas e renderiza os cards
    updateStats();
    renderDays();
}

// Calcula e atualiza estatísticas no topo da tela
function updateStats() {
    const today = getTodayDateStr();
    const start = state.settings.startDate;
    const total = parseInt(state.settings.totalDays, 10);

    // Dias decorridos desde a data de início (incluindo o dia de início como dia 1)
    let elapsed = 0;
    if (today >= start) {
        elapsed = getDaysDifference(start, today) + 1;
        if (elapsed > total) elapsed = total;
    }

    const remaining = total - elapsed;
    if (totalDaysCountEl) {
        totalDaysCountEl.textContent = remaining;
    }

    // Estatísticas dos cards
    const completed = state.days.filter(d => d.completed).length;
    const withNotes = state.days.filter(d => d.note && d.note.trim() !== '').length;

    // Aproveitamento: Porcentagem de dias concluídos em relação aos dias decorridos
    const elapsedForStats = elapsed === 0 ? 1 : elapsed;
    const completedPercent = Math.min(Math.round((completed / elapsedForStats) * 100), 100);

    if (statsCompletedEl) statsCompletedEl.textContent = completed;
    if (statsNotesEl) statsNotesEl.textContent = withNotes;
    if (statsPercentEl) statsPercentEl.textContent = `${completedPercent}%`;

    // Animação do círculo de progresso baseada nos dias decorridos em relação ao total
    if (progressRingCircle) {
        const circumference = 2 * Math.PI * 60;
        progressRingCircle.style.strokeDasharray = circumference;
        const timePassedPercent = total > 0 ? (elapsed / total) * 100 : 0;
        const offset = circumference - (timePassedPercent / 100) * circumference;
        progressRingCircle.style.strokeDashoffset = offset;
    }
}

// Renderiza os cards de dias baseados em filtros e pesquisa
function renderDays() {
    daysGridEl.innerHTML = '';
    const today = getTodayDateStr();

    // Filtra os dias
    const filteredDays = state.days.filter(day => {
        // Filtro de status
        if (currentFilter === 'completed' && !day.completed) return false;
        if (currentFilter === 'notes' && (!day.note || day.note.trim() === '')) return false;

        // Filtro de pesquisa nas notas ou título do dia
        if (currentSearchQuery !== '') {
            const noteMatch = day.note && day.note.toLowerCase().includes(currentSearchQuery);
            const dayMatch = `dia ${day.dayNumber}`.includes(currentSearchQuery);
            const dateMatch = formatDateBr(day.date).toLowerCase().includes(currentSearchQuery);
            return noteMatch || dayMatch || dateMatch;
        }

        return true;
    });

    if (filteredDays.length === 0) {
        daysGridEl.appendChild(emptyStateEl);
        emptyStateEl.style.display = 'flex';
        
        const titleEl = emptyStateEl.querySelector('.empty-state-title');
        const descEl = emptyStateEl.querySelector('.empty-state-desc');
        if (currentSearchQuery !== '' || currentFilter !== 'all') {
            titleEl.textContent = "Nenhum resultado encontrado";
            descEl.textContent = "Tente alterar os filtros ou limpar sua barra de pesquisa.";
        } else {
            titleEl.textContent = "Linha do tempo vazia";
            descEl.textContent = "Defina as configurações de dias nas engrenagem do topo para iniciar.";
        }
    } else {
        emptyStateEl.style.display = 'none';
        
        filteredDays.forEach(day => {
            const card = document.createElement('div');
            
            // Verifica se o dia está no futuro, hoje ou no passado
            const isToday = day.date === today;
            const isPast = day.date < today;
            const isFuture = day.date > today;
            
            card.className = `day-card ${day.completed ? 'completed' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`;
            card.setAttribute('data-id', day.dayNumber);

            const hasNote = day.note && day.note.trim() !== '';
            let previewText = hasNote ? day.note : "Sem anotações para este dia.";
            if (isFuture) {
                previewText = "Bloqueado. Este dia ainda não chegou.";
            }

            card.innerHTML = `
                <div class="day-card-header">
                    <span class="day-number">Dia ${String(day.dayNumber).padStart(2, '0')}</span>
                    <span class="day-status-dot"></span>
                </div>
                <div class="day-card-date">${formatDateBr(day.date)}</div>
                <p class="day-card-preview">${previewText}</p>
                <div class="day-card-footer">
                    ${isFuture ? `
                        <span class="lock-indicator" title="Dia futuro bloqueado">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                    ` : (hasNote ? `
                        <span class="note-indicator" title="Possui nota">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                    ` : '')}
                </div>
            `;

            // Tratamento do clique no card
            if (isFuture) {
                card.addEventListener('click', () => {
                    alert(`Este dia (${formatDateBr(day.date)}) está no futuro. Você poderá adicionar notas e marcá-lo como concluído quando a data chegar!`);
                });
            } else {
                card.addEventListener('click', () => openEditDayModal(day));
            }
            
            daysGridEl.appendChild(card);
        });
    }
}

// Abre o Drawer Modal para editar um dia específico
function openEditDayModal(day) {
    modalDayTitle.textContent = `Editar Dia ${String(day.dayNumber).padStart(2, '0')}`;
    editDayIdInput.value = day.dayNumber;
    editDayDateInput.value = day.date;
    editDayCompletedInput.checked = day.completed;
    editDayNoteInput.value = day.note || "";

    editDayModal.classList.add('active');
    editDayModal.setAttribute('aria-hidden', 'false');
}

// Salva as alterações feitas no dia através do modal
function saveDayEdit(e) {
    e.preventDefault();
    const dayNum = parseInt(editDayIdInput.value, 10);
    const dayIndex = state.days.findIndex(d => d.dayNumber === dayNum);

    if (dayIndex !== -1) {
        state.days[dayIndex].completed = editDayCompletedInput.checked;
        state.days[dayIndex].note = editDayNoteInput.value;

        saveDaysState();
        updateUI();
        closeAllModals();
    }
}

// Limpa notas e conclusão de um dia
function clearDayData() {
    const dayNum = parseInt(editDayIdInput.value, 10);
    const dayIndex = state.days.findIndex(d => d.dayNumber === dayNum);
    
    if (dayIndex !== -1) {
        if (confirm(`Deseja limpar as notas e o status do Dia ${dayNum}?`)) {
            state.days[dayIndex].completed = false;
            state.days[dayIndex].note = "";

            saveDaysState();
            updateUI();
            closeAllModals();
        }
    }
}

// Abre o modal de configurações
function openSettingsModal() {
    settingsTitleInput.value = state.settings.title;
    settingsStartDateInput.value = state.settings.startDate;
    settingsTotalDaysInput.value = state.settings.totalDays;

    settingsModal.classList.add('active');
    settingsModal.setAttribute('aria-hidden', 'false');
}

// Salva as configurações globais da jornada
function saveSettings(e) {
    e.preventDefault();
    const newTitle = settingsTitleInput.value.trim();
    const newStartDate = settingsStartDateInput.value;
    const newTotalDays = parseInt(settingsTotalDaysInput.value, 10) || 30;
    
    const oldTotalDays = state.settings.totalDays;

    // Alerta se estiver diminuindo a quantidade de dias
    if (newTotalDays < oldTotalDays) {
        if (!confirm(`Você está reduzindo o total de dias de ${oldTotalDays} para ${newTotalDays}. As notas dos dias ${newTotalDays + 1} em diante serão perdidas permanentemente. Deseja continuar?`)) {
            return;
        }
    }

    state.settings.title = newTitle || "Minha Viagem";
    state.settings.startDate = newStartDate;
    state.settings.totalDays = newTotalDays;

    localStorage.setItem('daytrack_settings', JSON.stringify(state.settings));

    // Ajusta o array de dias baseado nas novas configurações
    adjustDaysArray();

    updateUI();
    closeAllModals();
}

// Reinicia todos os dados do rastreador
function resetAllData() {
    if (confirm("ATENÇÃO: Isso apagará permanentemente todos os dias registrados e notas! Deseja continuar?")) {
        localStorage.removeItem('daytrack_days');
        localStorage.removeItem('daytrack_settings');
        
        // Reseta o estado local
        state.settings = {
            title: "Minha Viagem",
            startDate: getTodayDateStr(),
            totalDays: 30
        };
        state.days = [];

        localStorage.setItem('daytrack_settings', JSON.stringify(state.settings));
        adjustDaysArray();

        updateUI();
        closeAllModals();
    }
}

// Salva o array de dias no LocalStorage
function saveDaysState() {
    localStorage.setItem('daytrack_days', JSON.stringify(state.days));
}

// Fecha todos os modais ativos
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    });
}

// Inicializa a aplicação ao carregar o DOM
document.addEventListener('DOMContentLoaded', init);
