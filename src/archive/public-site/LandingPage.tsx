import React from 'react';
import {
  QrCode,
  Heart,
  Camera,
  ShieldCheck,
  Palette,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Download,
  Share2,
  Calendar,
  MessageSquareHeart,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { MemoryBookShowcase } from './MemoryBookShowcase.tsx';

interface LandingPageProps {
  onOpenCreate: () => void;
  onViewDemo: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenCreate,
  onViewDemo,
  onOpenAuth
}) => {
  const { t, lang } = useI18n();
  const ka = lang === 'ka';
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: '01',
      title: t('landing', 'step1Title'),
      desc: t('landing', 'step1Desc')
    },
    {
      num: '02',
      title: t('landing', 'step2Title'),
      desc: t('landing', 'step2Desc')
    },
    {
      num: '03',
      title: t('landing', 'step3Title'),
      desc: t('landing', 'step3Desc')
    },
    {
      num: '04',
      title: t('landing', 'step4Title'),
      desc: t('landing', 'step4Desc')
    }
  ];

  const features = [
    {
      icon: <MessageSquareHeart className="w-6 h-6 text-rose-600" />,
      title: t('landing', 'featureMessagesTitle'),
      desc: t('landing', 'featureMessagesDesc')
    },
    {
      icon: <Camera className="w-6 h-6 text-amber-600" />,
      title: t('landing', 'featurePhotosTitle'),
      desc: t('landing', 'featurePhotosDesc')
    },
    {
      icon: <QrCode className="w-6 h-6 text-indigo-600" />,
      title: t('landing', 'featureQrTitle'),
      desc: t('landing', 'featureQrDesc')
    },
    {
      icon: <Palette className="w-6 h-6 text-emerald-600" />,
      title: t('landing', 'featureDesignTitle'),
      desc: t('landing', 'featureDesignDesc')
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: t('landing', 'featureModerationTitle'),
      desc: t('landing', 'featureModerationDesc')
    },
    {
      icon: <Lock className="w-6 h-6 text-stone-700" />,
      title: t('landing', 'featurePrivacyTitle'),
      desc: t('landing', 'featurePrivacyDesc')
    }
  ];

  const faqs = [
    {
      q: t('landing', 'faq1Q'),
      a: t('landing', 'faq1A')
    },
    {
      q: t('landing', 'faq2Q'),
      a: t('landing', 'faq2A')
    },
    {
      q: t('landing', 'faq3Q'),
      a: t('landing', 'faq3A')
    },
    {
      q: t('landing', 'faq4Q'),
      a: t('landing', 'faq4A')
    }
  ];

  return (
    <div className="w-full bg-stone-50 text-stone-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-stone-200/70 bg-gradient-to-b from-amber-50/40 via-white to-stone-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200/80 text-xs font-semibold text-stone-800 mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('landing', 'badge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-stone-900 tracking-tight max-w-4xl mx-auto leading-[1.12]">
            {lang === 'ka' ? (
              <>
                მოგონებები, რომლებიც <span className="italic text-rose-600 font-serif">სამუდამოდ</span> რჩება
              </>
            ) : (
              <>
                Turn Every Message Into a <span className="italic text-rose-600 font-serif">Memory</span>
              </>
            )}
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            {t('landing', 'heroSubtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              id="hero-create-btn"
              onClick={onOpenCreate}
              className="w-full sm:w-auto px-7 py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <span>{t('landing', 'createBook')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              id="hero-demo-btn"
              onClick={onViewDemo}
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-stone-100 text-stone-800 font-semibold text-sm sm:text-base rounded-xl border border-stone-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>{t('landing', 'viewDemo')}</span>
            </button>
          </div>

          {/* Verifiable product facts — no usage numbers we cannot evidence. */}
          <ul className="mt-12 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              {
                title: ka ? 'QR კოდი ან ბმული' : 'QR code or link',
                desc: ka
                  ? 'სტუმარს აპლიკაციის ჩამოტვირთვა არ სჭირდება — ბრაუზერშივე წერს.'
                  : 'Guests need no app — they write straight from the browser.'
              },
              {
                title: ka ? 'ფოტო და ვიდეო' : 'Photos and video',
                desc: ka
                  ? 'ერთ ჩანაწერზე 10 მბ-მდე ფოტო და 100 მბ-მდე ვიდეო.'
                  : 'Up to 10 MB per photo and 100 MB per video on an entry.'
              },
              {
                title: ka ? 'მოდერაცია და ექსპორტი' : 'Moderation and export',
                desc: ka
                  ? 'დაამტკიცეთ ჩანაწერები გამოქვეყნებამდე და ჩამოტვირთეთ ყველაფერი CSV-ად.'
                  : 'Approve entries before they appear, and download everything as CSV.'
              }
            ].map((item) => (
              <li
                key={item.title}
                className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs"
              >
                <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                <span className="mt-1 block text-xs text-stone-700 leading-relaxed">{item.desc}</span>
              </li>
            ))}
          </ul>

          {/* Luxury Interactive Memory Book Showcase */}
          <div className="mt-14 max-w-5xl mx-auto relative">
            <MemoryBookShowcase
              onViewDemo={onViewDemo}
              onCreateBook={onOpenCreate}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
              {lang === 'ka' ? 'მარტივი და მოსახერხებელი' : 'SIMPLE & EFFORTLESS'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
              {t('landing', 'howItWorksTitle')}
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-3">
              {lang === 'ka'
                ? '4 მარტივი ნაბიჯი თქვენი სტუმრების მილოცვებისა და ფოტოების სამუდამოდ შესანახად.'
                : 'Four straightforward steps to turn guest well-wishes into a permanent interactive celebration.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-stone-300 transition-all shadow-xs"
              >
                <div className="text-3xl font-serif font-bold text-stone-300 mb-4">
                  {step.num}
                </div>
                <h3 className="text-base font-semibold text-stone-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 bg-stone-50 border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
              {lang === 'ka' ? 'სრულყოფილი შესაძლებლობები' : 'DESIGNED FOR PERFECTION'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
              {t('landing', 'featuresTitle')}
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-3">
              {t('landing', 'featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200/80 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-stone-50 border-b border-stone-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
              {lang === 'ka' ? 'კითხვები და პასუხები' : 'FREQUENTLY ASKED'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
              {t('landing', 'faqTitle')}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-stone-200/80 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-medium text-stone-900 text-sm sm:text-base hover:bg-stone-50/60 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-500 transition-transform ${
                      openFaq === index ? 'rotate-180 text-stone-900' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-24 bg-stone-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">
            {t('landing', 'readyTitle')}
          </h2>
          <p className="mt-4 text-stone-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('landing', 'readySubtitle')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="footer-create-btn"
              onClick={onOpenCreate}
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('landing', 'startNowBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="footer-demo-btn"
              onClick={onViewDemo}
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl border border-stone-700 transition-all cursor-pointer"
            >
              {t('landing', 'viewDemo')}
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
