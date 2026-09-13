export type Language = 'en' | 'ar';

export interface Translations {
  // Brand
  brandName: string;
  brandTagline: string;
  systemName: string;

  // Navigation
  navToday: string;
  navAssignments: string;
  navExams: string;
  navGrades: string;
  navPlanner: string;
  navPomodoro: string;
  navFlashcards: string;
  navHabits: string;
  navNotes: string;
  navChat: string;
  navSettings: string;
  signOut: string;
  more: string;

  // Flashcards
  flashcardsTitle: string;
  flashcardsSubtitle: string;
  newDeck: string;
  addCard: string;
  deleteDeck: string;
  deleteCard: string;
  deleteDeckConfirm: string;
  deleteCardConfirm: string;
  quizMode: string;
  exitQuiz: string;
  tapToReveal: string;
  tapToFlipBack: string;
  rateRecall: string;
  needsPractice: string;
  gotItRight: string;
  noDecks: string;
  noDecksDesc: string;
  reviewedCount: string;
  correctCount: string;
  createDeckTitle: string;
  deckTitleLabel: string;
  deckDescLabel: string;
  questionLabel: string;
  answerLabel: string;

  // Chat & Telegram Sync
  chatTitle: string;
  chatSubtitle: string;
  telegramSyncBadge: string;
  telegramConnected: string;
  telegramNotConnected: string;
  sendQuestionPlaceholder: string;
  sendBtn: string;
  clearHistory: string;
  noMessagesYet: string;
  noMessagesDesc: string;
  filterAll: string;
  filterTelegram: string;
  filterWeb: string;

  // Language Settings
  languageSettings: string;
  languageDesc: string;
  selectLanguage: string;
  english: string;
  arabic: string;
  defaultBadge: string;

  // Settings Page
  settingsTitle: string;
  settingsDesc: string;
  telegramBotTitle: string;
  telegramBotDesc: string;
  statusLinked: string;
  statusNotLinked: string;
  linkCodeLabel: string;
  generateCode: string;
  copyCode: string;
  copied: string;
  linkInstructions: string;
  webhookEndpoint: string;
  copyWebhook: string;
  studentProfile: string;
  fullName: string;
  trackLabel: string;
  targetPercentage: string;
  changePassword: string;
  updatePassword: string;
  accountSection: string;
  deleteAccount: string;
  deleteAccountConfirm: string;
  cancel: string;
  confirm: string;
  save: string;

  // Auth Page
  signIn: string;
  signUp: string;
  signInDesc: string;
  signUpDesc: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  haveAccount: string;
  noAccount: string;
  signInHere: string;
  signUpNow: string;
  processing: string;
  forgotPassword: string;
  forgotPasswordDesc: string;
  resetPasswordBtn: string;
  backToSignIn: string;

  // Today View
  welcomeBack: string;
  todayOverview: string;
  addClass: string;
  nextExam: string;
  focusToday: string;
  dueToday: string;
  targetGoal: string;
  todayClasses: string;
  scheduledClasses: string;
  noClassesToday: string;
  assignmentsDueToday: string;
  dailyTasks: string;
  noTasksToday: string;
  dailyHabits: string;
  done: string;
  pending: string;
  addClassTitle: string;
  dayLabel: string;
  subjectLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  teacherLocationLabel: string;
  saveClass: string;

  // Tracks
  trackMedical: string;
  trackMedicalEn: string;
  trackEngineering: string;
  trackEngineeringEn: string;
  trackBusiness: string;
  trackBusinessEn: string;
  trackHumanities: string;
  trackHumanitiesEn: string;

  // Days of Week
  daySaturday: string;
  daySunday: string;
  dayMonday: string;
  dayTuesday: string;
  dayWednesday: string;
  dayThursday: string;
  dayFriday: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Brand
    brandName: 'TaskerBot / TSC AI',
    brandTagline: 'TaskerBot / TSC AI • Smart School Assistant',
    systemName: 'TaskerBot / TSC AI System',

    // Navigation
    navToday: 'Today View',
    navAssignments: 'Assignments',
    navExams: 'Exam Countdown',
    navGrades: 'Grade Tracker',
    navPlanner: 'Study Planner',
    navPomodoro: 'Pomodoro Focus',
    navFlashcards: 'Flashcards & Quiz',
    navHabits: 'Habit Tracker',
    navNotes: 'Quick Notes',
    navChat: 'Telegram & AI Chat',
    navSettings: 'Settings & Bot',
    signOut: 'Sign Out',
    more: 'More',

    // Flashcards
    flashcardsTitle: 'Flashcards & Quiz',
    flashcardsSubtitle: 'Active recall and revision decks.',
    newDeck: 'New Deck',
    addCard: 'Add Card',
    deleteDeck: 'Delete Deck',
    deleteCard: 'Delete Card',
    deleteDeckConfirm: 'Are you sure you want to delete this deck and all of its flashcards? This action cannot be undone.',
    deleteCardConfirm: 'Are you sure you want to delete this card?',
    quizMode: 'Start Quiz',
    exitQuiz: 'Exit Quiz',
    tapToReveal: 'Tap to reveal answer',
    tapToFlipBack: 'Tap to flip back',
    rateRecall: 'Rate your recall',
    needsPractice: 'Needs Practice',
    gotItRight: 'Got It Right',
    noDecks: 'No decks created yet',
    noDecksDesc: 'Click "+ New Deck" to create your first flashcard deck.',
    reviewedCount: 'Reviewed',
    correctCount: 'Correct',
    createDeckTitle: 'Create Flashcard Deck',
    deckTitleLabel: 'Deck Title',
    deckDescLabel: 'Description (Optional)',
    questionLabel: 'Question',
    answerLabel: 'Answer',

    // Chat & Telegram Sync
    chatTitle: 'TaskerBot / TSC AI',
    chatSubtitle: 'Your personal AI study partner & copilot, synced in real-time between Telegram, WhatsApp, and your dashboard.',
    telegramSyncBadge: 'Telegram Sync Active',
    telegramConnected: 'Connected to Telegram (@TSCTaskerBot)',
    telegramNotConnected: 'Not linked to Telegram. Go to Settings to link.',
    sendQuestionPlaceholder: 'Ask a question about your lessons, solve problems, or log tasks...',
    sendBtn: 'Send',
    clearHistory: 'Clear Chat History',
    noMessagesYet: 'No messages yet',
    noMessagesDesc: 'Send a message here or message @TSCTaskerBot on Telegram to start studying!',
    filterAll: 'All Messages',
    filterTelegram: 'Telegram',
    filterWeb: 'Web',

    // Language Settings
    languageSettings: 'Language & Localization',
    languageDesc: 'Choose your interface language. English is the default.',
    selectLanguage: 'Display Language',
    english: 'English',
    arabic: 'العربية (Arabic)',
    defaultBadge: 'Default',

    // Settings Page
    settingsTitle: 'Settings',
    settingsDesc: 'Language preferences, Telegram Memory Bot sync, and security.',
    telegramBotTitle: 'Telegram Memory Bot',
    telegramBotDesc: 'Send voice or text messages to your bot for Gemini AI to parse and log.',
    statusLinked: 'Linked',
    statusNotLinked: 'Not Linked',
    linkCodeLabel: 'Your One-Time Link Code',
    generateCode: 'Generate Code',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    linkInstructions: 'Send /start {code} to @TSCTaskerBot in Telegram to connect.',
    webhookEndpoint: 'Webhook Endpoint',
    copyWebhook: 'Copy',
    studentProfile: 'Student Profile',
    fullName: 'Full Name',
    trackLabel: 'Academic Track',
    targetPercentage: 'Target %',
    changePassword: 'Change Password',
    updatePassword: 'Update Password',
    accountSection: 'Account',
    deleteAccount: 'Delete Account',
    deleteAccountConfirm: 'Are you sure you want to sign out and clear your active session?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save Changes',

    // Auth Page
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signInDesc: 'Enter your credentials to access TaskerBot / TSC AI',
    signUpDesc: 'Create your private student profile for TaskerBot / TSC AI',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    haveAccount: 'Already registered?',
    noAccount: "Don't have an account yet?",
    signInHere: 'Sign In Here',
    signUpNow: 'Sign Up Now',
    processing: 'Processing...',
    forgotPassword: 'Forgot Password?',
    forgotPasswordDesc: 'Enter your email address and we will send you a password reset link.',
    resetPasswordBtn: 'Send Reset Link',
    backToSignIn: 'Back to Sign In',

    // Today View
    welcomeBack: 'Welcome back',
    todayOverview: 'Today Overview',
    addClass: '+ Add Class',
    nextExam: 'Next Exam',
    focusToday: 'Focus Today',
    dueToday: 'Due Today',
    targetGoal: 'Target Goal',
    todayClasses: "Today's Classes",
    scheduledClasses: 'scheduled',
    noClassesToday: 'No classes scheduled for today. Click "+ Add Class" to set your timetable.',
    assignmentsDueToday: 'Assignments Due Today',
    dailyTasks: 'Daily Tasks',
    noTasksToday: 'No quick tasks added for today.',
    dailyHabits: 'Daily Habits',
    done: 'Done',
    pending: 'Pending',
    addClassTitle: 'Add Class to Timetable',
    dayLabel: 'Day of the Week',
    subjectLabel: 'Subject',
    startTimeLabel: 'Start Time',
    endTimeLabel: 'End Time',
    teacherLocationLabel: 'Teacher / Location (Optional)',
    saveClass: 'Save Class',

    // Tracks
    trackMedical: 'Medical & Life Sciences',
    trackMedicalEn: 'Biology, Chemistry, Physics',
    trackEngineering: 'Engineering & Computer Science',
    trackEngineeringEn: 'Pure Math, Programming & AI',
    trackBusiness: 'Business & Economics',
    trackBusinessEn: 'Economics, Accounting, Business',
    trackHumanities: 'Humanities & Arts',
    trackHumanitiesEn: 'Geography, Psychology, Statistics',

    // Days of Week
    daySaturday: 'Saturday',
    daySunday: 'Sunday',
    dayMonday: 'Monday',
    dayTuesday: 'Tuesday',
    dayWednesday: 'Wednesday',
    dayThursday: 'Thursday',
    dayFriday: 'Friday',
  },
  ar: {
    // Brand
    brandName: 'TaskerBot / TSC AI',
    brandTagline: 'TaskerBot / TSC AI • المساعد المدرسي الذكي',
    systemName: 'منظومة TaskerBot / TSC AI الذكية',

    // Navigation
    navToday: 'نظرة اليوم',
    navAssignments: 'الواجبات والمهام',
    navExams: 'العد التنازلي للامتحانات',
    navGrades: 'سجل الدرجات',
    navPlanner: 'خطة المذاكرة',
    navPomodoro: 'مؤقت بومودورو للتركيز',
    navFlashcards: 'البطاقات والاختبارات',
    navHabits: 'متابعة العادات والنوم',
    navNotes: 'الملاحظات السريعة',
    navChat: 'محادثة تيليجرام والذكاء الاصطناعي',
    navSettings: 'الإعدادات وبوت تيليجرام',
    signOut: 'تسجيل الخروج',
    more: 'المزيد',

    // Flashcards
    flashcardsTitle: 'البطاقات التعليمية والاختبارات',
    flashcardsSubtitle: 'مجموعات الاسترجاع النشط والمراجعة السريعة.',
    newDeck: 'مجموعة جديدة',
    addCard: 'إضافة بطاقة',
    deleteDeck: 'حذف المجموعة',
    deleteCard: 'حذف البطاقة',
    deleteDeckConfirm: 'هل أنت متأكد من رغبتك في حذف هذه المجموعة بجميع بطاقاتها؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteCardConfirm: 'هل أنت متأكد من رغبتك في حذف هذه البطاقة؟',
    quizMode: 'بدء الاختبار',
    exitQuiz: 'إنهاء الاختبار',
    tapToReveal: 'اضغط لإظهار الإجابة',
    tapToFlipBack: 'اضغط للعودة إلى السؤال',
    rateRecall: 'قيّم مستوى استرجاعك للمعلومة',
    needsPractice: 'تحتاج مراجعة',
    gotItRight: 'أجبت بشكل صحيح',
    noDecks: 'لا توجد مجموعات بطاقات مضافة حتى الآن',
    noDecksDesc: 'اضغط على "+ مجموعة جديدة" لإنشاء أول مجموعة بطاقات تعليمية.',
    reviewedCount: 'تمت المراجعة',
    correctCount: 'إجابة صحيحة',
    createDeckTitle: 'إنشاء مجموعة بطاقات جديدة',
    deckTitleLabel: 'عنوان المجموعة',
    deckDescLabel: 'الوصف (اختياري)',
    questionLabel: 'السؤال',
    answerLabel: 'الإجابة النموذجية',

    // Chat & Telegram Sync
    chatTitle: 'TaskerBot / TSC AI',
    chatSubtitle: 'مساعدك وصاحبك الدراسي الذكي، متزامن لحظياً مع تيليجرام وواتساب ولوحة التحكم.',
    telegramSyncBadge: 'مزامنة تيليجرام نشطة',
    telegramConnected: 'متصل مع بوت تيليجرام (@TSCTaskerBot)',
    telegramNotConnected: 'حسابك غير مربوط بتيليجرام بعد. توجه إلى الإعدادات للربط.',
    sendQuestionPlaceholder: 'اسأل عن أي مسألة، قانون، تلخيص درس، أو سجل واجب...',
    sendBtn: 'إرسال',
    clearHistory: 'مسح سجل المحادثات',
    noMessagesYet: 'لا توجد رسائل بعد',
    noMessagesDesc: 'أرسل رسالة هنا أو تحدث مع @TSCTaskerBot في تيليجرام لبدء المذاكرة!',
    filterAll: 'الكل',
    filterTelegram: 'تيليجرام',
    filterWeb: 'الويب',

    // Language Settings
    languageSettings: 'اللغة والتعريب',
    languageDesc: 'اختر لغة واجهة لوحة التحكم المفضلة لديك. الإنجليزية هي الافتراضية.',
    selectLanguage: 'لغة العرض',
    english: 'English (الإنجليزية)',
    arabic: 'العربية (Arabic)',
    defaultBadge: 'الافتراضية',

    // Settings Page
    settingsTitle: 'الإعدادات',
    settingsDesc: 'تفضيلات اللغة وربط بوت تيليجرام وأمان الحساب.',
    telegramBotTitle: 'بوت الذاكرة في تيليجرام',
    telegramBotDesc: 'أرسل رسائل صوتية أو نصية إلى البوت لتحليلها وتدوينها تلقائياً عبر الذكاء الاصطناعي.',
    statusLinked: 'متصل ومربوط',
    statusNotLinked: 'غير مربوط بعد',
    linkCodeLabel: 'رمز الربط الخاص بك (استخدام مرة واحدة)',
    generateCode: 'توليد رمز جديد',
    copyCode: 'نسخ الرمز',
    copied: 'تم النسخ!',
    linkInstructions: 'أرسل /start {code} إلى البوت @TSCTaskerBot في تيليجرام لربط حسابك.',
    webhookEndpoint: 'رابط Webhook للخدمة',
    copyWebhook: 'نسخ',
    studentProfile: 'الملف الأكاديمي للطالب',
    fullName: 'الاسم بالكامل',
    trackLabel: 'المسار التخصصي',
    targetPercentage: 'النسبة المستهدفة %',
    changePassword: 'تغيير كلمة المرور',
    updatePassword: 'تحديث كلمة المرور',
    accountSection: 'الحساب',
    deleteAccount: 'تسجيل الخروج وإنهاء الجلسة',
    deleteAccountConfirm: 'هل أنت متأكد من رغبتك في تسجيل الخروج وإنهاء الجلسة الحالية؟',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ التعديلات',

    // Auth Page
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب جديد',
    signInDesc: 'أدخل بياناتك للدخول إلى TaskerBot / TSC AI',
    signUpDesc: 'أنشئ ملفك الأكاديمي الخاص في منظومة TaskerBot / TSC AI',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    haveAccount: 'لديك حساب بالفعل؟',
    noAccount: 'ليس لديك حساب حتى الآن؟',
    signInHere: 'سجّل الدخول الآن',
    signUpNow: 'أنشئ حساباً جديداً',
    processing: 'جاري المعالجة...',
    forgotPassword: 'نسيت كلمة المرور؟',
    forgotPasswordDesc: 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابط استعادة وتعيين كلمة المرور.',
    resetPasswordBtn: 'إرسال رابط الاستعادة',
    backToSignIn: 'العودة لتسجيل الدخول',

    // Today View
    welcomeBack: 'مرحباً بك',
    todayOverview: 'نظرة شاملة لليوم',
    addClass: '+ إضافة حصة',
    nextExam: 'الامتحان القادم',
    focusToday: 'تركيز اليوم',
    dueToday: 'واجبات اليوم',
    targetGoal: 'الهدف المطلوب',
    todayClasses: 'حصص ودروس اليوم',
    scheduledClasses: 'مجدولة',
    noClassesToday: 'لا توجد حصص مجدولة لليوم. اضغط على "+ إضافة حصة" لإعداد جدولك الأسبوعي.',
    assignmentsDueToday: 'واجبات ومطالب اليوم',
    dailyTasks: 'المهام اليومية السريعة',
    noTasksToday: 'لا توجد مهام سريعة مضافة لليوم.',
    dailyHabits: 'العادات اليومية',
    done: 'تم الإنجاز',
    pending: 'قيد الانتظار',
    addClassTitle: 'إضافة حصة إلى الجدول الدراسي',
    dayLabel: 'اليوم في الأسبوع',
    subjectLabel: 'المادة الدراسية',
    startTimeLabel: 'وقت البدء',
    endTimeLabel: 'وقت الانتهاء',
    teacherLocationLabel: 'المعلم / القاعة أو المكان (اختياري)',
    saveClass: 'حفظ الحصة',

    // Tracks
    trackMedical: 'مسار الطب وعلوم الحياة',
    trackMedicalEn: 'أحياء، كيمياء، فيزياء',
    trackEngineering: 'مسار الهندسة وعلوم الحاسب',
    trackEngineeringEn: 'رياضيات بحتة، برمجة وذكاء اصطناعي',
    trackBusiness: 'مسار الأعمال والإدارة',
    trackBusinessEn: 'اقتصاد، محاسبة، إدارة أعمال',
    trackHumanities: 'مسار الآداب والفنون والعلوم الإنسانية',
    trackHumanitiesEn: 'جغرافيا، علم نفس، إحصاء',

    // Days of Week
    daySaturday: 'السبت',
    daySunday: 'الأحد',
    dayMonday: 'الإثنين',
    dayTuesday: 'الثلاثاء',
    dayWednesday: 'الأربعاء',
    dayThursday: 'الخميس',
    dayFriday: 'الجمعة',
  },
};
