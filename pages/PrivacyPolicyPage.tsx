import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import logoLight from '../img/logo_lightmode.png';
import logoDark from '../img/logo_darkmode.png';

interface PrivacyPolicyPageProps {
  onNavigateBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigateBack }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">돌아가기</span>
            </button>
            <img src={logoLight} alt="Supanova" className="h-7 w-auto dark:hidden" />
            <img src={logoDark} alt="Supanova" className="h-7 w-auto hidden dark:block" />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">개인정보처리방침</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">최종 수정일: 2025년 12월 31일</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              솔로프리너(이하 '회사'라 함)은 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </div>

          {/* 제1조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제1조 (개인정보의 처리 목적)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>서비스 제공 및 계약 이행</li>
              <li>이벤트 및 행사 안내</li>
            </ul>
          </section>

          {/* 제2조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지</li>
              <li><strong>재화 또는 서비스 제공:</strong> 서비스 공급완료 및 요금결제·정산 완료시까지</li>
              <li><strong>법령에서 정한 기간</strong></li>
            </ul>
          </section>

          {/* 제3조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제3조 (개인정보의 수집 항목 및 수집 방법)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집하고 있습니다.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">수집항목</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>필수항목:</strong> 이메일 주소, 이름</li>
                <li><strong>선택항목:</strong> 없음</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">수집방법</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                <li>웹사이트 회원가입</li>
              </ul>
            </div>
          </section>

          {/* 제4조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제4조 (개인정보의 제3자 제공)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다. 현재 회사는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다.
            </p>
          </section>

          {/* 제5조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제5조 (개인정보처리 위탁)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>위탁받는 자(수탁자):</strong> Supabase</li>
                <li><strong>위탁하는 업무의 내용:</strong> 로그인, 회원가입 기능 구현 및 데이터 저장</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
            </p>
          </section>

          {/* 제6조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제6조 (정보주체와 법정대리인의 권리·의무 및 그 행사방법)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다. 정보주체는 개인정보 보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
            </p>
          </section>

          {/* 제7조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제7조 (개인정보의 파기)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li>
                <strong>파기절차:</strong> 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
              </li>
              <li>
                <strong>파기방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
              </li>
            </ul>
          </section>

          {/* 제8조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제8조 (개인정보의 안전성 확보 조치)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
              <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
              <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
            </ul>
          </section>

          {/* 제9조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제9조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다. 쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게 보내는 소량의 정보이며 이용자의 PC 컴퓨터 내의 하드디스크에 저장되기도 합니다.
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li>
                <strong>쿠키의 사용 목적:</strong> 이용자가 방문한 각 서비스와 웹 사이트들에 대한 방문 및 이용형태, 인기 검색어, 보안접속 여부 등을 파악하여 이용자에게 최적화된 정보 제공을 위해 사용됩니다.
              </li>
              <li>
                <strong>쿠키의 설치·운영 및 거부:</strong> 웹브라우저 상단의 도구 &gt; 인터넷 옵션 &gt; 개인정보 메뉴의 옵션 설정을 통해 쿠키 저장을 거부할 수 있습니다.
              </li>
              <li>
                쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 제10조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제10조 (개인정보 보호책임자)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">개인정보 보호책임자</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>성명:</strong> 김승권</li>
                <li><strong>직책:</strong> 대표</li>
                <li><strong>연락처:</strong> 010-7565-9060, tuemarz@gmail.com</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">개인정보 보호 담당자</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>담당부서:</strong> 개인정보보호팀</li>
                <li><strong>연락처:</strong> 상기 개인정보 보호책임자에게 연락바랍니다.</li>
              </ul>
            </div>
          </section>

          {/* 제11조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제11조 (개인정보 열람청구)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              정보주체는 개인정보 보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">개인정보 열람청구 접수·처리 부서</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>부서명:</strong> 고객센터</li>
                <li><strong>담당자:</strong> 김승권</li>
                <li><strong>연락처:</strong> 010-7565-9060, tuemarz@gmail.com</li>
              </ul>
            </div>
          </section>

          {/* 제12조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제12조 (권익침해 구제방법)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li><strong>개인정보분쟁조정위원회:</strong> 1833-6972 (www.kopico.go.kr)</li>
              <li><strong>개인정보침해신고센터:</strong> 118 (privacy.kisa.or.kr)</li>
              <li><strong>대검찰청:</strong> 1301 (www.spo.go.kr)</li>
              <li><strong>경찰청:</strong> 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>

          {/* 제13조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제13조 (개인정보 유출 통지)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              회사는 개인정보의 유출이 발생한 경우에는 지체 없이 해당 정보주체에게 그 사실을 알리고, 개인정보 보호법 제34조에 따라 관계기관에 신고하겠습니다.
            </p>
          </section>

          {/* 제14조 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제14조 (개인정보 처리방침 변경)</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              이 개인정보처리방침은 <strong>2025년 12월 31일</strong>부터 적용됩니다.
            </p>
          </section>
        </div>

        {/* Contact Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">문의하기</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              개인정보 처리와 관련하여 문의사항이 있으시면 아래 연락처로 문의해주세요.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a href="mailto:tuemarz@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                tuemarz@gmail.com
              </a>
              <a href="tel:010-7565-9060" className="text-blue-600 dark:text-blue-400 hover:underline">
                010-7565-9060
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};




