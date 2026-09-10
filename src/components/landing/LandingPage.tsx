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

          {/* Quick Metrics */}
          <div className="mt-12 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-white/80 border border-stone-200/80 shadow-2xs">
              <span className="block text-2xl sm:text-3xl font-bold text-stone-900 font-serif">12,000+</span>
              <span className="text-xs text-stone-600 font-medium">{t('landing', 'statsMessages')}</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 border border-stone-200/80 shadow-2xs">
              <span className="block text-2xl sm:text-3xl font-bold text-rose-600 font-serif">850+</span>
              <span className="text-xs text-stone-600 font-medium">{t('landing', 'statsEvents')}</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 border border-stone-200/80 shadow-2xs">
              <span className="block text-2xl sm:text-3xl font-bold text-amber-700 font-serif">25,000+</span>
              <span className="text-xs text-stone-600 font-medium">{t('landing', 'statsPhotos')}</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 border border-stone-200/80 shadow-2xs">
              <span className="block text-2xl sm:text-3xl font-bold text-emerald-700 font-serif">100%</span>
              <span className="text-xs text-stone-600 font-medium">{t('landing', 'statsInstant')}</span>
            </div>
          </div>

          {/* Preview Teaser Frame */}
          <div className="mt-14 max-w-5xl mx-auto relative">
            <div className="rounded-2xl p-2 sm:p-3 bg-stone-900/5 shadow-2xl border border-stone-200">
              <div className="rounded-xl overflow-hidden bg-white border border-stone-200/80 shadow-inner">
                {/* Mock Browser Header */}
                <div className="h-10 bg-stone-100 border-b border-stone-200 px-4 flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                  </div>
                  <div className="px-3 py-1 bg-white rounded-md border border-stone-200 text-stone-600 font-mono text-[11px] truncate max-w-[280px]">
                    https://guestbook.app/g/wedding-nika-ana
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{lang === 'ka' ? 'ცოცხალი დემო' : 'Live & Interactive'}</span>
                  </div>
                </div>

                {/* Mock Card Preview Header */}
                <div className="p-6 sm:p-8 bg-[#FFF1F2] border-b border-rose-100 text-center">
                  <span className="text-xs uppercase tracking-widest text-rose-800 font-bold">
                    {lang === 'ka' ? 'ქორწილის ზეიმი' : 'WEDDING CELEBRATION'}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                    {lang === 'ka' ? 'ნიკასა და ანას ქორწილი' : 'Nika & Ana Wedding'}
                  </h3>
                  <p className="text-sm text-stone-600 mt-1">
                    {lang === 'ka' ? '15 სექტემბერი, 2026 • მასპინძლები: ნიკა და ანა' : 'September 15, 2026 • Hosted by Nika & Ana'}
                  </p>
                  <p className="text-xs text-rose-900/80 italic mt-2 max-w-md mx-auto">
                    {lang === 'ka'
                      ? '„მოგესალმებით ჩვენს საქორწილო სტუმრების წიგნში ❤️ დაგვიტოვეთ თბილი სურვილები და ფოტოები, რომლებიც სამუდამოდ გაგვახარებს.“'
                      : '“Welcome to our wedding guest book ❤️ Leave us a message or photo that we can keep forever.”'}
                  </p>
                </div>

                {/* Sample Grid items */}
                <div className="p-6 bg-stone-50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-stone-900">ელენე და გიორგი</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 font-medium border border-amber-200/60">
                        {lang === 'ka' ? 'ოჯახის წევრი' : 'Family'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      თქვენს ცხოვრებაში დაიწყო ყველაზე ლამაზი თავი! გისურვებთ ულევ სიყვარულს, ბედნიერებას და ურთიერთგაგებას ყოველ ნაბიჯზე! ❤️🥂
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 font-medium">❤️ 14</span>
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">🎉 8</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-stone-900">David Miller</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
                        {lang === 'ka' ? 'მეგობარი' : 'Friend'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      To an incredible couple! So grateful to be part of your story and to celebrate this special day with you both! ✨
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 font-medium">❤️ 19</span>
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">👏 12</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-stone-900">მარიამ კ.</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-medium border border-purple-200/60">
                        {lang === 'ka' ? 'კოლეგა' : 'Colleague'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      ანა და ნიკა, ულამაზესი წყვილი ხართ! ძალიან გვიხარია თქვენი ბედნიერება. მუდამ ასე იბრწყინეთ! 🥰🍾
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 font-medium">🥰 9</span>
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">❤️ 11</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Testimonials */}
      <section className="py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
            {lang === 'ka' ? 'მასპინძლების შეფასებები' : 'TRUSTED BY HOSTS WORLDWIDE'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2 mb-12">
            {lang === 'ka' ? 'რას ამბობენ ჩვენი მომხმარებლები' : 'Cherished by Happy Couples & Organizers'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {'★★★★★'}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                {lang === 'ka'
                  ? '„ჩვენს სტუმრებს ძალიან მოეწონათ მაგიდებზე QR კოდის დასკანერება! შევაგროვეთ 140-ზე მეტი თბილი მილოცვა და ცოცხალი ფოტო, რომელიც ფოტოგრაფსაც კი არ ჰქონდა გადაღებული.“'
                  : '“Our guests loved scanning the table cards! We collected over 140 heartfelt photos and funny videos that our official photographer didn’t catch.”'}
              </p>
              <div className="mt-4 pt-4 border-t border-stone-200/60">
                <span className="block text-xs font-semibold text-stone-900">ანა და ნიკა გ.</span>
                <span className="block text-[11px] text-stone-500">{lang === 'ka' ? 'ქორწილი თბილისში' : 'Wedding in Tbilisi'}</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {'★★★★★'}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                {lang === 'ka'
                  ? '„Memoria-ს ვიყენებთ ჩვენს ბუტიკ-სასტუმროში კახეთში. დამსვენებლები ტოვებენ ულამაზეს შთაბეჭდილებებსა და ფოტოებს QR კოდის საშუალებით პირდაპირ კოტეჯებიდან.“'
                  : '“We use Memoria for our boutique vineyard hotel. Visitors leave lovely reviews and photos directly through the QR code in each cottage.”'}
              </p>
              <div className="mt-4 pt-4 border-t border-stone-200/60">
                <span className="block text-xs font-semibold text-stone-900">{lang === 'ka' ? 'შატო კახური' : 'Villa Kakhuri'}</span>
                <span className="block text-[11px] text-stone-500">{lang === 'ka' ? 'სასტუმრო და მარანი' : 'Boutique Hotel & Estate'}</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {'★★★★★'}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                {lang === 'ka'
                  ? '„მოდერაციის ფუნქცია შეუცვლელი აღმოჩნდა ჩვენი კომპანიის საიუბილეო საღამოზე. მილოცვები წინასწარ მოწმდებოდა და ეკრანებზე პირდაპირ ეთერში გადიოდა!“'
                  : '“The moderation feature was a lifesaver for our company anniversary gala. It allowed our communications team to curate messages live on the ballroom screens!”'}
              </p>
              <div className="mt-4 pt-4 border-t border-stone-200/60">
                <span className="block text-xs font-semibold text-stone-900">ლევან თ.</span>
                <span className="block text-[11px] text-stone-500">{lang === 'ka' ? 'ივენთ მენეჯერი' : 'Corporate Events Manager'}</span>
              </div>
            </div>
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

      {/* Footer */}
      <footer className="py-10 bg-stone-950 text-stone-400 text-xs border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-sm tracking-tight">Memoria</span>
            <span>— {t('landing', 'footerTagline')}</span>
          </div>
          <div className="text-stone-500">
            © {new Date().getFullYear()} Memoria. {t('landing', 'footerRights')}
          </div>
        </div>
      </footer>
    </div>
  );
};
