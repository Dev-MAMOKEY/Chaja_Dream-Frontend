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

/**
 * [STATE MANAGEMENT] 앱 전체의 데이터와 현재 상태를 추적
 * 백엔드가 없는 프로토타입이므로 브라우저 메모리에 일시적으로 저장함
 */
let chats = [];         // 전체 상담 정보를 담은 배열 (각 상담은 id, title, messages[]를 가짐)
let activeChatId = null; // 현재 사용자가 보고 있는 대화창의 고유 ID(timestamp 기반)

// 챗봇이 처음 등장할 때 보여줄 고정 문구 및 레이아웃
const GREETING_TEXT = "안녕하세요! 😊 저는 복지ON AI예요. 몇 가지만 여쭤보면 받을 수 있는 복지 혜택을 모두 찾아드릴게요. 먼저, 지금 혼자 사시나요? 아니면 가족과 함께 사시나요?";

// HTML 템플릿: 봇 프로필, 메시지 거품, TTS 버튼, 시간을 포함함
const GREETING_HTML = `
    <div class="message-wrapper">
        <div class="bot-profile-sm">🤖</div>
        <div class="message-content">
            <div class="bubble">${GREETING_TEXT}</div>
            <div class="action-row">
                <!-- TTS 버튼: 클릭 시 해당 텍스트를 음성으로 변환 -->
                <button class="voice-btn" onclick="toggleTTS(this, '${GREETING_TEXT}')">
                    <span class="material-symbols-outlined" style="font-size:18px">volume_up</span>
                </button>
                <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        </div>
    </div>
    <!-- 선택지 버튼: 사용자가 타이핑 대신 클릭하여 응답 가능하게 함 -->
    <div class="options">
        <button class="opt-btn" onclick="sendMessage(this.textContent)">혼자 살아요</button>
        <button class="opt-btn" onclick="sendMessage(this.textContent)">부모님과 함께 살아요</button>
        <button class="opt-btn" onclick="sendMessage(this.textContent)">배우자/자녀와 함께 살아요</button>
        <button class="opt-btn" onclick="sendMessage(this.textContent)">기타</button>
    </div>
`;

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
 * [HISTORY DATA LOGIC] 상담 기록의 생성, 출력, 수정, 삭제 기능 구현
 */

// '+ 새 대화' 생성: 새로운 상담 객체를 만들고 목록 최상단에 배치
function startNewChat() {
    const newId = Date.now(); // 현재 시간을 고유 식별자로 활용
    const newChat = {
        id: newId,
        title: `새로운 상담 ${chats.length + 1}`, // 자동 제목 생성 (새로운 상담)
        messages: [GREETING_HTML]        // 기본 환영 인사로 시작
    };
    chats.unshift(newChat); // 배열의 맨 앞에 추가
    activeChatId = newId;   // 새 대화를 활성화 상태로 변경
    renderHistory();        // 왼쪽 목록 다시 그리기
    renderChat();           // 오른쪽 대화창 다시 그리기
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
    if (confirm('이 상담 기록을 삭제하시겠습니까?')) {
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

// 사용자 메시지 전송: 입력값을 가공하여 화면에 추가하고 데이터에 저장
function sendMessage(text) {
    if (!text.trim() || !activeChatId) return; // 내용이 없거나 선택된 상담이 없으면 무시

    const chat = chats.find(c => c.id === activeChatId);
    
    // 첫 메시지일 경우 상담 제목 업데이트 (입력 내용으로 바로 변경)
    if (chat && chat.messages.length === 1) {
        const truncatedText = text.length > 15 ? text.substring(0, 15) + '...' : text;
        chat.title = truncatedText;
        renderHistory();
    }

    // 오른쪽 정렬된 사용자용 말풍선 템플릿
    const userMsg = `
        <div class="message-wrapper" style="justify-content: flex-end;">
            <div class="bubble" style="background: var(--primary-color); color: white; border-radius: 15px 0 15px 15px;">
                ${text}
            </div>
        </div>
    `;
    
    chat.messages.push(userMsg); // 데이터에 저장
    
    renderChat(); // 화면 갱신
    chatInput.value = ''; // 입력창 비우기
    document.getElementById('char-count').textContent = '0/500'; // 글자수 카운트 초기화
}

/**
 * [VOICE RECOGNITION & SYNTHESIS] 음성 관련 기능 구현
 */

// TTS (Text-to-Speech): 브라우저 기본 음성 합성 엔진으로 글자를 읽어줌
function toggleTTS(btn, text) {
    btn.classList.toggle('active'); // 읽는 중임을 표시
    if (btn.classList.contains('active')) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR'; // 한국어 설정
        utterance.onend = () => btn.classList.remove('active'); // 읽기가 끝나면 아이콘 복구
        window.speechSynthesis.speak(utterance);
    } else {
        window.speechSynthesis.cancel(); // 중단 시 음성 즉시 종료
    }
}

// STT (Speech-to-Text): 마이크 입력을 텍스트로 변환하여 채팅창에 입력
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    
    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('active')) recognition.stop();
        else { recognition.start(); micBtn.classList.add('active'); }
    });
    
    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript; // 음성 인식 결과값 추출
        chatInput.value = text;
        micBtn.classList.remove('active');
        sendMessage(text); // 인식된 텍스트를 즉시 전송
    };
    recognition.onend = () => micBtn.classList.remove('active');
}

/**
 * [GLOBAL EVENT LISTENERS] 사용자의 실시간 동작 감지
 */
newChatBtn.addEventListener('click', startNewChat); // 새 상담 버튼
sendBtn.addEventListener('click', () => sendMessage(chatInput.value)); // 전송 버튼 클릭

// 엔터 키 입력 시 전송 기능 제공 (사용자 편의성)
chatInput.addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') sendMessage(chatInput.value); 
});

// 타이핑할 때마다 글자 수 실시간 업데이트
chatInput.addEventListener('input', () => {
    document.getElementById('char-count').textContent = `${chatInput.value.length}/500`;
});

/**
 * [INITIALIZATION] 페이지 로드 시 최초 1회 실행
 */
startNewChat(); // 접속하자마자 첫 번째 상담이 시작되도록 설정

// URL 파라미터 확인 및 자동 메시지 전송 기능
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');
    
    if (topic) {
        let autoMsg = "";
        switch(topic) {
            case 'job':
                autoMsg = "현재 실직 중이거나 구직 활동을 하고 있습니다. 제가 받을 수 있는 취업 지원금이나 관련 복지 혜택이 무엇인지 궁금해요.";
                break;
            case 'housing':
                autoMsg = "주거 지원이 필요한 상황입니다. 청년 월세 지원이나 전세 대출 등 주거 관련 복지 혜택에 대해 알려주세요.";
                break;
            case 'parenting':
                autoMsg = "출산 및 육아와 관련된 복지 혜택을 알아보고 싶습니다. 아동수당이나 양육비 지원 등 어떤 도움을 받을 수 있을까요?";
                break;
            case 'medical':
                autoMsg = "의료비 부담이 커서 도움이 필요합니다. 의료급여나 건강보험료 감면 등 의료 관련 복지 제도를 안내해 주세요.";
                break;
            case 'senior':
                autoMsg = "노인 또는 장애인 복지 혜택에 대해 알고 싶습니다. 기초연금이나 돌봄 서비스 등 제가 신청 가능한 혜택이 있을까요?";
                break;
            case 'education':
                autoMsg = "교육비 지원이 필요합니다. 장학금, 학자금 대출 또는 교육급여 등 교육 관련 복지 혜택을 알려주세요.";
                break;
        }
        
        if (autoMsg) {
            // 약간의 지연을 주어 환영 인사가 먼저 나오고 유저 메시지가 나오도록 함
            setTimeout(() => {
                sendMessage(autoMsg);
            }, 500);
        }
    }
});
