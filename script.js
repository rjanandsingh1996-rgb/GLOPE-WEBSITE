// Keep the website at the top when it is opened/reloaded without a section hash.
// This prevents the browser from restoring the previous scroll position (e.g. the Story section).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!window.location.hash) {
  window.scrollTo(0, 0);
  window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }, { once: true });
}

const menu = document.querySelector('.menu');
const mobileNav = document.querySelector('.mobile-nav');

if (menu && mobileNav) {
  menu.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  });
}

const translations = {
  hi: {
    topline: 'GLOPE कृषि उत्पाद • आगरा • खेत से परिवार तक',
    navHome:'होम', navProducts:'हमारे उत्पाद', navStory:'हमारी कहानी', navQuality:'हमारी सोच', navContact:'संपर्क',
    heroEyebrow:'GLOPE कृषि उत्पाद • आगरा',
    heroTitle:'खेत से<br><em>परिवार तक।</em>',
    heroIntro:'रोज़मर्रा के पारिवारिक उपयोग के लिए सोच-समझकर प्रस्तुत किए गए कृषि उत्पाद — शुरुआत GLOPE Honey से।',
    exploreHoney:'Honey देखें <span>→</span>', whatsappUs:'WhatsApp करें <span>↗</span>', buyNow:'खरीदें <span>→</span>',
    thoughtfulSourcing:'स्रोत पर ध्यान', familyFirst:'परिवार सबसे पहले',
    trust1:'परिवार द्वारा संचालित<small>सीधी भागीदारी</small>',
    trust2:'साफ़ और सरल<small>बिना अनावश्यक दावों के</small>',
    trust3:'उचित मूल्य<small>परिवारों और किसानों के लिए</small>',
    fssaiNo:'22724113001721',
    whyEyebrow:'GLOPE क्यों?', whyTitle:'मूल्यों से जुड़ा।<br><em>सावधानी से बनाया गया।</em>',
    whyIntro:'GLOPE को हम कदम-दर-कदम बना रहे हैं — उत्पाद, उसके पीछे के लोगों और उसे अपने घर लाने वाले परिवारों पर ध्यान के साथ।',
    why1Title:'किसान परिवार से जुड़ाव', why1P:'GLOPE की शुरुआत एक किसान परिवार से मिले अनुभव और वहीं से शुरू हुई हमारी यात्रा से हुई।',
    why2Title:'गुणवत्ता के प्रति सजग', why2P:'किसी दावे से पहले हम उत्पाद और उसकी यात्रा को समझना अधिक महत्वपूर्ण मानते हैं।',
    why3Title:'ईमानदार तरीका', why3P:'अनावश्यक वादों की जगह हम चाहते हैं कि उत्पाद और उसके बारे में जानकारी साफ़ तरीके से सामने आए।',
    why4Title:'परिवारों के लिए', why4P:'हम ऐसे उत्पाद बनाने की कोशिश करते हैं जिन्हें अपने घर के लिए चुनते समय हमें भी वही भरोसा महसूस हो।',
    detailsLabel:'उत्पाद की जानकारी', detailsTitle:'सरल जानकारी।<br><em>बिना अनावश्यक बातों के।</em>',
    orderLabel:'ऑर्डर कैसे करें', orderTitle:'सरल कदम।<br><em>सीधे GLOPE से।</em>', orderIntro:'अपना पैक चुनें, WhatsApp पर अपनी जानकारी भेजें और हम सीधे आपसे ऑर्डर की पुष्टि करेंगे।',
    order1Title:'अपना पैक चुनें', order1P:'250 g, 500 g या 1 kg GLOPE Honey में से चुनें।',
    order2Title:'BUY NOW दबाएँ', order2P:'आपके ऑर्डर की जानकारी सीधे WhatsApp पर खुल जाएगी।',
    order3Title:'अपनी जानकारी दें', order3P:'अपना नाम, पूरा डिलीवरी पता और पिनकोड साझा करें।',
    order4Title:'ऑर्डर की पुष्टि', order4P:'हम सीधे आपसे संपर्क करके ऑर्डर और आगे की प्रक्रिया की पुष्टि करेंगे।',
    detailsIntro:'साफ़ और उपयोगी जानकारी, ताकि घर तक आने से पहले आपको पता हो कि आप क्या खरीद रहे हैं।',
    detailProduct:'उत्पाद', detailPacks:'पैक आकार', detailIngredients:'सामग्री', detailHoney:'शहद', detailOrigin:'उत्पत्ति का देश', detailStorage:'भंडारण', detailStorageValue:'ठंडी और सूखी जगह पर रखें', detailFssai:'FSSAI लाइसेंस',
    productsEyebrow:'हमारे उत्पाद',
    productsTitle:'शुद्ध। सरल। <em>ईमानदार।</em>',
    productsIntro:'शहद से शुरुआत, और कदम-दर-कदम GLOPE की उत्पाद श्रृंखला का विस्तार।',
    currentProduct:'वर्तमान उत्पाद', honeyName:'GLOPE Honey', honeyLabel:'HONEY',
    honey1Desc:'हमारा पहला उत्पाद — एक किसान परिवार से मिले शहद के अनुभव और उत्पाद को समझने के बाद ही उसके आसपास ब्रांड बनाने के निर्णय से जन्मा।',
    honey500Desc:'रोज़मर्रा के उपयोग के लिए छोटा पैक, उसी GLOPE पहचान के साथ।',
    honey250Desc:'उन लोगों के लिए छोटा पैक जो कम मात्रा से शुरुआत करना चाहते हैं या शहद को आसानी से साथ रखना चाहते हैं।',
    rangeLabel:'हमारी शहद श्रृंखला', rangeTitle:'उत्पाद से बनी पहचान, विज्ञापन से नहीं।',
    nextProduct:'अगला उत्पाद', gheeName:'GLOPE Ghee', gheeComing:'1 kg • जल्द उपलब्ध',
    gheeDesc:'अगला उत्पाद तब पेश किया जाएगा जब वह स्पष्टता, गुणवत्ता और उचित मूल्य के उसी मानक पर खरा उतरे।',
    farmEyebrow:'जहाँ से शुरुआत हुई',
    farmTitle:'खेत के करीब।<br><em>उत्पाद के करीब।</em>',
    farmP1:'GLOPE की शुरुआत शहद और एक किसान परिवार से मिले उस अनुभव से हुई, जिसने शुरू से ही उत्पाद के स्रोत को महत्वपूर्ण बनाया।',
    farmP2:'हम चाहते हैं कि रोज़मर्रा के कृषि उत्पाद उन्हें तैयार करने वाले लोगों से उन परिवारों तक अधिक वास्तविक और पारदर्शी तरीके से पहुँचें जो उनका उपयोग करते हैं।',
    storyEyebrow:'GLOPE की कहानी', storyTitle:'एक सरल सोच।<br><em>एक बड़ा उद्देश्य।</em>',
    storyP1:'किसान परिवार में पले-बढ़े होने के कारण शहद हमारे लिए कोई नया उत्पाद नहीं था। घर में शहद निकाला जाता था, इस्तेमाल होता था — और उसके स्रोत को जानना स्वाभाविक था।',
    storyP2:'लेकिन जब इसे एक व्यवसाय के रूप में देखा, तो सवाल बड़ा था — रोज़मर्रा के कृषि उत्पाद उन परिवारों तक अधिक वास्तविक और पारदर्शी तरीके से कैसे पहुँचें, जो उन्हें अपने घर में इस्तेमाल करते हैं?',
    timeline1Title:'एक निर्णय', timeline2Title:'GLOPE की शुरुआत', timeline3Title:'एक कठिन दौर', timeline4Title:'फिर से शुरुआत', timeline5Title:'खेत से परिवार तक',
    timeline1P:'Ashish Singh ने IPCC की तैयारी छोड़कर मधुमक्खियों, उत्पादन, गुणवत्ता और मिलावट को समझने का अध्ययन शुरू किया।',
    timeline2P:'2019 में GLOPE की शुरुआत एक Honey Farm के रूप में हुई — एक सरल सोच के साथ: पहले उत्पाद को समझना, फिर उसके आसपास ब्रांड बनाना।',
    timeline3P:'COVID-19 महामारी के दौरान नए व्यवसाय को भारी नुकसान हुआ। फिर से शुरुआत करने की ज़रूरत पड़ी।',
    timeline4P:'2022 तक व्यवसाय ने फिर से गति पकड़ी और GLOPE का दीर्घकालिक उद्देश्य पहले से अधिक स्पष्ट हो गया।',
    timeline5P:'आज भी इस यात्रा के केंद्र में वही बात है — genuine products, उचित pricing और किसानों के लिए बेहतर value।',
    beliefEyebrow:'हमारी सोच', beliefTitle:'न दिखावटी विज्ञापन।<br><em>न अतिरिक्त दावे।</em>',
    belief1Title:'उत्पाद को बोलने दें।', belief1P:'बढ़ा-चढ़ाकर किए गए marketing claims की जगह सीधी और स्पष्ट product story।',
    belief2Title:'काम के करीब रहें।', belief2P:'Branding, packaging, marketing और quality oversight GLOPE के परिवार द्वारा सीधे देखे जाते हैं।',
    belief3Title:'उचित मूल्य।', belief3P:'परिवारों के लिए सुलभ मूल्य और किसानों के लिए अधिक उचित हिस्सा।',
    peopleEyebrow:'GLOPE के पीछे', peopleTitle:'दो लोग।<br><em>एक साझा सोच।</em>',
    peopleIntro:'GLOPE एक family-led brand है। इसके पीछे के लोग उत्पाद और काम — दोनों से सीधे जुड़े रहते हैं।',
    founderName:'Ashish Singh', founderLabel:'01 • FOUNDER', founderTags:'Business · Brand · Entrepreneurship', brotherLabel:'02 • FAMILY & PRODUCT', brotherTags:'Chemistry · Teaching · Technology', instagramHandle:'Instagram · @glopeagro',
    founderDesc:'GLOPE के Founder, जिन्होंने किसान परिवार से मिली शहद की समझ को एक व्यवसाय में बदलने की यात्रा शुरू की।',
    brotherTitle:'Science + Technology',
    brotherDesc:'Founder के भाई का background Chemistry, teaching और technology में है। वे product understanding, quality oversight और brand के technical पक्ष में योगदान देते हैं।',
    quote:'“उत्पाद को समझने से लेकर उसे आपके सामने रखने तक, हम खुद इस काम से जुड़े रहना पसंद करते हैं।”',
    instaEyebrow:'GLOPE को follow करें', instaDesc:'हमारी journey, products और updates के लिए Instagram पर जुड़ें।',
    openInstagram:'Instagram खोलें →', scanVisit:'Instagram देखने के लिए scan करें',
    contactEyebrow:'संपर्क करें', contactTitle:'GLOPE को<br><em>घर तक लाएँ।</em>',
    contactDesc:'Product enquiries, availability या business conversations के लिए सीधे हमसे बात करें।',
    footerTagline:'खेत से परिवार तक।'
  }
};

function setLanguage(lang){
  const isHindi = lang === 'hi';
  document.documentElement.lang = isHindi ? 'hi' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.dataset.i18n;
    if(isHindi && translations.hi[key] !== undefined){
      el.innerHTML=translations.hi[key];
    } else {
      // English originals are stored once on first load.
      if(!el.dataset.enOriginal) el.dataset.enOriginal=el.innerHTML;
      el.innerHTML=el.dataset.enOriginal;
    }
  });
  document.querySelectorAll('.lang-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.lang===lang);
  });
  localStorage.setItem('glope-language',lang);
}

document.querySelectorAll('.lang-btn').forEach(btn=>{
  btn.addEventListener('click',()=>setLanguage(btn.dataset.lang));
});

document.querySelectorAll('[data-i18n]').forEach(el=>{
  if(!el.dataset.enOriginal) el.dataset.enOriginal=el.innerHTML;
});

const savedLanguage = localStorage.getItem('glope-language') || 'en';
setLanguage(savedLanguage);

const year=document.getElementById('year');
if(year) year.textContent=new Date().getFullYear();
