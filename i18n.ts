export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // Navbar
    nav: {
      start: '시작하기',
    },
    // Hero
    hero: {
      badge: 'SUPANOVA 2.0 NOW LIVE',
      title1: '상상하는 그대로',
      title2: '디자인이 현실로.',
      description: 'AI와 함께하는 디자인의 새로운 시작.',
      description2: '복잡한 과정 없이, 아이디어 하나로 충분합니다.',
      placeholder: '어떤 웹사이트를 만들고 싶으신가요?',
    },
    // Quick Tags
    tags: {
      portfolio: '✨ 포트폴리오',
      shopping: '🛒 쇼핑몰',
      startup: '🏢 스타트업',
    },
    // Gallery
    gallery: {
      title: 'Supanova로 만든 랜딩페이지',
      remixes: 'remixes',
    },
    // CTA
    cta: {
      title: '준비 되셨나요?',
      description: '지금 바로 시작하세요. 아이디어만 있으면 됩니다.',
      button: '지금 시작하기',
    },
    // Footer
    footer: {
      description: 'Supanova는 AI 기술을 통해 누구나 상상하는 디자인을',
      description2: '현실로 만들 수 있도록 돕는 디자인 파트너입니다.',
      company: '상호명: 솔로프리너',
      businessNo: '사업자 등록번호: 386-16-02242',
      salesNo: '통신판매업 신고번호: 2024-서울금천-1059',
      copyright: '© 2025 Supanova Design. All rights reserved.',
    },
  },
  en: {
    // Navbar
    nav: {
      start: 'Get Started',
    },
    // Hero
    hero: {
      badge: 'SUPANOVA 2.0 NOW LIVE',
      title1: 'Design as you',
      title2: 'imagine it.',
      description: 'A new beginning of design with AI.',
      description2: 'No complex process. Just one idea is enough.',
      placeholder: 'What website would you like to create?',
    },
    // Quick Tags
    tags: {
      portfolio: '✨ Portfolio',
      shopping: '🛒 E-commerce',
      startup: '🏢 Startup',
    },
    // Gallery
    gallery: {
      title: 'Landing Pages Made with Supanova',
      remixes: 'remixes',
    },
    // CTA
    cta: {
      title: 'Ready to start?',
      description: 'Start now. All you need is an idea.',
      button: 'Get Started',
    },
    // Footer
    footer: {
      description: 'Supanova is your AI-powered design partner',
      description2: 'that turns imagination into reality.',
      company: 'Company: Solopreneur',
      businessNo: 'Business Registration: 386-16-02242',
      salesNo: 'E-commerce License: 2024-Seoul-Geumcheon-1059',
      copyright: '© 2025 Supanova Design. All rights reserved.',
    },
  },
};

export function detectLanguage(): Language {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ko')) {
      return 'ko';
    }
  }
  return 'en';
}

export function getTranslation(lang: Language) {
  return translations[lang];
}

