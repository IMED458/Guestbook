import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ka' | 'en';

export const RELATIONSHIPS_TRANSLATIONS: Record<string, { en: string; ka: string }> = {
  Friend: { en: 'Friend', ka: 'მეგობარი' },
  Family: { en: 'Family', ka: 'ოჯახის წევრი' },
  Colleague: { en: 'Colleague', ka: 'კოლეგა' },
  Neighbor: { en: 'Neighbor', ka: 'მეზობელი' },
  Guest: { en: 'Guest', ka: 'სტუმარი' },
  Relative: { en: 'Relative', ka: 'ნათესავი' },
  Partner: { en: 'Partner', ka: 'პარტნიორი' },
  Other: { en: 'Other', ka: 'სხვა' },
};

export const EVENT_TYPES_TRANSLATIONS: Record<string, { en: string; ka: string }> = {
  wedding: { en: 'Wedding', ka: 'ქორწილი' },
  birthday: { en: 'Birthday', ka: 'დაბადების დღე' },
  party: { en: 'Celebration / Party', ka: 'წვეულება / ზეიმი' },
  corporate: { en: 'Corporate Event', ka: 'კორპორატიული ღონისძიება' },
  hotel: { en: 'Hotel / Airbnb / Venue', ka: 'სასტუმრო / რესტორანი / სივრცე' },
  memorial: { en: 'Memorial / Tribute', ka: 'სამახსოვრო / ხსოვნა' },
  other: { en: 'Other Event', ka: 'სხვა ღონისძიება' },
};

export const THEME_PRESET_TRANSLATIONS: Record<string, { name: { en: string; ka: string }; desc: { en: string; ka: string } }> = {
  classic: {
    name: { en: 'Classic', ka: 'კლასიკური' },
    desc: { en: 'Warm ivory canvas with refined serif & golden warmth', ka: 'თბილი სპილოსძვლისფერი ტილო დახვეწილი შრიფტითა და ოქროსფერი ელფერით' }
  },
  elegant: {
    name: { en: 'Elegant', ka: 'ელეგანტური' },
    desc: { en: 'Crisp slate neutral, high-contrast typography & clean borders', ka: 'მკვეთრი ნეიტრალური ფონი, კონტრასტული ტიპოგრაფია და სუფთა ხაზები' }
  },
  minimal: {
    name: { en: 'Minimal', ka: 'მინიმალისტური' },
    desc: { en: 'Clean stark white, monochromatic aesthetic & generous space', ka: 'სუფთა თეთრი ფერი, მონოქრომული ესთეტიკა და თავისუფალი სივრცე' }
  },
  romantic: {
    name: { en: 'Romantic', ka: 'რომანტიკული' },
    desc: { en: 'Blush rose tones, soft rounded cards & emotional editorial font', ka: 'ნაზი ვარდისფერი ტონები, მომრგვალებული ბარათები და ემოციური შრიფტი' }
  },
  dark: {
    name: { en: 'Dark', ka: 'მუქი' },
    desc: { en: 'Deep onyx night, luminous accents & modern contrast', ka: 'ღრმა ონიქსის მუქი ფონი, ნათელი აქცენტები და თანამედროვე კონტრასტი' }
  },
  luxury: {
    name: { en: 'Luxury', ka: 'ლუქსი' },
    desc: { en: 'Midnight navy with rich champagne gold accents & serif heading', ka: 'მუქი ლურჯი ტილო შამპანურის ოქროსფერი დეტალებითა და საზეიმო შრიფტით' }
  },
  pastel: {
    name: { en: 'Pastel', ka: 'პასტელური' },
    desc: { en: 'Gentle lavender & soft berry tones for playful celebrations', ka: 'ნაზი ლავანდისფერი და კენკროვანი ტონები მხიარული ზეიმისთვის' }
  }
};

const GEORGIAN_MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const translations = {
  ka: {
    // საერთო / Common
    common: {
      save: 'შენახვა',
      cancel: 'გაუქმება',
      delete: 'წაშლა',
      edit: 'რედაქტირება',
      back: 'უკან',
      close: 'დახურვა',
      copy: 'კოპირება',
      copied: 'კოპირებულია!',
      download: 'ჩამოტვირთვა',
      share: 'გაზიარება',
      all: 'ყველა',
      loading: 'იტვირთება...',
      error: 'დაფიქსირდა შეცდომა',
      success: 'წარმატებით შესრულდა',
      required: 'სავალდებულოა',
      search: 'ძიება...',
      filter: 'ფილტრი',
      sort: 'დალაგება',
      newest: 'უახლესი',
      oldest: 'უძველესი',
      mostLoved: 'ყველაზე მოწონებული',
      preview: 'წინასწარი გადახედვა',
      confirmDelete: 'ნამდვილად გსურთ წაშლა?',
    },
    // ნავიგაცია / Navbar
    nav: {
      home: 'მთავარი',
      demoGuestbook: 'დემო წიგნი',
      adminDashboard: 'სამართავი პანელი',
      newGuestbook: 'ახალი წიგნი',
      demoAdmin: 'დემო ადმინი',
      login: 'შესვლა',
      getStarted: 'დაწყება',
      logout: 'გასვლა',
      language: 'ენა',
    },
    // ლენდინგი / Landing Page
    landing: {
      badge: 'თანამედროვე ციფრული სტუმრების წიგნი',
      heroTitle: 'მოგონებები, რომლებიც სამუდამოდ რჩება',
      heroSubtitle: 'თანამედროვე ციფრული სტუმრების წიგნი ქორწილებისთვის, დაბადების დღეებისთვის, წვეულებებისა და ღონისძიებებისთვის. შეაგროვეთ თბილი მილოცვები, მაღალი ხარისხის ფოტოები და რეაქციები მარტივი QR კოდით.',
      createBook: 'შექმენით თქვენი წიგნი',
      viewDemo: 'დემო ვერსიის ნახვა',
      statsMessages: 'გაზიარებული მილოცვა',
      statsEvents: 'ჩატარებული ღონისძიება',
      statsPhotos: 'ატვირთული ფოტო',
      statsInstant: 'მყისიერი QR წვდომა',
      featuresTitle: 'ყველაფერი, რაც თქვენს განსაკუთრებულ დღეს სჭირდება',
      featuresSubtitle: 'შექმნილია სტუმრების მარტივი გამოცდილებისთვის მობილურზე და მასპინძლების სრული კონტროლისთვის.',
      featureMessagesTitle: 'გულწრფელი მილოცვები',
      featureMessagesDesc: 'სტუმრები ტოვებენ თბილ სურვილებს, ემოციურ მოგონებებს და ულოცავენ მასპინძლებს თანამედროვე ვიზუალური კედლის მეშვეობით.',
      featurePhotosTitle: 'ფოტოები და მოგონებები',
      featurePhotosDesc: 'დააფიქსირეთ ზეიმის უნიკალური მომენტები სტუმრების თვალით, პირდაპირ მობილური კამერიდან მაღალი ხარისხით.',
      featureQrTitle: 'QR კოდები მაგიდებისთვის',
      featureQrDesc: 'დაბეჭდეთ QR კოდები მაგიდებზე ან ბანერებზე. სტუმრებს არ სჭირდებათ აპლიკაციის გადმოწერა — უბრალოდ ასკანერებენ კამერით.',
      featureModerationTitle: 'მასპინძლის მოდერაცია',
      featureModerationDesc: 'სურვილისამებრ ჩართეთ წინასწარი გადამოწმება. მილოცვა საჯარო გახდება მხოლოდ თქვენი თანხმობის შემდეგ.',
      featureDesignTitle: 'პერსონალური დიზაინი',
      featureDesignDesc: 'შეარჩიეთ თქვენი დღესასწაულის შესაფერისი ფერები, შრიფტები და ელეგანტური სტილები (ქორწილი, წვეულება, იუბილე).',
      featureExportTitle: 'სამახსოვრო წიგნი და ექსპორტი',
      featureExportDesc: 'ჩამოტვირთეთ ყველა მილოცვა და ფოტო, გააკეთეთ CSV ექსპორტი ან დაბეჭდეთ ულამაზესი სამახსოვრო ალბომი.',
      featurePrivacyTitle: 'პირადი და დაცული',
      featurePrivacyDesc: 'დაიცავით სტუმრების წიგნი პინ-კოდით ან პაროლით, რათა მასზე წვდომა მხოლოდ თქვენს მოწვეულ სტუმრებს ჰქონდეთ.',
      featureReactionsTitle: 'ცოცხალი რეაქციები',
      featureReactionsDesc: 'სტუმრებს შეუძლიათ ერთმანეთის მილოცვებზე რეაქციების გაგზავნა (❤️, 🥰, 😂, 👏, 🎉) რეალურ დროში.',
      howItWorksTitle: 'როგორ მუშაობს 4 მარტივ ნაბიჯში',
      step1Title: 'შექმენით თქვენი სტუმრების წიგნი',
      step1Desc: 'დააყენეთ თქვენი ღონისძიება წამებში. მოარგეთ ყდის ფოტო, მისასალმებელი ტექსტი და შეარჩიეთ დახვეწილი თემა.',
      step2Title: 'გააზიარეთ თქვენი QR კოდი',
      step2Desc: 'დაბეჭდეთ პერსონალური QR კოდი მაგიდებისთვის ან სადგამებისთვის. სტუმრები მყისიერად ასკანერებენ აპლიკაციის გარეშე.',
      step3Title: 'სტუმრები ტოვებენ მოგონებებს',
      step3Desc: 'მეგობრები და ოჯახის წევრები წერენ გულწრფელ სურვილებს, ტვირთავენ ფოტოებს და უგზავნიან ემოციურ რეაქციებს.',
      step4Title: 'შეინახეთ სამუდამოდ',
      step4Desc: 'გადახედეთ, მართეთ და ჩამოტვირთეთ თქვენი მოგონებები: გალერეის, CSV ცხრილის ან დასაბეჭდი ალბომის სახით.',
      eventCategoriesTitle: 'იდეალურია ნებისმიერი დღესასწაულისთვის',
      eventCategoriesSubtitle: 'მოარგეთ წიგნი თქვენს განსაკუთრებულ შემთხვევას',
      liveDemoTitle: 'იხილეთ რეალური დემო მაგალითი',
      liveDemoSubtitle: 'გამოსცადეთ სტუმრის პერსპექტივა: ნიკასა და ანას ქორწილის ციფრული წიგნი',
      openDemoBtn: 'დემო წიგნის გახსნა',
      faqTitle: 'ხშირად დასმული კითხვები',
      faq1Q: 'სჭირდებათ თუ არა სტუმრებს რაიმე აპლიკაციის გადმოწერა?',
      faq1A: 'არა! სტუმრები უბრალოდ ასკანერებენ მაგიდაზე არსებულ QR კოდს მობილურის კამერით და მაშინვე იხსნება სტუმრების წიგნი ბრაუზერში.',
      faq2Q: 'შემიძლია წინასწარ შევამოწმო მილოცვები საჯაროდ გამოჩენამდე?',
      faq2A: 'დიახ. შეგიძლიათ ჩართოთ მოდერაციის რეჟიმი და ყოველი შეტყობინება გამოჩნდება მხოლოდ მას შემდეგ, რაც მას ადმინისტრატორის პანელიდან დაამტკიცებთ.',
      faq3Q: 'შესაძლებელია თუ არა ფოტოების ატვირთვა?',
      faq3A: 'რა თქმა უნდა! სტუმრებს შეუძლიათ მილოცვასთან ერთად ატვირთონ თავიანთი გადაღებული ფოტოები მაღალი ხარისხით.',
      faq4Q: 'როგორ შევინახავ მოგონებებს ღონისძიების შემდეგ?',
      faq4A: 'შეგიძლიათ ნებისმიერ დროს ჩამოტვირთოთ ყველა მონაცემი CSV ფაილის სახით, შეინახოთ ფოტოები ან დაბეჭდოთ საზეიმო სამახსოვრო ალბომი PDF-ში.',
      readyTitle: 'მზად ხართ შეინახოთ თქვენი დღესასწაული?',
      readySubtitle: 'დაიწყეთ 2 წუთზე ნაკლებ დროში. სრულიად უფასოდ და მარტივად.',
      startNowBtn: 'დაიწყეთ ახლავე უფასოდ',
      footerRights: 'ყველა უფლება დაცულია.',
      footerTagline: 'თანამედროვე ციფრული მოგონებები ყველა განსაკუთრებული დღისთვის.'
    },
    // საჯარო წიგნის გვერდი / Guestbook Public View
    guestBook: {
      leaveWish: 'დატოვეთ მილოცვა',
      leaveWishSub: 'დაწერეთ თბილი სურვილი და გააზიარეთ ფოტოები',
      memoriesWall: 'მოგონებების კედელი',
      wishesCount: 'მილოცვა',
      photosCount: 'ფოტო',
      reactionsCount: 'რეაქცია',
      searchPlaceholder: 'მოძებნეთ მილოცვა ან სტუმარი...',
      allGuests: 'ყველა სტუმარი',
      photosOnly: 'მხოლოდ ფოტოები',
      noWishesYet: 'ჯერ მილოცვები არ არის',
      beTheFirst: 'იყავით პირველი სტუმარი, ვინც დატოვებს თბილ სურვილს და გააზიარებს მოგონებებს!',
      privateTitle: 'პირადი სტუმრების წიგნი',
      privateDesc: 'ეს სტუმრების წიგნი დაცულია მასპინძლის პაროლით. შეიყვანეთ კოდი მილოცვების სანახავად და დასატოვებლად.',
      passwordPlaceholder: 'შეიყვანეთ ღონისძიების პაროლი...',
      unlockBtn: 'წიგნის გახსნა',
      incorrectPassword: 'არასწორი პაროლია. გთხოვთ სცადოთ ხელახლა.',
      shareBtn: 'გაზიარება',
      backToHome: 'მთავარზე დაბრუნება',
      hostBadge: 'მასპინძელი',
      awaitingApproval: 'ელოდება მასპინძლის დამტკიცებას',
      adminManage: 'პანელში მართვა',
      welcomeFromHosts: 'მასპინძლების მისალმება',
    },
    // მილოცვის მოდალი / Leave Message Modal
    leaveMessage: {
      modalTitle: 'დატოვეთ მოგონება',
      modalSubtitle: 'თქვენი თბილი სიტყვები სამუდამოდ დარჩება სამახსოვროდ ❤️',
      nameLabel: 'თქვენი სახელი *',
      namePlaceholder: 'მაგ. გიორგი და ნინო',
      emailLabel: 'ელფოსტა (კონფიდენციალური - არასავალდებულო)',
      emailPlaceholder: 'მადლობის წერილის მისაღებად',
      emailHint: 'ჩანს მხოლოდ მასპინძლისთვის, საჯაროდ არასდროს გამოჩნდება.',
      relationshipLabel: 'კავშირი მასპინძლებთან',
      messageLabel: 'თქვენი მილოცვა და სურვილები *',
      messagePlaceholder: 'დაწერეთ თქვენი გულწრფელი სურვილები, თბილი მოგონება ან რჩევა...',
      addPhoto: 'ფოტოს მიმაგრება',
      changePhoto: 'ფოტოს შეცვლა',
      removePhoto: 'ფოტოს წაშლა',
      addVideo: 'ვიდეოს ბმული (არასავალდებულო)',
      videoPlaceholder: 'მაგ. YouTube ან Vimeo ბმული',
      chooseReaction: 'შეარჩიეთ რეაქცია',
      sendWish: 'მილოცვის გაგზავნა ❤️',
      sending: 'იგზავნება...',
      successTitle: 'გმადლობთ!',
      successModerated: 'თქვენი მილოცვა წარმატებით გაიგზავნა და გამოჩნდება მასპინძლის დამტკიცების შემდეგ ❤️',
      successInstant: 'თქვენი მილოცვა უკვე დაემატა სტუმრების წიგნის მოგონებების კედელს ❤️',
      writeAnother: 'სხვა მილოცვის დაწერა',
      done: 'მზადაა',
      photoSizeLimit: 'ფოტოს ზომა არ უნდა აღემატებოდეს 10 MB-ს.',
      photoError: 'ფოტოს წაკითხვა ვერ მოხერხდა. გთხოვთ სცადოთ სხვა სურათი.',
    },
    // გაზიარების მოდალი / Share Modal
    share: {
      title: 'სტუმრების წიგნის გაზიარება',
      subtitle: 'მოიწვიეთ სტუმრები სანახავად ან კამერით დასასკანერებლად',
      eventLink: 'ღონისძიების ბმული',
      copyLink: 'ბმულის კოპირება',
      copied: 'კოპირებულია!',
      downloadQrPng: 'QR კოდის ჩამოტვირთვა (PNG)',
      downloadQrSvg: 'ვექტორული QR (SVG)',
      scanHint: 'სტუმრები ასკანერებენ მობილურის კამერით — აპლიკაციის გადმოწერა არ სჭირდებათ.',
      socialShare: 'სწრაფი გაზიარება',
    },
    // ადმინ პანელი / Dashboard
    dashboard: {
      title: 'მასპინძლის სამართავი ცენტრი',
      activeBook: 'აქტიური სტუმრების წიგნი',
      switchBook: 'წიგნის არჩევა',
      viewPublic: 'საჯარო წიგნის ნახვა',
      newBookBtn: 'ახალი წიგნი',
      kpiMessages: 'სულ მილოცვა',
      kpiPhotos: 'ატვირთული ფოტო',
      kpiReactions: 'სტუმრების რეაქცია',
      kpiViews: 'გვერდის ნახვა',
      kpiPending: 'დასამტკიცებელი',
      kpiToday: 'დღევანდელი მილოცვა',
      tabOverview: 'მიმოხილვა',
      tabMessages: 'მილოცვები',
      tabMedia: 'მედია გალერეა',
      tabDesign: 'დიზაინი და თემა',
      tabQr: 'QR კოდი და გაზიარება',
      tabSettings: 'პარამეტრები',
      tabExport: 'ექსპორტი და ბეჭდვა',
      visitorsChart: 'სტუმრების აქტივობა (ბოლო 7 დღე)',
      messagesChart: 'მილოცვების დინამიკა (ბოლო 7 დღე)',
      filterAll: 'ყველა სტატუსი',
      filterPending: 'მოლოდინში',
      filterApproved: 'დამტკიცებული',
      filterHidden: 'დამალული',
      approveBtn: 'დამტკიცება',
      hideBtn: 'დამალვა',
      deleteBtn: 'წაშლა',
      searchMessages: 'მოძებნეთ ავტორით ან ტექსტით...',
      noMessagesMatching: 'შეტყობინებები ვერ მოიძებნა',
      exportCsvBtn: 'CSV ფაილის ჩამოტვირთვა',
      exportCsvDesc: 'ექსპორტი შეიცავს ყველა მილოცვას, ავტორს, პირად ელფოსტას, თარიღს და რეაქციების რაოდენობას.',
      printKeepsakeBtn: 'სამახსოვრო ალბომის ბეჭდვა',
      printKeepsakeDesc: 'ფორმატირებული წიგნი დასაბეჭდად ან PDF-ში შესანახად.',
      themeSettingsTitle: 'ვიზუალური თემა და დიზაინი',
      themeSettingsDesc: 'შეარჩიეთ ფერები, შრიფტები და ბარათების სტილი',
      presetLabel: 'დიზაინის პრესეტი',
      saveThemeBtn: 'დიზაინის შენახვა',
      saving: 'ინახება...',
      eventSettingsTitle: 'ღონისძიების პარამეტრები',
      eventTitleLabel: 'ღონისძიების სათაური',
      hostsLabel: 'მასპინძლების სახელები',
      dateLabel: 'ღონისძიების თარიღი',
      welcomeLabel: 'მისასალმებელი ტექსტი სტუმრებისთვის',
      moderationToggle: 'მოდერაციის რეჟიმი (ახალი მილოცვები გამოჩნდება მხოლოდ თქვენი დამტკიცების შემდეგ)',
      privacyToggle: 'პირადი წიგნი (დაიცავით წვდომა პაროლით)',
      passwordLabel: 'სტუმრების პაროლი',
      saveSettingsBtn: 'პარამეტრების შენახვა',
      deleteGuestBookTitle: 'სტუმრების წიგნის წაშლა',
      deleteGuestBookDesc: 'სტუმრების წიგნის წაშლა შეუქცევადია და წაშლის ყველა მილოცვასა და ფოტოს.',
      deleteGuestBookBtn: 'სტუმრების წიგნის წაშლა',
      confirmDeleteBook: 'დარწმუნებული ხართ, რომ გსურთ ამ სტუმრების წიგნის წაშლა?',
    },
    // ოსტატი / Wizard
    wizard: {
      title: 'ციფრული სტუმრების წიგნის შექმნა',
      stepDetails: 'ღონისძიების დეტალები',
      stepType: 'ღონისძიების ტიპი',
      stepHosts: 'მასპინძლები და სათაური',
      stepWelcome: 'მისასალმებელი ტექსტი',
      stepCover: 'ყდის ფოტო',
      stepTheme: 'თემა და სტილი',
      stepPrivacy: 'უსაფრთხოება და მოდერაცია',
      stepReview: 'გადამოწმება და გაშვება',
      titleInputLabel: 'ღონისძიების სათაური *',
      titlePlaceholder: 'მაგ. ნიკას და ანას ქორწილი',
      dateInputLabel: 'ღონისძიების თარიღი *',
      hostsInputLabel: 'მასპინძლების სახელები *',
      hostsPlaceholder: 'მაგ. ნიკა და ანა',
      welcomeInputLabel: 'მისასალმებელი ტექსტი სტუმრებისთვის',
      welcomePlaceholder: 'მოგესალმებით ჩვენს სტუმრების წიგნში! დაგვიტოვეთ თბილი სურვილი და გააზიარეთ ფოტოები...',
      coverUrlLabel: 'ყდის ფოტოს ბმული (URL)',
      moderationLabel: 'მოდერაციის ჩართვა',
      moderationSub: 'ახალი მილოცვები საჭიროებს თქვენს დამტკიცებას საჯაროდ გამოჩენამდე',
      privacyLabel: 'პირადი წიგნი პაროლით',
      privacySub: 'მხოლოდ ის სტუმრები შეძლებენ ნახვას, ვისაც პაროლს გაუზიარებთ',
      passwordInputLabel: 'პაროლი სტუმრებისთვის',
      nextBtn: 'შემდეგი',
      prevBtn: 'უკან',
      createBtn: 'სტუმრების წიგნის შექმნა',
      creatingBtn: 'იქმნება...',
    },
    // ავტორიზაცია / Auth
    auth: {
      welcomeBack: 'მოგესალმებით',
      welcomeBackSub: 'შედით სისტემაში წიგნებისა და მოგონებების სამართავად',
      createAccount: 'მასპინძლის ანგარიშის შექმნა',
      createAccountSub: 'დაიწყეთ მოგონებების შენახვა თქვენი დღესასწაულისთვის',
      demoLoginBtn: 'დემო ანგარიშით შესვლა (ერთი დაწკაპებით)',
      demoNotice: 'სწრაფი წვდომა მზა საქორწილო სტუმრების წიგნითა და მილოცვებით',
      emailLabel: 'ელფოსტის მისამართი',
      passwordLabel: 'პაროლი (მინიმუმ 6 სიმბოლო)',
      nameLabel: 'თქვენი სახელი / მასპინძლები',
      signInBtn: 'შესვლა',
      signUpBtn: 'რეგისტრაცია',
      noAccount: 'არ გაქვთ ანგარიში? დარეგისტრირდით',
      haveAccount: 'უკვე გაქვთ ანგარიში? შედით',
      submitting: 'მიმდინარეობს...',
    },
    // ბეჭდვა / Print
    print: {
      commemorativeBook: 'სამახსოვრო სტუმრების წიგნი',
      hosts: 'მასპინძლები',
      eventDate: 'თარიღი',
      totalMemories: 'სულ მილოცვა',
      formattedForPrint: 'მილოცვა მომზადებული დასაბეჭდად',
      printOrSavePdf: 'დაბეჭდვა ან PDF-ში შენახვა',
      backToDashboard: 'პანელზე დაბრუნება',
      guestName: 'სტუმარი',
      relationship: 'კავშირი',
      date: 'თარიღი',
      page: 'გვერდი',
      recordedOn: 'ჩაწერილია',
    }
  },
  en: {
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      close: 'Close',
      copy: 'Copy',
      copied: 'Copied!',
      download: 'Download',
      share: 'Share',
      all: 'All',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      required: 'Required',
      search: 'Search...',
      filter: 'Filter',
      sort: 'Sort',
      newest: 'Newest',
      oldest: 'Oldest',
      mostLoved: 'Most Loved',
      preview: 'Preview',
      confirmDelete: 'Are you sure you want to delete this?',
    },
    // Navbar
    nav: {
      home: 'Home',
      demoGuestbook: 'Demo Guest Book',
      adminDashboard: 'Admin Dashboard',
      newGuestbook: 'New Guest Book',
      demoAdmin: 'Demo Admin',
      login: 'Log In',
      getStarted: 'Get Started',
      logout: 'Log Out',
      language: 'Language',
    },
    // Landing Page
    landing: {
      badge: 'Next-Gen Digital Guest Book',
      heroTitle: 'Memories That Last Forever',
      heroSubtitle: 'Modern digital guest book for weddings, birthdays, events, and celebrations. Collect wishes, high-res photos, and real-time reactions via instant QR codes.',
      createBook: 'Create Your Guest Book',
      viewDemo: 'Explore Live Demo',
      statsMessages: 'Wishes Shared',
      statsEvents: 'Celebrations',
      statsPhotos: 'Photos Captured',
      statsInstant: 'Instant QR Access',
      featuresTitle: 'Everything You Need for Your Special Day',
      featuresSubtitle: 'Designed for effortless guest experience on mobile with powerful moderation tools for hosts.',
      featureMessagesTitle: 'Heartfelt Messages',
      featureMessagesDesc: 'Guests leave warm greetings, personal anecdotes, and blessings that live on forever in a modern memory wall.',
      featurePhotosTitle: 'Photos & Videos',
      featurePhotosDesc: 'Capture real authentic guest perspectives during the celebration with direct high-resolution mobile camera uploads.',
      featureQrTitle: 'Table QR Codes',
      featureQrDesc: 'Print customized QR codes for tables or display stands. Guests scan instantly without installing apps.',
      featureModerationTitle: 'Host Moderation',
      featureModerationDesc: 'Optional approval queue lets you curate messages before they appear on the public board.',
      featureDesignTitle: 'Custom Luxury Themes',
      featureDesignDesc: 'Choose from handcrafted fonts, palettes, and card styles tailored to weddings, parties, or formal events.',
      featureExportTitle: 'Keepsake Book & CSV',
      featureExportDesc: 'Export all greetings and photos into beautiful printable PDF books or structured spreadsheet backups.',
      featurePrivacyTitle: 'Private & Protected',
      featurePrivacyDesc: 'Optional PIN code protection ensures only invited guests can view and leave memories.',
      featureReactionsTitle: 'Live Emoji Reactions',
      featureReactionsDesc: 'Guests can react with heartfelt sentiments (❤️, 🥰, 😂, 👏, 🎉) in real-time.',
      howItWorksTitle: 'How It Works in 4 Simple Steps',
      step1Title: 'Create your guest book',
      step1Desc: 'Set up your event in seconds. Customize your cover photo, welcome message, and pick from curated luxury themes.',
      step2Title: 'Share your QR code',
      step2Desc: 'Print your customized QR code for tables, welcome boards, or display stands. Guests scan instantly without apps.',
      step3Title: 'Guests leave memories',
      step3Desc: 'Friends and family write heartfelt wishes, upload event photos, and react with real-time emojis.',
      step4Title: 'Keep them forever',
      step4Desc: 'Review, moderate, and download your memories anytime as high-res galleries, CSV spreadsheets, or printable books.',
      eventCategoriesTitle: 'Crafted for Any Celebration',
      eventCategoriesSubtitle: 'Tailored for every occasion and gathering',
      liveDemoTitle: 'Experience the Live Demo',
      liveDemoSubtitle: 'See how it looks from a guest perspective: Nika & Ana Wedding Guest Book',
      openDemoBtn: 'Open Demo Guest Book',
      faqTitle: 'Frequently Asked Questions',
      faq1Q: 'Do guests need to install an app?',
      faq1A: 'No! Guests simply open their phone camera, scan your table QR code, and the guest book opens instantly in any browser.',
      faq2Q: 'Can I review messages before they appear publicly?',
      faq2A: 'Yes. You can toggle host moderation on. Any submitted message will remain in your private queue until you click Approve.',
      faq3Q: 'Can guests upload photos and videos?',
      faq3A: 'Absolutely! Guests can capture live photos or pick from their camera roll to attach high-resolution memories to their notes.',
      faq4Q: 'How do I save memories after the event?',
      faq4A: 'You can export a full CSV archive anytime, download high-res photos, or generate a printable commemorative PDF book.',
      readyTitle: 'Ready to preserve your celebration?',
      readySubtitle: 'Start now in less than 2 minutes. Free and effortless.',
      startNowBtn: 'Get Started for Free',
      footerRights: 'All rights reserved.',
      footerTagline: 'Modern digital memories for life’s most cherished celebrations.'
    },
    // Guestbook Public View
    guestBook: {
      leaveWish: 'Leave a Wish',
      leaveWishSub: 'Write a warm note & upload photos for the hosts',
      memoriesWall: 'Memory Wall',
      wishesCount: 'wishes',
      photosCount: 'photos',
      reactionsCount: 'reactions',
      searchPlaceholder: 'Search wishes or guests...',
      allGuests: 'All Guests',
      photosOnly: 'Photos only',
      noWishesYet: 'No wishes yet',
      beTheFirst: 'Be the first guest to write a message and share your memories!',
      privateTitle: 'Private Guest Book',
      privateDesc: 'This guest book is protected by a password set by the host. Enter the code below to view and leave memories.',
      passwordPlaceholder: 'Enter event password...',
      unlockBtn: 'Unlock Guest Book',
      incorrectPassword: 'Incorrect password. Please try again.',
      shareBtn: 'Share',
      backToHome: 'Back to Home',
      hostBadge: 'Host',
      awaitingApproval: 'Awaiting host approval',
      adminManage: 'Manage in Dashboard',
      welcomeFromHosts: 'Welcome from the Hosts',
    },
    // Leave Message Modal
    leaveMessage: {
      modalTitle: 'Leave a Memory',
      modalSubtitle: 'Your heartfelt words will be cherished forever ❤️',
      nameLabel: 'Your Name *',
      namePlaceholder: 'e.g. Giorgi & Nino',
      emailLabel: 'Email (Private - optional)',
      emailPlaceholder: 'To receive a thank you note',
      emailHint: 'Visible only to the host, never public.',
      relationshipLabel: 'Relationship to Hosts',
      messageLabel: 'Your Message & Wishes *',
      messagePlaceholder: 'Write your heartfelt message, memory, or advice...',
      addPhoto: 'Attach Photo',
      changePhoto: 'Change Photo',
      removePhoto: 'Remove Photo',
      addVideo: 'Video URL (Optional)',
      videoPlaceholder: 'e.g. YouTube or Vimeo link',
      chooseReaction: 'Choose a reaction emoji',
      sendWish: 'Send Wish ❤️',
      sending: 'Sending...',
      successTitle: 'Thank You!',
      successModerated: 'Your message has been submitted and is awaiting host approval ❤️',
      successInstant: 'Your wish has been added to the guest book memory wall ❤️',
      writeAnother: 'Write another message',
      done: 'Done',
      photoSizeLimit: 'Photo size must be less than 10 MB.',
      photoError: 'Could not read photo file. Please try another image.',
    },
    // Share Modal
    share: {
      title: 'Share Guest Book',
      subtitle: 'Invite guests to view memories or scan with their camera',
      eventLink: 'Event Link',
      copyLink: 'Copy Link',
      copied: 'Copied!',
      downloadQrPng: 'Download QR (PNG)',
      downloadQrSvg: 'Download Vector (SVG)',
      scanHint: 'Guests scan with iPhone or Android camera — no download needed.',
      socialShare: 'Quick Share',
    },
    // Dashboard
    dashboard: {
      title: 'Host Command Center',
      activeBook: 'Active Guest Book',
      switchBook: 'Select Guest Book',
      viewPublic: 'View Public Book',
      newBookBtn: 'New Book',
      kpiMessages: 'Total Wishes',
      kpiPhotos: 'Photos Uploaded',
      kpiReactions: 'Guest Reactions',
      kpiViews: 'Page Views',
      kpiPending: 'Pending Approval',
      kpiToday: 'Wishes Today',
      tabOverview: 'Overview',
      tabMessages: 'Messages',
      tabMedia: 'Media Gallery',
      tabDesign: 'Design & Theme',
      tabQr: 'QR Code & Share',
      tabSettings: 'Settings',
      tabExport: 'Export & Print',
      visitorsChart: 'Visitor Traffic (Last 7 Days)',
      messagesChart: 'Wishes Submitted (Last 7 Days)',
      filterAll: 'All Statuses',
      filterPending: 'Pending',
      filterApproved: 'Approved',
      filterHidden: 'Hidden',
      approveBtn: 'Approve',
      hideBtn: 'Hide',
      deleteBtn: 'Delete',
      searchMessages: 'Search by author or message text...',
      noMessagesMatching: 'No messages found matching criteria',
      exportCsvBtn: 'Download CSV File',
      exportCsvDesc: 'Export contains all wishes, authors, private emails, submission dates, and reaction counts.',
      printKeepsakeBtn: 'Print Keepsake Book',
      printKeepsakeDesc: 'Formatted commemorative guest book ready for desktop printing or PDF export.',
      themeSettingsTitle: 'Visual Theme & Design',
      themeSettingsDesc: 'Customize colors, typography, and card styles',
      presetLabel: 'Design Preset',
      saveThemeBtn: 'Save Theme',
      saving: 'Saving...',
      eventSettingsTitle: 'Event Details & Rules',
      eventTitleLabel: 'Event Title',
      hostsLabel: 'Host Names',
      dateLabel: 'Event Date',
      welcomeLabel: 'Welcome Message for Guests',
      moderationToggle: 'Host moderation mode (new messages require approval before going live)',
      privacyToggle: 'Private guest book (protect access with a password)',
      passwordLabel: 'Guest Access Password',
      saveSettingsBtn: 'Save Settings',
      deleteGuestBookTitle: 'Delete Guest Book',
      deleteGuestBookDesc: 'Deleting a guest book is irreversible and will permanently remove all messages and media.',
      deleteGuestBookBtn: 'Delete Guest Book',
      confirmDeleteBook: 'Are you sure you want to delete this guest book?',
    },
    // Wizard
    wizard: {
      title: 'Create Digital Guest Book',
      stepDetails: 'Event Details',
      stepType: 'Event Type',
      stepHosts: 'Hosts & Title',
      stepWelcome: 'Welcome Message',
      stepCover: 'Cover Photo',
      stepTheme: 'Theme & Style',
      stepPrivacy: 'Privacy & Rules',
      stepReview: 'Review & Launch',
      titleInputLabel: 'Event Title *',
      titlePlaceholder: 'e.g. Nika & Ana Wedding',
      dateInputLabel: 'Event Date *',
      hostsInputLabel: 'Host Names *',
      hostsPlaceholder: 'e.g. Nika & Ana',
      welcomeInputLabel: 'Welcome Message for Guests',
      welcomePlaceholder: 'Welcome to our guest book! Leave us a warm message and memory...',
      coverUrlLabel: 'Cover Photo Image URL',
      moderationLabel: 'Enable Moderation Queue',
      moderationSub: 'New wishes will require your approval before appearing publicly',
      privacyLabel: 'Password Protected',
      privacySub: 'Only guests with your password will be able to access the book',
      passwordInputLabel: 'Guest Password',
      nextBtn: 'Next',
      prevBtn: 'Back',
      createBtn: 'Create & Launch Guest Book',
      creatingBtn: 'Creating...',
    },
    // Auth
    auth: {
      welcomeBack: 'Welcome Back',
      welcomeBackSub: 'Sign in to manage your guest books & memories',
      createAccount: 'Create Host Account',
      createAccountSub: 'Start preserving memories for your special celebration',
      demoLoginBtn: 'Instant Demo Login (One Click)',
      demoNotice: 'Quick access with preloaded wedding memories and guestbook data',
      emailLabel: 'Email Address',
      passwordLabel: 'Password (min. 6 characters)',
      nameLabel: 'Your Name / Host Names',
      signInBtn: 'Log In',
      signUpBtn: 'Create Account',
      noAccount: "Don't have an account? Sign up",
      haveAccount: 'Already have an account? Log in',
      submitting: 'Please wait...',
    },
    // Print
    print: {
      commemorativeBook: 'COMMEMORATIVE GUEST BOOK',
      hosts: 'Hosts',
      eventDate: 'Date',
      totalMemories: 'Total Wishes',
      formattedForPrint: 'memories formatted for print',
      printOrSavePdf: 'Print or Save to PDF',
      backToDashboard: 'Back to Dashboard',
      guestName: 'Guest',
      relationship: 'Relationship',
      date: 'Date',
      page: 'Page',
      recordedOn: 'Recorded on',
    }
  }
};

export type I18nSection = keyof typeof translations['en'] | 'guestbook';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (section: I18nSection, key: string) => string;
  formatEventDate: (dateStr: string) => string;
  formatRelativeTime: (dateStr: string) => string;
  translateRelationship: (rel?: string) => string;
  translateEventType: (type?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Georgian ('ka') since user requested Georgian support
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('guestbook_preferred_lang') as Language;
      if (saved === 'ka' || saved === 'en') return saved;
    } catch {}
    return 'ka';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('guestbook_preferred_lang', newLang);
    } catch {}
  };

  const t = (section: I18nSection, key: string): string => {
    const secKey = (section === 'guestbook' ? 'guestBook' : section) as keyof typeof translations['en'];
    const currentDict = translations[lang] || translations.ka;
    const sec = (currentDict as any)[secKey] as any;
    if (sec && sec[key]) return sec[key];

    // Fallback to ka or en
    const fallbackSec = (translations.en as any)[secKey] as any;
    if (fallbackSec && fallbackSec[key]) return fallbackSec[key];
    return key;
  };

  const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);

        if (lang === 'ka') {
          const monthName = GEORGIAN_MONTHS[monthIndex] || parts[1];
          return `${day} ${monthName}, ${year}`;
        } else {
          const monthName = ENGLISH_MONTHS[monthIndex] || parts[1];
          return `${monthName} ${day}, ${year}`;
        }
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      if (lang === 'ka') {
        return `${d.getDate()} ${GEORGIAN_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
      } else {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (lang === 'ka') {
        if (diffSecs < 60) return 'ახლახან';
        if (diffMins < 60) return `${diffMins} წუთის წინ`;
        if (diffHours < 24) return `${diffHours} საათის წინ`;
        if (diffDays === 1) return 'გუშინ';
        if (diffDays < 30) return `${diffDays} დღის წინ`;
        return `${d.getDate()} ${GEORGIAN_MONTHS[d.getMonth()]}`;
      } else {
        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const translateRelationship = (rel?: string): string => {
    if (!rel) return '';
    const found = RELATIONSHIPS_TRANSLATIONS[rel];
    if (found) return found[lang] || found.ka;
    return rel;
  };

  const translateEventType = (type?: string): string => {
    if (!type) return '';
    const found = EVENT_TYPES_TRANSLATIONS[type];
    if (found) return found[lang] || found.ka;
    return type;
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        formatEventDate,
        formatRelativeTime,
        translateRelationship,
        translateEventType,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Compact Language Toggle Component
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80 shadow-2xs text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        id="lang-btn-ka"
        onClick={() => setLang('ka')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          lang === 'ka'
            ? 'bg-white text-stone-900 shadow-xs font-bold'
            : 'text-stone-500 hover:text-stone-900'
        }`}
        title="ქართული ენა"
      >
        <span>🇬🇪</span>
        <span>ქართ</span>
      </button>
      <button
        type="button"
        id="lang-btn-en"
        onClick={() => setLang('en')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-white text-stone-900 shadow-xs font-bold'
            : 'text-stone-500 hover:text-stone-900'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
};
