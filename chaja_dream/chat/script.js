/**
 * [TRANSLATIONS] multi-language support (KO/EN)
 */
const TRANSLATIONS = {
    ko: {
        nav_home: "홈",
        nav_search: "AI 탐색",
        nav_benefit: "맞춤 혜택",
        nav_alert: "알림",
        sidebar_title: "상담 기록",
        new_chat: "+ 새 대화",
        chat_header_title: "복지혜택 AI 챗봇",
        chat_header_desc: "몇 가지 질문에 답하면 맞춤 복지 혜택을 추천해드려요.",
        input_placeholder: "상황을 입력하거나 버튼을 선택해 주세요",
        greeting: "안녕하세요! 😊 저는 복지ON AI예요. 몇 가지만 여쭤보면 받을 수 있는 복지 혜택을 모두 찾아드릴게요. 무엇을 도와드릴까요?",
        loading: "입력 중...",
        error_api: "죄송합니다. 오류가 발생했습니다: ",
        delete_confirm: "이 상담 기록을 삭제하시겠습니까?",
        new_chat_title: "새로운 상담",
        voice_start: "음성 인식을 시작합니다.",
        voice_stop: "음성 인식을 종료합니다."
    },
    en: {
        nav_home: "Home",
        nav_search: "AI Search",
        nav_benefit: "Benefits",
        nav_alert: "Alerts",
        sidebar_title: "History",
        new_chat: "+ New Chat",
        chat_header_title: "Welfare AI Chatbot",
        chat_header_desc: "Answer a few questions to find your custom benefits.",
        input_placeholder: "Enter your situation or select a button",
        greeting: "Hello! 😊 I'm Welfare ON AI. Answer a few questions and I'll find all the benefits you can get. How can I help you?",
        loading: "Typing...",
        error_api: "Sorry, an error occurred: ",
        delete_confirm: "Delete this chat history?",
        new_chat_title: "New Chat",
        voice_start: "Voice recognition started.",
        voice_stop: "Voice recognition stopped."
    }
};

let currentLang = localStorage.getItem('lang') || 'ko';

function updateUIByLanguage() {
    const t = TRANSLATIONS[currentLang];
    
    // Navbar
    const navLinks = document.querySelectorAll('nav a');
    navLinks[0].textContent = t.nav_home;
    navLinks[1].textContent = t.nav_search;
    navLinks[2].textContent = t.nav_benefit;
    navLinks[3].textContent = t.nav_alert;
    document.getElementById('lang-toggle').textContent = currentLang === 'ko' ? 'EN' : 'KO';
    
    // Sidebar
    document.querySelector('.sidebar-header span').textContent = t.sidebar_title;
    document.getElementById('new-chat-btn').textContent = t.new_chat;
    
    // Chat Header
    document.querySelector('.bot-info strong').textContent = t.chat_header_title;
    document.querySelector('.bot-info p').textContent = t.chat_header_desc;
    
    // Input
    document.getElementById('chat-input').placeholder = t.input_placeholder;
    
    // HTML lang attribute
    document.documentElement.lang = currentLang;
}

/**
 * [ELEMENTS] HTML 문서에서 제어할 주요 요소들을 불러와 변수에 저장
 */
const sidebar = document.getElementById('sidebar');             // 상담 기록 사이드바 본체
const toggleBtn = document.getElementById('toggle-sidebar');       // 사이드바 접기/펴기 버튼
const chatWindow = document.getElementById('chat-window');       // 대화 내용이 표시되는 창
const chatInput = document.getElementById('chat-input');         // 사용자가 글자를 입력하는 입력창
const sendBtn = document.getElementById('send-btn');             // 메시지 전송 버튼
const newChatBtn = document.getElementById('new-chat-btn');       // '+ 새 대화' 생성 버튼
const micBtn = document.getElementById('mic-btn');               // 음성 인식 시작/종료 버튼
const historyList = document.getElementById('history-list');     // 왼쪽 사이드바의 상담 목록 리스트(ul)
const langToggleBtn = document.getElementById('lang-toggle');   // 언어 전환 버튼

/**
 * [API CONFIGURATION]
 */
const API_BASE_URL = "https://bockji.duckdns.org";

const INITIAL_STATE = {
    phase: "intake",
    policies: [],
    selected_policy: {},
    conditions: {},
    lang: currentLang
};

/**
 * [STATE MANAGEMENT] 앱 전체의 데이터와 현재 상태를 추적
 */
let chats = [];         // 전체 상담 정보를 담은 배열 (각 상담은 id, title, messages[], state, apiHistory)
let activeChatId = null; // 현재 사용자가 보고 있는 대화창의 고유 ID(timestamp 기반)

/**
 * [SIDEBAR CONTROL] 사이드바 노출 및 숨김 제어
 */
function toggleSidebar() {
    sidebar.classList.toggle('collapsed'); // .collapsed 클래스를 추가/제거하여 CSS 애니메이션 실행
    const icon = toggleBtn.querySelector('span');
    if (icon) {
        // 사이드바 상태에 따라 화살표 방향을 변경하여 직관성 부여
        icon.textContent = sidebar.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
    }
}

// 펴진 상태에서의 접기 버튼 클릭 이벤트
toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 버튼 클릭이 사이드바 자체 클릭 이벤트로 전파되는 것을 막음
    toggleSidebar();
});

// 접힌 상태에서의 사이드바 영역 클릭 이벤트: 어디를 눌러도 다시 펴지도록 사용자 배려
sidebar.addEventListener('click', () => {
    if (sidebar.classList.contains('collapsed')) toggleSidebar();
});

/**
 * [LANGUAGE CONTROL]
 */
langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('lang', currentLang);
    updateUIByLanguage();
    
    // If no chats yet, restart to show greeting in new language
    if (chats.length === 0) {
        startNewChat();
    } else {
        // Optionally update existing chat state lang
        const chat = chats.find(c => c.id === activeChatId);
        if (chat) {
            chat.state.lang = currentLang;
        }
    }
});

/**
 * [HISTORY DATA LOGIC] 상담 기록의 생성, 출력, 수정, 삭제 기능 구현
 */

// API 호출 함수 (재시도 로직 포함)
async function callChatApi(message, history, state, retryCount = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, state, lang: currentLang })
        });

        if (response.status === 200) {
            return await response.json();
        } else if (response.status === 503 && retryCount < 3) {
            // 503 에러 시 3초 후 재시도
            await new Promise(resolve => setTimeout(resolve, 3000));
            return callChatApi(message, history, state, retryCount + 1);
        } else {
            const errorData = await response.json().catch(() => ({ detail: "서버 오류가 발생했습니다." }));
            // 상세 에러 내용을 문자열로 변환하여 확인 가능하게 함
            const errorMsg = typeof errorData.detail === 'object' 
                ? JSON.stringify(errorData.detail) 
                : errorData.detail || "서버 오류";
            throw new Error(errorMsg);
        }
    } catch (error) {
        if (retryCount < 3 && error.message.includes("Failed to fetch")) {
             // 네트워크 오류 시에도 재시도 가능
             await new Promise(resolve => setTimeout(resolve, 3000));
             return callChatApi(message, history, state, retryCount + 1);
        }
        throw error;
    }
}

// '+ 새 대화' 생성: 새로운 상담 객체를 만들고 목록 최상단에 배치
async function startNewChat() {
    const t = TRANSLATIONS[currentLang];
    const newId = Date.now(); // 현재 시간을 고유 식별자로 활용
    const newChat = {
        id: newId,
        title: `${t.new_chat_title} ${chats.length + 1}`, // 자동 제목 생성
        messages: [],        
        apiHistory: [],      // API 통신용 대화 기록 (string[])
        state: JSON.parse(JSON.stringify({...INITIAL_STATE, lang: currentLang})), // API 통신용 상태 객체
        isFirstMessage: true // 첫 번째 사용자 메시지 여부 추적
    };
    chats.unshift(newChat); // 배열의 맨 앞에 추가
    activeChatId = newId;   // 새 대화를 활성화 상태로 변경
    
    renderHistory();        // 왼쪽 목록 다시 그리기
    renderChat();           // 오른쪽 대화창 다시 그리기

    // 프론트엔드 고정 인사말 없이 즉시 AI API 호출하여 첫 메시지 수신
    const loadingId = addLoadingMessage(newChat);
    try {
        const trigger = currentLang === 'ko' ? "안녕하세요" : "Hello";
        const result = await callChatApi(trigger, [], newChat.state); 
        removeLoadingMessage(newChat, loadingId);
        
        newChat.state = result.state;
        newChat.apiHistory = result.history;
        addBotMessage(result.reply, newChat, result.state);
    } catch (error) {
        console.error("Initial API Error:", error);
        removeLoadingMessage(newChat, loadingId);
        addBotMessage(`${t.error_api}${error.message}`, newChat);
    }
    
    renderChat();
}

// 왼쪽 목록 렌더링: chats 배열의 데이터를 기반으로 HTML 리스트를 만듦
function renderHistory() {
    historyList.innerHTML = ''; // 기존 목록 비우기
    chats.forEach(chat => {
        const li = document.createElement('li');
        if (chat.id === activeChatId) li.className = 'active'; // 선택된 상담은 강조 표시
        
        li.onclick = () => switchChat(chat.id); // 목록 클릭 시 해당 대화로 전환
        
        li.innerHTML = `
            <span class="chat-title">${chat.title}</span>
            <div class="history-actions">
                <!-- 수정 버튼: 제목 변경 모드 진입 -->
                <button class="action-btn" onclick="startRename(${chat.id}, event)">
                    <span class="material-symbols-outlined" style="font-size:16px">edit</span>
                </button>
                <!-- 삭제 버튼: 상담 기록 완전 제거 -->
                <button class="action-btn delete-btn" onclick="deleteHistory(${chat.id}, event)">
                    <span class="material-symbols-outlined" style="font-size:16px">delete</span>
                </button>
            </div>
        `;
        historyList.appendChild(li);
    });
}

// 상담 전환: 활성 ID를 바꾸고 화면을 갱신함
function switchChat(id) {
    activeChatId = id;
    renderHistory();
    renderChat();
}

// 이름 수정 모드: 텍스트를 입력창(input)으로 교체하여 직접 타이핑 가능하게 함
function startRename(id, event) {
    event.stopPropagation(); // 부모(li)의 전환 이벤트 실행 방지
    const chat = chats.find(c => c.id === id);
    const li = event.target.closest('li');
    const span = li.querySelector('.chat-title');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = chat.title;
    
    // 포커스를 잃거나 엔터를 치면 수정 완료 처리
    input.onblur = () => finishRename(id, input.value);
    input.onkeypress = (e) => { if(e.key === 'Enter') finishRename(id, input.value); };
    
    span.replaceWith(input); // 기존 제목 대신 입력창 노출
    input.focus();
}

// 이름 수정 완료: 입력된 값을 데이터에 저장하고 다시 렌더링
function finishRename(id, newTitle) {
    const chat = chats.find(c => c.id === id);
    if (newTitle.trim()) chat.title = newTitle.trim();
    renderHistory();
}

// 상담 삭제: 목록에서 제거하고 다른 상담으로 포커스를 옮김
function deleteHistory(id, event) {
    event.stopPropagation();
    const t = TRANSLATIONS[currentLang];
    if (confirm(t.delete_confirm)) {
        chats = chats.filter(c => c.id !== id);
        if (activeChatId === id) {
            // 현재 보던 상담을 지웠다면 가장 최신 상담으로 이동
            activeChatId = chats.length > 0 ? chats[0].id : null;
        }
        renderHistory();
        renderChat();
    }
}

/**
 * [CHAT WINDOW LOGIC] 대화창 내의 메시지 흐름 제어
 */

// 대화창 업데이트: 현재 활성화된 상담의 모든 메시지를 화면에 출력
function renderChat() {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) {
        chatWindow.innerHTML = '';
        return;
    }
    chatWindow.innerHTML = chat.messages.join(''); // 저장된 HTML 문자열들을 합쳐서 출력
    chatWindow.scrollTop = chatWindow.scrollHeight; // 새로운 내용이 보이도록 항상 최하단으로 스크롤
}

// 사용자 메시지 추가
function addUserMessage(text, chat) {
    const userMsg = `
        <div class="message-wrapper" style="justify-content: flex-end;">
            <div class="bubble" style="background: var(--primary-color); color: white; border-radius: 15px 0 15px 15px;">
                ${text}
            </div>
        </div>
    `;
    chat.messages.push(userMsg);
}

// 봇 메시지 추가 (텍스트 및 상태에 따른 추가 요소 포함)
function formatMessage(text) {
    if (!text) return '';
    
    let formatted = text;

    // 1. 볼드 처리 (**텍스트**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 2. 리스트 처리 (줄 시작이 - )
    const lines = formatted.split(/\r?\n/);
    let inList = false;
    let newLines = [];

    for (let line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('- ')) {
            if (!inList) {
                newLines.push('<ul style="margin: 10px 0; padding-left: 20px;">');
                inList = true;
            }
            newLines.push(`<li style="margin-bottom: 5px;">${trimmedLine.substring(2)}</li>`);
        } else {
            if (inList) {
                newLines.push('</ul>');
                inList = false;
            }
            newLines.push(line);
        }
    }
    if (inList) newLines.push('</ul>');
    formatted = newLines.join('\n');

    // 3. 문단 및 줄바꿈 처리
    // \n\n -> 문단 구분 (여백이 있는 div로 변환)
    // \n -> 줄바꿈 (<br>로 변환)
    formatted = formatted.replace(/\n\n/g, '<div style="margin-bottom: 12px;"></div>');
    formatted = formatted.replace(/\n/g, '<br>');

    // 4. 링크 처리 (마크다운 [텍스트](URL) 및 일반 URL)
    formatted = formatted.replace(/\[([^\]]+)\]\s*\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" style="color: #007bff; text-decoration: underline; font-weight: bold;">$1</a>');
    formatted = formatted.replace(/(^|[^"'])((https?|ftp):\/\/[^\s"<>]+)/g, '$1<a href="$2" target="_blank" style="color: #007bff; text-decoration: underline;">$2</a>');

    return formatted;
}

function addBotMessage(text, chat, state = null) {
    let optionsHtml = '';
    
    // phase가 selection이고 policies가 있는 경우 정책 카드 렌더링
    if (state && state.phase === 'selection' && state.policies && state.policies.length > 0) {
        optionsHtml = '<div class="options" style="margin-left: 38px; flex-direction: column; align-items: flex-start;">';
        state.policies.forEach(policy => {
            optionsHtml += `
                <div class="policy-card" style="background: white; border: 1px solid #ddd; border-radius: 12px; padding: 15px; margin-bottom: 10px; width: 80%; transition: 0.2s;">
                    <div onclick="sendMessage('${policy.name}')" style="cursor: pointer;">
                        <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 5px;">${policy.name}</div>
                        <div style="font-size: 13px; color: #555; margin-bottom: 5px;">${policy.benefit}</div>
                        <div style="font-size: 11px; color: #999;">${policy.scope}</div>
                    </div>
                    ${policy.url ? `
                        <a href="${policy.url}" target="_blank" style="font-size: 12px; color: #007bff; text-decoration: none; margin-top: 8px; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                            상세보기 <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
                        </a>
                    ` : ''}
                </div>
            `;
        });
        optionsHtml += '</div>';
    }

    const formattedText = formatMessage(text);
    const botMsg = `
        <div class="message-wrapper">
            <div class="bot-profile-sm">🤖</div>
            <div class="message-content">
                <div class="bubble">${formattedText}</div>
                <div class="action-row">
                    <button class="voice-btn" onclick="toggleTTS(this, '${text.replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined" style="font-size:18px">volume_up</span>
                    </button>
                    <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
        </div>
        ${optionsHtml}
    `;
    chat.messages.push(botMsg);
}

// 로딩 표시 추가
function addLoadingMessage(chat) {
    const loadingId = 'loading-' + Date.now();
    const loadingMsg = `
        <div class="message-wrapper" id="${loadingId}">
            <div class="bot-profile-sm">🤖</div>
            <div class="message-content">
                <div class="bubble">
                    <div class="typing-indicator"></div>
                </div>
            </div>
        </div>
    `;
    chat.messages.push(loadingMsg);
    renderChat();
    return loadingId;
}

// 로딩 표시 제거
function removeLoadingMessage(chat, loadingId) {
    chat.messages = chat.messages.filter(msg => !msg.includes(loadingId));
}

// 사용자 메시지 전송 및 API 연동
async function sendMessage(text) {
    if (!text.trim() || !activeChatId) return;

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;
    
    // 첫 메시지일 경우 상담 제목 업데이트
    if (chat.isFirstMessage) {
        const truncatedText = text.length > 15 ? text.substring(0, 15) + '...' : text;
        chat.title = truncatedText;
        chat.isFirstMessage = false; // 제목 업데이트 후 플래그 해제
        renderHistory();
    }

    // UI에 사용자 메시지 추가
    addUserMessage(text, chat);
    renderChat();
    
    chatInput.value = '';
    document.getElementById('char-count').textContent = '0/500';

    // 로딩 표시
    const loadingId = addLoadingMessage(chat);
    const t = TRANSLATIONS[currentLang];
    
    try {
        const result = await callChatApi(text, chat.apiHistory, chat.state);
        
        // 결과 업데이트
        chat.state = result.state;
        chat.apiHistory = result.history;
        
        // 로딩 제거 및 봇 응답 추가
        removeLoadingMessage(chat, loadingId);
        addBotMessage(result.reply, chat, result.state);
        
    } catch (error) {
        console.error("API Error:", error);
        removeLoadingMessage(chat, loadingId);
        addBotMessage(`${t.error_api}${error.message}`, chat);
    }
    
    renderChat();
}

/**
 * [VOICE RECOGNITION & SYNTHESIS] 음성 관련 기능 구현
 */

// TTS (Text-to-Speech)
function toggleTTS(btn, text) {
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'ko' ? 'ko-KR' : 'en-US';
        utterance.onend = () => btn.classList.remove('active');
        window.speechSynthesis.speak(utterance);
    } else {
        window.speechSynthesis.cancel();
    }
}

// STT (Speech-to-Text)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang === 'ko' ? 'ko-KR' : 'en-US';
    
    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('active')) recognition.stop();
        else { recognition.start(); micBtn.classList.add('active'); }
    });
    
    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        chatInput.value = text;
        micBtn.classList.remove('active');
        sendMessage(text);
    };
    recognition.onend = () => micBtn.classList.remove('active');
}

/**
 * [GLOBAL EVENT LISTENERS]
 */
newChatBtn.addEventListener('click', startNewChat);
sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

chatInput.addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') sendMessage(chatInput.value); 
});

chatInput.addEventListener('input', () => {
    document.getElementById('char-count').textContent = `${chatInput.value.length}/500`;
});

/**
 * [INITIALIZATION]
 */
updateUIByLanguage();
startNewChat();

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');
    
    if (topic) {
        let autoMsg = "";
        if (currentLang === 'ko') {
            switch(topic) {
                case 'job': autoMsg = "현재 실직 중이거나 구직 활동을 하고 있습니다. 제가 받을 수 있는 취업 지원금이나 관련 복지 혜택이 무엇인지 궁금해요."; break;
                case 'housing': autoMsg = "주거 지원이 필요한 상황입니다. 청년 월세 지원이나 전세 대출 등 주거 관련 복지 혜택에 대해 알려주세요."; break;
                case 'parenting': autoMsg = "출산 및 육아와 관련된 복지 혜택을 알아보고 싶습니다. 아동수당이나 양육비 지원 등 어떤 도움을 받을 수 있을까요?"; break;
                case 'medical': autoMsg = "의료비 부담이 커서 도움이 필요합니다. 의료급여나 건강보험료 감면 등 의료 관련 복지 제도를 안내해 주세요."; break;
                case 'senior': autoMsg = "노인 또는 장애인 복지 혜택에 대해 알고 싶습니다. 기초연금이나 돌봄 서비스 등 제가 신청 가능한 혜택이 있을까요?"; break;
                case 'education': autoMsg = "교육비 지원이 필요합니다. 장학금, 학자금 대출 또는 교육급여 등 교육 관련 복지 혜택을 알려주세요."; break;
            }
        } else {
            switch(topic) {
                case 'job': autoMsg = "I am currently unemployed or looking for a job. I want to know about employment subsidies or related welfare benefits I can receive."; break;
                case 'housing': autoMsg = "I need housing support. Please tell me about housing-related welfare benefits such as youth monthly rent support or deposit loans."; break;
                case 'parenting': autoMsg = "I want to find out about welfare benefits related to childbirth and childcare. What help can I get, such as child allowance or childcare support?"; break;
                case 'medical': autoMsg = "I need help because of high medical costs. Please guide me on medical-related welfare systems such as medical benefits or health insurance premium reductions."; break;
                case 'senior': autoMsg = "I want to know about welfare benefits for the elderly or disabled. Are there any benefits I can apply for, such as basic pension or care services?"; break;
                case 'education': autoMsg = "I need educational support. Please tell me about education-related welfare benefits such as scholarships, student loans, or educational benefits."; break;
            }
        }
        
        if (autoMsg) {
            setTimeout(() => {
                sendMessage(autoMsg);
            }, 500);
        }
    }
});
