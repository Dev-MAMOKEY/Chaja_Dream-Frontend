const TRANSLATIONS = {
    ko: {
        nav_home: "홈",
        nav_search: "AI 탐색",
        nav_benefit: "맞춤 혜택",
        nav_alert: "알림",
        hero_label: "AI 복지 탐색 서비스",
        hero_title: "내 복지,<br>AI가 찾아드립니다",
        hero_desc: "상황만 말해주세요. 5분 안에 받을 수 있는 모든 복지 혜택을 찾아드려요.",
        hero_cta: "지금 바로 시작하기",
        hero_badge1: "쉬운 로그인",
        hero_badge2: "완전 무료",
        hero_badge3: "5분 소요",
        hero_badge4: "380+ 복지 연동",
        sit_label: "빠르게 시작해보세요!",
        sit_title: "어떤 상황이신가요?",
        sit_card1_title: "실직 / 구직 중",
        sit_card1_desc: "취업지원, 실업급여, 구직촉진수당",
        sit_card2_title: "주거 지원 필요",
        sit_card2_desc: "청년 월세, 전세대출, 공공임대",
        sit_card3_title: "출산 / 육아",
        sit_card3_desc: "아동수당, 출산지원금, 양육비 지원",
        sit_card4_title: "의료비 부담",
        sit_card4_desc: "의료급여, 건강보험료 감면",
        sit_card5_title: "노인 / 장애인",
        sit_card5_desc: "기초연금, 장기요양, 돌봄서비스",
        sit_card6_title: "교육비",
        sit_card6_desc: "장학금, 학자금 대출, 교육급여",
        news_label: "이달의 새 소식",
        news_title: "새로운 복지 뉴스",
        news_card1_title: "2025 청년도약계좌 확대",
        news_card1_desc: "월 70만원 저축 시 정부 기여금 최대 6%, 만 19~34세 대상",
        news_card2_title: "서울시 청년 교통비 지원 확대",
        news_card2_desc: "연 최대 72만 포인트로 상향, 신청 기간 5월 30일까지",
        news_card3_title: "외국인 근로자 산재보험 확대",
        news_card3_desc: "미등록 외국인 포함 전 외국인 근로자 산재보험 적용",
        news_more: "내가 해당되는지 확인 →",
        steps_label: "이용 방법",
        steps_title: "딱 3단계면 끝나요!",
        step1_title: "상황 입력",
        step1_desc: "AI가 질문하면 선택지를 누르거나 직접 입력해서 5분 이내로 필요한 복지혜택 파악!",
        step2_title: "결과 확인",
        step2_desc: "받을 수 있는 복지 목록과 월 예상 수령액을 즉시 확인 가능!",
        step3_title: "바로 신청",
        step3_desc: "필요한 서류를 자동 안내 해주고 신청 링크를 직접 연결!",
        bottom_cta: "아직도 안 했다면 지금 바로 시작하기"
    },
    en: {
        nav_home: "Home",
        nav_search: "AI Search",
        nav_benefit: "Benefits",
        nav_alert: "Alerts",
        hero_label: "AI Welfare Search Service",
        hero_title: "Your Welfare,<br>Found by AI",
        hero_desc: "Just tell us your situation. We'll find all the benefits you can receive within 5 minutes.",
        hero_cta: "Get Started Now",
        hero_badge1: "Easy Login",
        hero_badge2: "Completely Free",
        hero_badge3: "Takes 5 Mins",
        hero_badge4: "380+ Welfare Linked",
        sit_label: "Get Started Quickly!",
        sit_title: "What is your situation?",
        sit_card1_title: "Unemployed / Job Seeker",
        sit_card1_desc: "Employment support, Unemployment benefit, Job search allowance",
        sit_card2_title: "Need Housing Support",
        sit_card2_desc: "Youth monthly rent, Housing loan, Public rental",
        sit_card3_title: "Childbirth / Parenting",
        sit_card3_desc: "Child allowance, Birth support, Childcare support",
        sit_card4_title: "Medical Expense Burden",
        sit_card4_desc: "Medical benefits, Health insurance reduction",
        sit_card5_title: "Elderly / Disabled",
        sit_card5_desc: "Basic pension, Long-term care, Care service",
        sit_card6_title: "Education Expenses",
        sit_card6_desc: "Scholarship, Student loan, Education benefit",
        news_label: "Monthly News",
        news_title: "New Welfare News",
        news_card1_title: "2025 Youth Leap Account Expansion",
        news_card1_desc: "Up to 6% gov contribution for 700k KRW/mo savings, ages 19-34",
        news_card2_title: "Seoul Youth Transit Support Expanded",
        news_card2_desc: "Up to 720k points/year, apply by May 30",
        news_card3_title: "Industrial Accident Insurance for Foreigners",
        news_card3_desc: "Covers all foreign workers including unregistered",
        news_more: "Check if I'm eligible →",
        steps_label: "How to Use",
        steps_title: "Just 3 Steps!",
        step1_title: "Enter Situation",
        step1_desc: "Answer AI's questions or type directly to find benefits within 5 minutes!",
        step2_title: "Check Results",
        step2_desc: "Instantly check list of benefits and expected monthly receipts!",
        step3_title: "Apply Now",
        step3_desc: "Auto-guidance for documents and direct application links!",
        bottom_cta: "If you haven't yet, start right now"
    }
};

let currentLang = localStorage.getItem('lang') || 'ko';
const API_BASE_URL = "https://unable-subgroup-deniable.ngrok-free.dev";
let dynamicNews = [];

async function fetchWelfareNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/welfare/news?pageNo=1&numOfRows=3`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        if (!response.ok) throw new Error("Network response was not ok");
        dynamicNews = await response.json();
        renderNews();
    } catch (error) {
        console.error("Error fetching news:", error);
    }
}

function renderNews() {
    const updateGrid = document.querySelector('.update-grid');
    if (!updateGrid || dynamicNews.length === 0) return;

    updateGrid.innerHTML = ''; // Clear existing
    dynamicNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'update-card';
        card.innerHTML = `
            <span class="new-badge">NEW</span>
            <h4>${item.serviceName}</h4>
            <p>${item.description}</p>
            <a href="${item.link}" target="_blank" class="more-link">${TRANSLATIONS[currentLang].news_more}</a>
        `;
        updateGrid.appendChild(card);
    });
}

function updateUIByLanguage() {
    const t = TRANSLATIONS[currentLang];
    
    // Navbar
    const navLinks = document.querySelectorAll('nav a');
    navLinks[0].textContent = t.nav_home;
    navLinks[1].textContent = t.nav_search;
    navLinks[2].textContent = t.nav_benefit;
    navLinks[3].textContent = t.nav_alert;
    document.getElementById('lang-toggle').textContent = currentLang === 'ko' ? 'EN' : 'KO';
    
    // Hero
    document.querySelector('.hero-label').textContent = t.hero_label;
    document.querySelector('.hero-title').innerHTML = t.hero_title;
    document.querySelector('.hero-desc').textContent = t.hero_desc;
    document.querySelector('.hero .cta-button').childNodes[0].textContent = t.hero_cta + ' ';
    const heroBadges = document.querySelectorAll('.hero-badges span');
    heroBadges[0].textContent = t.hero_badge1;
    heroBadges[1].textContent = t.hero_badge2;
    heroBadges[2].textContent = t.hero_badge3;
    heroBadges[3].textContent = t.hero_badge4;
    
    // Situation
    document.querySelector('.situation .section-label').textContent = t.sit_label;
    document.querySelector('.situation .section-title').textContent = t.sit_title;
    const sitCards = document.querySelectorAll('.situation-card');
    sitCards[0].querySelector('h4').textContent = t.sit_card1_title;
    sitCards[0].querySelector('p').textContent = t.sit_card1_desc;
    sitCards[1].querySelector('h4').textContent = t.sit_card2_title;
    sitCards[1].querySelector('p').textContent = t.sit_card2_desc;
    sitCards[2].querySelector('h4').textContent = t.sit_card3_title;
    sitCards[2].querySelector('p').textContent = t.sit_card3_desc;
    sitCards[3].querySelector('h4').textContent = t.sit_card4_title;
    sitCards[3].querySelector('p').textContent = t.sit_card4_desc;
    sitCards[4].querySelector('h4').textContent = t.sit_card5_title;
    sitCards[4].querySelector('p').textContent = t.sit_card5_desc;
    sitCards[5].querySelector('h4').textContent = t.sit_card6_title;
    sitCards[5].querySelector('p').textContent = t.sit_card6_desc;
    
    // News
    document.querySelector('.updates .section-label').textContent = t.news_label;
    document.querySelector('.updates .section-title').textContent = t.news_title;
    
    if (dynamicNews.length > 0) {
        renderNews();
    } else {
        const updateCards = document.querySelectorAll('.update-card');
        if (updateCards.length > 0) {
            updateCards[0].querySelector('h4').textContent = t.news_card1_title;
            updateCards[0].querySelector('p').textContent = t.news_card1_desc;
            updateCards[0].querySelector('.more-link').textContent = t.news_more;
        }
        if (updateCards.length > 1) {
            updateCards[1].querySelector('h4').textContent = t.news_card2_title;
            updateCards[1].querySelector('p').textContent = t.news_card2_desc;
            updateCards[1].querySelector('.more-link').textContent = t.news_more;
        }
        if (updateCards.length > 2) {
            updateCards[2].querySelector('h4').textContent = t.news_card3_title;
            updateCards[2].querySelector('p').textContent = t.news_card3_desc;
            updateCards[2].querySelector('.more-link').textContent = t.news_more;
        }
    }
    
    // Steps
    document.querySelector('.steps .section-label').textContent = t.steps_label;
    document.querySelector('.steps .section-title').textContent = t.steps_title;
    const stepItems = document.querySelectorAll('.step-item');
    stepItems[0].querySelector('h4').textContent = t.step1_title;
    stepItems[0].querySelector('p').textContent = t.step1_desc;
    stepItems[1].querySelector('h4').textContent = t.step2_title;
    stepItems[1].querySelector('p').textContent = t.step2_desc;
    stepItems[2].querySelector('h4').textContent = t.step3_title;
    stepItems[2].querySelector('p').textContent = t.step3_desc;
    
    // Bottom CTA
    document.querySelector('.bottom-cta .cta-button').childNodes[0].textContent = t.bottom_cta + ' ';
    
    // HTML lang attribute
    document.documentElement.lang = currentLang;
}

document.addEventListener('DOMContentLoaded', () => {
    updateUIByLanguage();
    fetchWelfareNews();
    
    const langToggleBtn = document.getElementById('lang-toggle');
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'ko' ? 'en' : 'ko';
        localStorage.setItem('lang', currentLang);
        updateUIByLanguage();
    });

    // Smooth scroll for nav links (if they had IDs)
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href;
                if (targetId === '#') return;
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});
