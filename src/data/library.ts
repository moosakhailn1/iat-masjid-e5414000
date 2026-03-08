export type Category = 'Faith' | 'Prayer' | 'Fasting' | 'Charity' | 'Manners' | 'Knowledge' | 'Patience' | 'Gratitude' | 'Family' | 'Other';

export interface Hadith {
  id: string;
  arabic: string;
  english: string;
  pashto: string;
  dari: string;
  source: string;
  number: number;
  narrator: string;
  category: Category;
}

export interface Dua {
  id: string;
  arabic: string;
  english: string;
  pashto: string;
  dari: string;
  occasion: string;
  source: string;
  category: Category;
}

export interface Khutbah {
  id: string;
  title: string;
  arabic: string;
  english: string;
  pashto: string;
  dari: string;
  imam: string;
  date: string;
  topic: string;
  category: Category;
  type: 'Friday Sermon' | 'Eid' | 'Ramadan' | 'General' | 'Special Occasion';
  fullText: string;
}

export const categories: Category[] = ['Faith', 'Prayer', 'Fasting', 'Charity', 'Manners', 'Knowledge', 'Patience', 'Gratitude', 'Family', 'Other'];

export const hadiths: Hadith[] = [
  {
    id: 'h1',
    arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
    english: '"Actions are but by intentions, and every person will have only what they intended."',
    pashto: '"عملونه یوازې د نیتونو پورې اړه لري، او هر سړی به هغه شی ولري چې یې نیت کړی وي."',
    dari: '"اعمال بستگی به نیت‌ها دارد و هر کس آنچه را نیت کرده باشد خواهد یافت."',
    source: 'Sahih Bukhari',
    number: 1,
    narrator: 'Umar ibn al-Khattab (RA)',
    category: 'Faith',
  },
  {
    id: 'h2',
    arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
    english: '"A Muslim is the one from whose tongue and hand other Muslims are safe."',
    pashto: '"مسلمان هغه دی چې نور مسلمانان د هغه له ژبې او لاسه خوندي وي."',
    dari: '"مسلمان کسی است که مسلمانان دیگر از زبان و دست او در امان باشند."',
    source: 'Sahih Bukhari',
    number: 10,
    narrator: 'Abdullah ibn Amr (RA)',
    category: 'Manners',
  },
  {
    id: 'h3',
    arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
    english: '"Seeking knowledge is an obligation upon every Muslim."',
    pashto: '"د علم زده کول په هر مسلمان فرض دی."',
    dari: '"طلب علم بر هر مسلمان فرض است."',
    source: 'Sunan Ibn Majah',
    number: 224,
    narrator: 'Anas ibn Malik (RA)',
    category: 'Knowledge',
  },
  {
    id: 'h4',
    arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    english: '"None of you truly believes until he loves for his brother what he loves for himself."',
    pashto: '"ستاسو څخه هیڅوک ریښتینی مؤمن نه دی تر هغه چې د خپل ورور لپاره هغه خوښ نه کړي چې د ځان لپاره یې خوښوي."',
    dari: '"هیچ یک از شما ایمان کامل ندارد تا آنکه برای برادرش آنچه را برای خود دوست دارد دوست بدارد."',
    source: 'Sahih Bukhari',
    number: 13,
    narrator: 'Anas ibn Malik (RA)',
    category: 'Faith',
  },
  {
    id: 'h5',
    arabic: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
    english: '"Whoever fasts during Ramadan with sincere faith and hoping for a reward from Allah, all his previous sins will be forgiven."',
    pashto: '"هر څوک چې د رمضان روژه د ایمان او د ثواب په امید ونیسي، د هغه ټول تیر ګناهونه بخښل کیږي."',
    dari: '"هر کس که با ایمان و به امید ثواب روزه رمضان بگیرد، گناهان گذشته‌اش بخشیده می‌شود."',
    source: 'Sahih Bukhari',
    number: 38,
    narrator: 'Abu Hurairah (RA)',
    category: 'Fasting',
  },
  {
    id: 'h6',
    arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    english: '"Charity does not decrease wealth."',
    pashto: '"صدقه مال نه کموي."',
    dari: '"صدقه مال را کم نمی‌کند."',
    source: 'Sahih Muslim',
    number: 2588,
    narrator: 'Abu Hurairah (RA)',
    category: 'Charity',
  },
  {
    id: 'h7',
    arabic: 'خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ وَأَنَا خَيْرُكُمْ لِأَهْلِي',
    english: '"The best of you are those who are best to their families, and I am the best of you to my family."',
    pashto: '"ستاسو غوره هغه دی چې د خپلې کورنۍ سره غوره وي، او زه ستاسو ټولو څخه د خپلې کورنۍ سره غوره یم."',
    dari: '"بهترین شما کسی است که با خانواده‌اش بهترین باشد، و من بهترین شما با خانواده‌ام هستم."',
    source: 'Sunan al-Tirmidhi',
    number: 3895,
    narrator: 'Aisha (RA)',
    category: 'Family',
  },
  {
    id: 'h8',
    arabic: 'الصَّبْرُ ضِيَاءٌ',
    english: '"Patience is illumination."',
    pashto: '"صبر رڼا ده."',
    dari: '"صبر نور است."',
    source: 'Sahih Muslim',
    number: 223,
    narrator: 'Abu Malik al-Ashari (RA)',
    category: 'Patience',
  },
];

export const duas: Dua[] = [
  {
    id: 'd1',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    english: '"Our Lord, give us good in this world and good in the Hereafter and save us from the punishment of the Fire."',
    pashto: '"ای زمونږ رب! موږ ته په دنیا کې نیکي راکړه او په آخرت کې هم نیکي، او له اور عذاب نه مو وساته."',
    dari: '"پروردگارا! به ما در دنیا نیکی عطا کن و در آخرت نیز نیکی، و ما را از عذاب آتش نگاه دار."',
    occasion: 'General Supplication',
    source: 'Quran 2:201',
    category: 'Prayer',
  },
  {
    id: 'd2',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    english: '"My Lord, increase me in knowledge."',
    pashto: '"ای زما رب! زما علم زیات کړه."',
    dari: '"پروردگارا! علم مرا زیاد کن."',
    occasion: 'Seeking Knowledge',
    source: 'Quran 20:114',
    category: 'Knowledge',
  },
  {
    id: 'd3',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    english: '"My Lord, expand my chest and ease my task for me."',
    pashto: '"ای زما رب! زما سینه پراخه کړه او زما کار آسانه کړه."',
    dari: '"پروردگارا! سینه‌ام را گشاده کن و کارم را آسان گردان."',
    occasion: 'Before Difficult Tasks',
    source: 'Quran 20:25-26',
    category: 'Patience',
  },
  {
    id: 'd4',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    english: '"O Allah, I seek refuge in You from anxiety and grief."',
    pashto: '"اے الله! زه ستا پناه غواړم د غم او اندېښنې نه."',
    dari: '"خدایا! من از اندوه و غم به تو پناه می‌برم."',
    occasion: 'Times of Worry',
    source: 'Sahih Bukhari',
    category: 'Patience',
  },
  {
    id: 'd5',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ',
    english: '"Our Lord, grant us from our spouses and offspring comfort to our eyes."',
    pashto: '"ای زمونږ رب! زمونږ د ښځو او اولادونو څخه زمونږ د سترګو روښنایي راکړه."',
    dari: '"پروردگارا! از همسران و فرزندان ما نور چشم ما قرار ده."',
    occasion: 'For Family',
    source: 'Quran 25:74',
    category: 'Family',
  },
  {
    id: 'd6',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    english: '"All praise is due to Allah who fed us, gave us drink, and made us Muslims."',
    pashto: '"ټول ستاینه د الله لپاره ده چې موږ یې وخوراوو، موږ یې اوبه ورکړې، او مسلمانان یې جوړ کړو."',
    dari: '"حمد خداوندی را که ما را خوراک داد و آب نوشاند و مسلمان قرار داد."',
    occasion: 'After Eating',
    source: 'Sunan Abu Dawud',
    category: 'Gratitude',
  },
];

export const khutbahs: Khutbah[] = [
  {
    id: 'k1',
    title: 'The Importance of Tawbah (Repentance)',
    arabic: 'إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ',
    english: 'Dear brothers and sisters in Islam, As-salamu alaykum wa rahmatullahi wa barakatuh.',
    pashto: 'ګرانو وروڼو او خویندو! السلام علیکم و رحمة الله و برکاته.',
    dari: 'برادران و خواهران گرامی! السلام علیکم و رحمة الله و برکاته.',
    imam: 'Imam Ahmad Al-Rashid',
    date: 'March 14, 2024',
    topic: 'Repentance and Forgiveness',
    category: 'Faith',
    type: 'Friday Sermon',
    fullText: 'All praise belongs to Allah, the Most Merciful, the Most Compassionate. We praise Him, we seek His help, and we seek His forgiveness. We bear witness that there is no god but Allah, and we bear witness that Muhammad ﷺ is His servant and Messenger.\n\nDear believers, today we gather to reflect on one of the most beautiful gifts Allah has bestowed upon the children of Adam — the gift of Tawbah, repentance.\n\nAllah says in the Quran: "Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful." (39:53)\n\nThis verse is one of the most hope-giving verses in the entire Quran. No matter how great our sins, the door of repentance remains open.',
  },
  {
    id: 'k2',
    title: 'The Blessings of Ramadan',
    arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ',
    english: 'The month of Ramadan in which the Quran was revealed.',
    pashto: 'د رمضان میاشت هغه ده چې قرآن پکې نازل شوی.',
    dari: 'ماه رمضان است که قرآن در آن نازل شده است.',
    imam: 'Imam Muhammad Hassan',
    date: 'March 8, 2024',
    topic: 'Ramadan Preparation',
    category: 'Fasting',
    type: 'Ramadan',
    fullText: 'All praise is due to Allah, Lord of all the worlds. We praise Him, seek His aid, and ask for His forgiveness.\n\nDear brothers and sisters, the blessed month of Ramadan approaches us once again. It is a month of mercy, forgiveness, and salvation from the Hellfire.\n\nThe Prophet ﷺ said: "When Ramadan begins, the gates of Paradise are opened, the gates of Hellfire are closed, and the devils are chained."\n\nLet us prepare ourselves spiritually, mentally, and physically for this sacred month.',
  },
  {
    id: 'k3',
    title: 'Building Strong Muslim Families',
    arabic: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا',
    english: 'And of His signs is that He created for you mates from among yourselves that you may find tranquility in them.',
    pashto: 'او د هغه له نښو نه دا ده چې هغه ستاسو لپاره له خپلو نفسونو نه ملګرتیاوې پیدا کړې چې تاسو ورسره آرام ومومئ.',
    dari: 'و از نشانه‌های او این است که از خودتان همسرانی برایتان آفرید تا در کنار آنها آرامش یابید.',
    imam: 'Imam Khalid Ibrahim',
    date: 'February 28, 2024',
    topic: 'Family in Islam',
    category: 'Family',
    type: 'Friday Sermon',
    fullText: 'All praise belongs to Allah who created us from a single soul and from it created its mate.\n\nDear believers, the family unit is the foundation of a healthy society. Islam places enormous emphasis on family bonds and relationships.\n\nAllah says: "And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy." (30:21)\n\nLet us strive to build homes filled with love, mercy, and the remembrance of Allah.',
  },
];

export const dailyHadith: Hadith = hadiths[4]; // Ramadan hadith as daily
