import { SITE } from '../lib/site-config.ts';

export type LegalSlug = 'privacy' | 'terms' | 'refund' | 'cookies';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  summary: string;
  sections: LegalSection[];
}

const operator = `${SITE.legalName} (${SITE.productName})`;

/* ------------------------------------------------------------------ */
/* Privacy policy                                                      */
/* ------------------------------------------------------------------ */

const privacyKa: LegalDoc = {
  title: 'კონფიდენციალურობის პოლიტიკა',
  summary:
    'ეს გვერდი განმარტავს, რა მონაცემებს ვაგროვებთ, რატომ, სად ინახება და როგორ გამოიყენოთ თქვენი უფლებები.',
  sections: [
    {
      heading: '1. ვინ არის მონაცემთა კონტროლერი',
      paragraphs: [
        `თქვენი პერსონალური მონაცემების დამმუშავებელია ${operator}, მისამართი: ${SITE.address}, საიდენტიფიკაციო ნომერი: ${SITE.registrationNumber}.`,
        `ნებისმიერ კითხვაზე ან მოთხოვნაზე დაგვიკავშირდით: ${SITE.privacyEmail}.`,
      ],
    },
    {
      heading: '2. რა მონაცემებს ვაგროვებთ',
      paragraphs: ['ვაგროვებთ მხოლოდ იმას, რაც სერვისის მუშაობისთვის აუცილებელია:'],
      bullets: [
        'მასპინძლის ანგარიში: ელფოსტა, სახელი და პაროლის დაშიფრული ვერსია (პაროლს ღია სახით ვერასდროს ვხედავთ — მას Firebase Authentication ამუშავებს).',
        'სტუმრის ჩანაწერი: სახელი, შეტყობინების ტექსტი და არჩევითი „კავშირი“ (მეგობარი, ოჯახი და ა.შ.).',
        'სტუმრის ელფოსტა: სრულიად არჩევითია. ის არასდროს ჩანს საჯაროდ და მას მხოლოდ იმ წიგნის მასპინძელი ხედავს.',
        'ატვირთული ფოტო და ვიდეო, რომელსაც თქვენ თავად ირჩევთ.',
        'ვიზიტორის ლოკალური იდენტიფიკატორი, რომელიც საშუალებას გაძლევთ საკუთარი რეაქცია უკან წაიღოთ.',
        'თუ ანალიტიკაზე თანხმობას მოგვცემთ — დღიური ვიზიტების რაოდენობა (მხოლოდ ჯამური რიცხვი, უპიროვნო).',
      ],
    },
    {
      heading: '3. რას არ ვაგროვებთ',
      bullets: [
        'არ ვიყენებთ სარეკლამო ან ქცევით თვალთვალს (tracking).',
        'არ ვყიდით და არ ვცვლით მონაცემებს მესამე პირებთან.',
        'არ ვაგროვებთ ზუსტ გეოლოკაციას, საკონტაქტო წიგნს ან განსაკუთრებული კატეგორიის მონაცემებს.',
        'არ ვაწარმოებთ ავტომატიზებულ გადაწყვეტილებებს, რომლებსაც იურიდიული შედეგი მოაქვს.',
      ],
    },
    {
      heading: '4. დამუშავების სამართლებრივი საფუძველი',
      bullets: [
        'ხელშეკრულების შესრულება — ანგარიშისა და სტუმრების წიგნის მუშაობისთვის.',
        'თანხმობა — სტუმრის ჩანაწერის გამოქვეყნებისთვის, არჩევითი ელფოსტისთვის და ანალიტიკისთვის. თანხმობა ნებისმიერ დროს გამოთხოვადია.',
        'ლეგიტიმური ინტერესი — სერვისის უსაფრთხოებისა და ბოროტად გამოყენების პრევენციისთვის.',
      ],
    },
    {
      heading: '5. სად ინახება მონაცემები',
      paragraphs: [
        'ტექსტური მონაცემები ინახება Google Firebase (Firestore და Authentication) ინფრასტრუქტურაში. ფოტოები და ვიდეოები ინახება Cloudinary-ში. ორივე მომწოდებელი მოქმედებს ჩვენი დავალებით, როგორც მონაცემთა დამმუშავებელი.',
        'მონაცემები შესაძლოა დამუშავდეს ევროპის ეკონომიკური სივრცის გარეთ. ასეთ შემთხვევაში გადაცემა ეყრდნობა ევროკომისიის სტანდარტულ სახელშეკრულებო პირობებს.',
      ],
    },
    {
      heading: '6. რამდენ ხანს ვინახავთ',
      bullets: [
        'სტუმრების წიგნის შიგთავსი ინახება მანამ, სანამ მასპინძელი მას არ წაშლის.',
        'ანგარიშის წაშლისას წიგნები, ჩანაწერები და ატვირთული ფაილები სამუდამოდ იშლება.',
        'თანხმობის ჩანაწერი ინახება 12 თვე, შემდეგ კითხვა ხელახლა დაისმება.',
      ],
    },
    {
      heading: '7. თქვენი უფლებები',
      paragraphs: [
        'თქვენ გაქვთ უფლება მოითხოვოთ თქვენს შესახებ არსებული ინფორმაციის ასლი, მისი შესწორება ან წაშლა, დამუშავების შეზღუდვა, მონაცემთა გადატანა, ასევე უარი თქვათ დამუშავებაზე ან გამოითხოვოთ თანხმობა.',
        `მოთხოვნა გამოგვიგზავნეთ მისამართზე ${SITE.privacyEmail}. პასუხს გაგცემთ არაუგვიანეს 30 დღისა.`,
        'თუ პასუხით უკმაყოფილო ხართ, უფლება გაქვთ საჩივრით მიმართოთ საქართველოს პერსონალურ მონაცემთა დაცვის სამსახურს (personaldata.ge) ან თქვენი ქვეყნის შესაბამის ორგანოს.',
      ],
    },
    {
      heading: '8. ბავშვები',
      paragraphs: [
        'სერვისი არ არის განკუთვნილი 16 წლამდე ასაკის პირებისთვის. თუ აღმოვაჩენთ, რომ ასეთი მონაცემი შეგროვდა მშობლის თანხმობის გარეშე, ის დაუყოვნებლივ წაიშლება.',
      ],
    },
    {
      heading: '9. ცვლილებები',
      paragraphs: [
        `ამ პოლიტიკის ბოლო განახლების თარიღია ${SITE.lastUpdated}. არსებითი ცვლილებისას შეტყობინებას მიიღებთ სერვისში.`,
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  summary:
    'What we collect, why we collect it, where it is stored, and how you exercise your rights.',
  sections: [
    {
      heading: '1. Who controls your data',
      paragraphs: [
        `Your personal data is controlled by ${operator}, ${SITE.address}, registration number ${SITE.registrationNumber}.`,
        `For any question or request, write to ${SITE.privacyEmail}.`,
      ],
    },
    {
      heading: '2. What we collect',
      paragraphs: ['Only what the service actually needs in order to work:'],
      bullets: [
        'Host account: email address, display name, and a hashed password (the plain password is handled by Firebase Authentication and is never visible to us).',
        'Guest entry: name, message text, and an optional relationship label (Friend, Family, and so on).',
        'Guest email: entirely optional. It is never shown publicly and is visible only to the host of that guest book.',
        'Photos and videos you choose to upload.',
        'A visitor identifier stored in your browser, which is what lets you take back your own reaction.',
        'If you consent to analytics: a daily count of page views — an aggregate number only, not tied to a person.',
      ],
    },
    {
      heading: '3. What we do not collect',
      bullets: [
        'No advertising or behavioural tracking.',
        'No selling or sharing of data with third parties.',
        'No precise location, contacts, or special-category data.',
        'No automated decision-making with legal effects.',
      ],
    },
    {
      heading: '4. Legal bases for processing',
      bullets: [
        'Performance of a contract — to run your account and your guest book.',
        'Consent — to publish a guest entry, for the optional email field, and for analytics. Consent can be withdrawn at any time.',
        'Legitimate interests — to keep the service secure and prevent abuse.',
      ],
    },
    {
      heading: '5. Where data is stored',
      paragraphs: [
        'Text data is stored in Google Firebase (Firestore and Authentication). Photos and videos are stored with Cloudinary. Both act as processors on our instructions.',
        'Data may be processed outside the European Economic Area. Where that happens, the transfer relies on the European Commission’s Standard Contractual Clauses.',
      ],
    },
    {
      heading: '6. How long we keep it',
      bullets: [
        'Guest book content is kept until the host deletes it.',
        'Deleting an account permanently deletes its guest books, entries, and uploaded files.',
        'The record of your consent choice is kept for 12 months, after which you are asked again.',
      ],
    },
    {
      heading: '7. Your rights',
      paragraphs: [
        'You may request a copy of the information we hold about you, ask us to correct or erase it, restrict processing, receive it in a portable format, object to processing, or withdraw consent.',
        `Send requests to ${SITE.privacyEmail}. We respond within 30 days.`,
        'If you are not satisfied with our response, you may complain to the Personal Data Protection Service of Georgia (personaldata.ge) or your local supervisory authority.',
      ],
    },
    {
      heading: '8. Children',
      paragraphs: [
        'The service is not directed at people under 16. If we learn that such data was collected without parental consent, we delete it promptly.',
      ],
    },
    {
      heading: '9. Changes',
      paragraphs: [
        `This policy was last updated on ${SITE.lastUpdated}. We will notify you in the service before any material change takes effect.`,
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Terms and conditions                                                */
/* ------------------------------------------------------------------ */

const termsKa: LegalDoc = {
  title: 'წესები და პირობები',
  summary: 'სერვისით სარგებლობის წესები, თქვენი და ჩვენი ვალდებულებები.',
  sections: [
    {
      heading: '1. ვინ ვართ',
      paragraphs: [
        `${SITE.productName} ოპერირდება ${operator}-ის მიერ, მისამართი: ${SITE.address}, საიდენტიფიკაციო ნომერი: ${SITE.registrationNumber}, ელფოსტა: ${SITE.email}.`,
      ],
    },
    {
      heading: '2. სერვისის აღწერა',
      paragraphs: [
        'სერვისი გაძლევთ საშუალებას შექმნათ ციფრული სტუმრების წიგნი, გაუზიაროთ იგი QR კოდით ან ბმულით და შეაგროვოთ სტუმრების ტექსტური მილოცვები, ფოტოები და ვიდეოები.',
      ],
    },
    {
      heading: '3. ანგარიში',
      bullets: [
        'ანგარიშის შესაქმნელად უნდა იყოთ სულ მცირე 16 წლის.',
        'თქვენ ხართ პასუხისმგებელი თქვენი პაროლის კონფიდენციალურობაზე.',
        'ანგარიშის წაშლა ნებისმიერ დროს შეგიძლიათ და ეს იწვევს შიგთავსის სამუდამო წაშლას.',
      ],
    },
    {
      heading: '4. თქვენი შიგთავსი',
      paragraphs: [
        'თქვენ და თქვენი სტუმრები ინარჩუნებთ ატვირთულ შიგთავსზე ყველა უფლებას. ჩვენ გვენიჭება მხოლოდ ის შეზღუდული ლიცენზია, რაც აუცილებელია შიგთავსის შესანახად და თქვენივე წიგნში საჩვენებლად.',
        'როგორც წიგნის მასპინძელი, თქვენ ხართ პასუხისმგებელი იმაზე, რომ სტუმრებმა იცოდნენ, რომ მათი ჩანაწერი გამოქვეყნდება, და რომ გქონდეთ საკმარისი უფლება გამოქვეყნებულ ფოტოებზე.',
      ],
    },
    {
      heading: '5. აკრძალული გამოყენება',
      bullets: [
        'უკანონო, შეურაცხმყოფელი, დისკრიმინაციული ან სხვისი უფლებების დამრღვევი შიგთავსი.',
        'სხვა პირის პერსონალური მონაცემების განთავსება მისი თანხმობის გარეშე.',
        'სერვისის ავტომატიზებული ბოროტად გამოყენება, სპამი ან უსაფრთხოების ზომების გვერდის ავლის მცდელობა.',
      ],
      paragraphs: [
        'ამ წესების დარღვევისას უფლებას ვიტოვებთ შევზღუდოთ ან შევწყვიტოთ წვდომა.',
      ],
    },
    {
      heading: '6. ხელმისაწვდომობა',
      paragraphs: [
        'სერვისი მოწოდებულია „როგორც არის“ პრინციპით. ვცდილობთ უწყვეტ მუშაობას, თუმცა არ ვიძლევით გარანტიას შეფერხების ან შეცდომების სრულ არარსებობაზე. გირჩევთ, მნიშვნელოვანი მოგონებების ასლი დამატებით შეინახოთ ექსპორტის ფუნქციით.',
      ],
    },
    {
      heading: '7. პასუხისმგებლობის შეზღუდვა',
      paragraphs: [
        'კანონით დაშვებულ ფარგლებში, ჩვენი პასუხისმგებლობა შემოიფარგლება ბოლო 12 თვის განმავლობაში სერვისისთვის თქვენ მიერ გადახდილი თანხით. არაფერი ამ პუნქტში არ ზღუდავს პასუხისმგებლობას განზრახი ქმედების ან უხეში გაუფრთხილებლობისთვის, ან მომხმარებლის კანონისმიერ უფლებებს.',
      ],
    },
    {
      heading: '8. მოქმედი სამართალი',
      paragraphs: [
        'ეს პირობები რეგულირდება საქართველოს კანონმდებლობით. თუ თქვენ მომხმარებელი ხართ ევროკავშირში, ინარჩუნებთ თქვენი საცხოვრებელი ქვეყნის იმპერატიულ სამომხმარებლო უფლებებს.',
      ],
    },
    {
      heading: '9. კონტაქტი',
      paragraphs: [`კითხვებისთვის: ${SITE.email}. ბოლო განახლება: ${SITE.lastUpdated}.`],
    },
  ],
};

const termsEn: LegalDoc = {
  title: 'Terms and Conditions',
  summary: 'The rules for using the service, and what each of us is responsible for.',
  sections: [
    {
      heading: '1. Who we are',
      paragraphs: [
        `${SITE.productName} is operated by ${operator}, ${SITE.address}, registration number ${SITE.registrationNumber}, email ${SITE.email}.`,
      ],
    },
    {
      heading: '2. What the service does',
      paragraphs: [
        'The service lets you create a digital guest book, share it by QR code or link, and collect written messages, photos, and videos from your guests.',
      ],
    },
    {
      heading: '3. Your account',
      bullets: [
        'You must be at least 16 years old to create an account.',
        'You are responsible for keeping your password confidential.',
        'You may delete your account at any time; doing so permanently deletes its content.',
      ],
    },
    {
      heading: '4. Your content',
      paragraphs: [
        'You and your guests keep all rights in what you upload. We receive only the limited licence needed to store that content and display it inside your own guest book.',
        'As the host of a guest book, you are responsible for making sure your guests know their entry will be published, and that you hold sufficient rights in any photo you publish.',
      ],
    },
    {
      heading: '5. Prohibited use',
      bullets: [
        'Unlawful, abusive, discriminatory, or infringing content.',
        'Posting another person’s personal data without their consent.',
        'Automated abuse, spam, or attempts to circumvent security controls.',
      ],
      paragraphs: ['We may restrict or terminate access if these terms are breached.'],
    },
    {
      heading: '6. Availability',
      paragraphs: [
        'The service is provided on an "as is" basis. We aim for continuous operation but do not guarantee uninterrupted, error-free service. We recommend keeping your own copy of important memories using the export feature.',
      ],
    },
    {
      heading: '7. Limitation of liability',
      paragraphs: [
        'To the extent permitted by law, our liability is limited to the amount you paid for the service in the preceding 12 months. Nothing here limits liability for wilful misconduct or gross negligence, or affects your statutory consumer rights.',
      ],
    },
    {
      heading: '8. Governing law',
      paragraphs: [
        'These terms are governed by the laws of Georgia. If you are a consumer in the EU, you keep the mandatory consumer protections of your country of residence.',
      ],
    },
    {
      heading: '9. Contact',
      paragraphs: [`Questions: ${SITE.email}. Last updated: ${SITE.lastUpdated}.`],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Refund policy                                                       */
/* ------------------------------------------------------------------ */

const refundKa: LegalDoc = {
  title: 'თანხის დაბრუნების პოლიტიკა',
  summary:
    'ამჟამად სერვისი უფასოა და გადახდას არ იღებს. ეს პოლიტიკა განსაზღვრავს წესებს ფასიანი გეგმების ამოქმედების შემდეგ.',
  sections: [
    {
      heading: '1. მიმდინარე მდგომარეობა',
      paragraphs: [
        `${SITE.productName} ამჟამად ხელმისაწვდომია უფასოდ. საიტზე არ ხდება გადახდების მიღება და არ ინახება საგადახდო ბარათის მონაცემები. შესაბამისად, დღეის მდგომარეობით დასაბრუნებელი თანხა არ არსებობს.`,
      ],
    },
    {
      heading: '2. ფასიანი გეგმების ამოქმედების შემდეგ',
      paragraphs: [
        'ფასიანი გეგმების დამატებისას ამოქმედდება შემდეგი წესები. ფასი, გადასახდელი პერიოდი და ყველა დამატებითი ხარჯი ნაჩვენები იქნება გადახდამდე, ერთ ეკრანზე.',
      ],
    },
    {
      heading: '3. 14-დღიანი გახსნის უფლება',
      bullets: [
        'ხელმოწერის შეძენიდან 14 კალენდარული დღის განმავლობაში შეგიძლიათ უარი თქვათ ხელშეკრულებაზე მიზეზის მითითების გარეშე და დაიბრუნოთ სრული თანხა.',
        'თუ ითხოვთ სერვისის დაუყოვნებლივ დაწყებას ამ 14 დღის განმავლობაში, დაბრუნებული თანხა შემცირდება უკვე მოხმარებული პერიოდის პროპორციულად.',
        'მოთხოვნის შემდეგ თანხა ბრუნდება იმავე გადახდის საშუალებით, არაუგვიანეს 14 დღისა.',
      ],
    },
    {
      heading: '4. განახლებები და გაუქმება',
      bullets: [
        'ხელმოწერის გაუქმება ნებისმიერ დროს შეგიძლიათ; წვდომა შენარჩუნდება უკვე გადახდილი პერიოდის ბოლომდე.',
        'გაუქმებისას მიმდინარე პერიოდის გამოუყენებელი ნაწილი, როგორც წესი, არ ბრუნდება, გარდა კანონით გათვალისწინებული შემთხვევებისა.',
        'ავტომატური განახლების შესახებ შეტყობინებას მიიღებთ ჩამოჭრამდე მინიმუმ 7 დღით ადრე.',
      ],
    },
    {
      heading: '5. ტექნიკური პრობლემები',
      paragraphs: [
        'თუ სერვისი არსებითად არ მუშაობს აღწერილობის შესაბამისად და ვერ გამოვასწორებთ გონივრულ ვადაში, უფლება გაქვთ მოითხოვოთ ფასის შემცირება ან სრული დაბრუნება.',
      ],
    },
    {
      heading: '6. როგორ მოვითხოვოთ',
      paragraphs: [
        `გამოგვიგზავნეთ წერილი მისამართზე ${SITE.email}, სათაურით „თანხის დაბრუნება“, ანგარიშის ელფოსტისა და შეძენის თარიღის მითითებით. პასუხს გაგცემთ 5 სამუშაო დღეში.`,
      ],
    },
  ],
};

const refundEn: LegalDoc = {
  title: 'Refund Policy',
  summary:
    'The service is currently free and takes no payments. This policy sets the rules that apply once paid plans launch.',
  sections: [
    {
      heading: '1. Current position',
      paragraphs: [
        `${SITE.productName} is currently available free of charge. No payments are taken on this site and no card details are stored, so at present there is nothing to refund.`,
      ],
    },
    {
      heading: '2. Once paid plans launch',
      paragraphs: [
        'The rules below take effect when paid plans are introduced. Price, billing period, and any additional charges will always be shown before payment, on a single screen.',
      ],
    },
    {
      heading: '3. 14-day right to cancel',
      bullets: [
        'You may cancel a subscription within 14 calendar days of purchase, without giving a reason, and receive a full refund.',
        'If you ask us to start the service immediately within that period, the refund is reduced in proportion to what you have already used.',
        'Refunds are issued to the original payment method within 14 days of your request.',
      ],
    },
    {
      heading: '4. Renewals and cancellation',
      bullets: [
        'You may cancel a subscription at any time; access continues until the end of the period you have already paid for.',
        'The unused part of the current period is not normally refunded on cancellation, except where the law requires it.',
        'You will be notified at least 7 days before any automatic renewal is charged.',
      ],
    },
    {
      heading: '5. If something is broken',
      paragraphs: [
        'If the service materially fails to work as described and we cannot fix it within a reasonable time, you are entitled to a price reduction or a full refund.',
      ],
    },
    {
      heading: '6. How to request a refund',
      paragraphs: [
        `Email ${SITE.email} with the subject "Refund", including your account email and the date of purchase. We reply within 5 working days.`,
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Cookie policy                                                       */
/* ------------------------------------------------------------------ */

const cookiesKa: LegalDoc = {
  title: 'ქუქიების პოლიტიკა',
  summary:
    'საიტი არ იყენებს სარეკლამო ან მესამე მხარის თვალთვალის ქუქიებს. ქვემოთ ჩამოთვლილია ყველაფერი, რასაც თქვენს ბრაუზერში ვინახავთ.',
  sections: [
    {
      heading: '1. ზოგადად',
      paragraphs: [
        'ტექნიკურად ჩვენ ვიყენებთ არა კლასიკურ ქუქიებს, არამედ ბრაუზერის ლოკალურ მეხსიერებას (localStorage). სამართლებრივად მას იგივე წესები ეხება, ამიტომ სრულად ვუთითებთ.',
      ],
    },
    {
      heading: '2. აუცილებელი (თანხმობა არ სჭირდება)',
      bullets: [
        'ავტორიზაციის სესია — რომ სისტემიდან ყოველ განახლებაზე არ გამოხვიდეთ (Firebase Authentication).',
        'gb_visitor_id — თქვენი ლოკალური იდენტიფიკატორი, რომელიც საშუალებას გაძლევთ საკუთარი რეაქცია უკან წაიღოთ.',
        'gb_unlocked_* — მიუთითებს, რომ პაროლიან წიგნზე წვდომა უკვე გაქვთ.',
        'gb_lang — არჩეული ენა.',
        'gb_consent_v1 — თქვენი არჩევანი ამ ბანერზე.',
      ],
    },
    {
      heading: '3. ანალიტიკური (მხოლოდ თქვენი თანხმობით)',
      bullets: [
        'gb_viewed_* — ინახავს ბოლო ვიზიტის დროს, რომ ერთი და იგივე ვიზიტი 30 წუთში ორჯერ არ დაითვალოს.',
        'ამის საფუძველზე მასპინძელი ხედავს მხოლოდ დღიურ ჯამურ რიცხვს. არც IP მისამართს და არც ბრაუზერის „თითის ანაბეჭდს“ არ ვინახავთ.',
      ],
    },
    {
      heading: '4. მესამე მხარეები',
      bullets: [
        'Google Firebase — ავტორიზაცია და მონაცემთა ბაზა. ინახავს ავტორიზაციის ტოკენს.',
        'Cloudinary — ფოტოებისა და ვიდეოების შენახვა და მიწოდება.',
        'Unsplash (images.unsplash.com) — მხოლოდ ნაგულისხმევი ყდის ფოტოები. სურათის ჩატვირთვისას მათ სერვერს გადაეცემა თქვენი IP მისამართი; ქუქიებს არ ათავსებს.',
      ],
      paragraphs: [
        'შრიფტები საკუთარი სერვერიდან იტვირთება — Google Fonts-ს ან სხვა CDN-ს არ ვიყენებთ, ამიტომ გვერდის გახსნისას თქვენი IP მისამართი მესამე მხარეს არ გადაეცემა.',
        'სარეკლამო ქსელები, სოციალური ქსელის პიქსელები და Google Analytics საიტზე არ გამოიყენება.',
      ],
    },
    {
      heading: '5. არჩევანის შეცვლა',
      paragraphs: [
        'თანხმობის გამოთხოვა ისეთივე მარტივია, როგორც მისი მიცემა — გამოიყენეთ ბმული „ქუქიების პარამეტრები“ საიტის ქვედა ნაწილში. ასევე ნებისმიერ დროს შეგიძლიათ ბრაუზერის პარამეტრებიდან წაშალოთ საიტის მონაცემები.',
      ],
    },
  ],
};

const cookiesEn: LegalDoc = {
  title: 'Cookie Policy',
  summary:
    'This site uses no advertising and no third-party tracking cookies. Everything we store in your browser is listed below.',
  sections: [
    {
      heading: '1. In general',
      paragraphs: [
        'Technically we use browser local storage rather than classic cookies. The same rules apply legally, so we list all of it here.',
      ],
    },
    {
      heading: '2. Strictly necessary (no consent required)',
      bullets: [
        'Authentication session — so you are not signed out on every refresh (Firebase Authentication).',
        'gb_visitor_id — a local identifier that lets you take back your own reaction.',
        'gb_unlocked_* — records that you have already unlocked a password-protected book.',
        'gb_lang — your chosen language.',
        'gb_consent_v1 — your choice on this banner.',
      ],
    },
    {
      heading: '3. Analytics (only with your consent)',
      bullets: [
        'gb_viewed_* — stores the time of your last visit so the same visit is not counted twice within 30 minutes.',
        'From this the host sees a daily total only. We store no IP address and no browser fingerprint.',
      ],
    },
    {
      heading: '4. Third parties',
      bullets: [
        'Google Firebase — authentication and database. Stores an authentication token.',
        'Cloudinary — storage and delivery of photos and videos.',
        'Unsplash (images.unsplash.com) — default cover photos only. Loading an image discloses your IP address to their server; it sets no cookies.',
      ],
      paragraphs: [
        'Typefaces are served from our own origin — no Google Fonts and no other CDN — so opening a page discloses your IP address to no third party.',
        'No ad networks, no social media pixels, and no Google Analytics are used on this site.',
      ],
    },
    {
      heading: '5. Changing your choice',
      paragraphs: [
        'Withdrawing consent is as easy as giving it — use the "Cookie settings" link in the site footer. You can also clear this site’s data from your browser settings at any time.',
      ],
    },
  ],
};

export const legalDocs: Record<LegalSlug, { ka: LegalDoc; en: LegalDoc }> = {
  privacy: { ka: privacyKa, en: privacyEn },
  terms: { ka: termsKa, en: termsEn },
  refund: { ka: refundKa, en: refundEn },
  cookies: { ka: cookiesKa, en: cookiesEn },
};

export const legalNavLabels: Record<LegalSlug, { ka: string; en: string }> = {
  privacy: { ka: 'კონფიდენციალურობა', en: 'Privacy' },
  terms: { ka: 'წესები და პირობები', en: 'Terms' },
  refund: { ka: 'თანხის დაბრუნება', en: 'Refunds' },
  cookies: { ka: 'ქუქიები', en: 'Cookies' },
};
