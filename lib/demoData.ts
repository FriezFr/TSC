import { Assignment, Exam, Flashcard, FlashcardDeck, GradeItem, Habit, HabitLog, Note, TimetableSlot, UserProfile } from './types';

export const DEMO_PROFILE: UserProfile = {
  id: 'demo-user-123',
  full_name: 'Ahmed El-Sayed (أحمد السيد)',
  study_division: 'scientific_science',
  target_percentage: 98.5,
};

export const DEMO_TIMETABLE: TimetableSlot[] = [
  // Saturday
  { id: 'tt-1', day_of_week: 0, subject: 'Physics', start_time: '09:00', end_time: '11:00', room_or_teacher: 'Mr. Mahmoud (Center)' },
  { id: 'tt-2', day_of_week: 0, subject: 'Arabic', start_time: '12:00', end_time: '14:00', room_or_teacher: 'Mr. Reda El-Farouk' },
  // Sunday
  { id: 'tt-3', day_of_week: 1, subject: 'Chemistry', start_time: '10:00', end_time: '12:30', room_or_teacher: 'Dr. Tarek (El-Basha)' },
  { id: 'tt-4', day_of_week: 1, subject: 'English', start_time: '14:00', end_time: '15:30', room_or_teacher: 'Mr. Sherif' },
  // Monday
  { id: 'tt-5', day_of_week: 2, subject: 'Biology', start_time: '08:30', end_time: '10:30', room_or_teacher: 'Dr. Ahmed El-Gohary' },
  { id: 'tt-6', day_of_week: 2, subject: '2nd Language (French)', start_time: '12:00', end_time: '13:30', room_or_teacher: 'Mme. Sarah' },
  // Tuesday
  { id: 'tt-7', day_of_week: 3, subject: 'Geology', start_time: '09:00', end_time: '10:30', room_or_teacher: 'Geo. Maged' },
  { id: 'tt-8', day_of_week: 3, subject: 'Physics', start_time: '13:00', end_time: '15:00', room_or_teacher: 'Solving Chapter 4' },
  // Wednesday
  { id: 'tt-9', day_of_week: 4, subject: 'Chemistry', start_time: '09:30', end_time: '11:30', room_or_teacher: 'Organic Chemistry Lab' },
  { id: 'tt-10', day_of_week: 4, subject: 'Arabic', start_time: '13:00', end_time: '15:00', room_or_teacher: 'Nahu Revision' },
  // Thursday
  { id: 'tt-11', day_of_week: 5, subject: 'Biology', start_time: '10:00', end_time: '12:00', room_or_teacher: 'Genetics & DNA Workshop' },
  { id: 'tt-12', day_of_week: 5, subject: 'English', start_time: '14:00', end_time: '16:00', room_or_teacher: 'Comprehension & Essay' },
  // Friday
  { id: 'tt-13', day_of_week: 6, subject: 'Self-Study & Revision', start_time: '15:00', end_time: '18:00', room_or_teacher: 'Home Office' },
];

const today = new Date();
const formatDate = (daysOffset: number) => {
  const d = new Date();
  d.setDate(today.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const DEMO_ASSIGNMENTS: Assignment[] = [
  {
    id: 'as-1',
    title: 'Solve 60 MCQs on Electric Induction (Faraday & Lenz law)',
    subject: 'Physics',
    due_date: formatDate(0), // Today
    priority: 'high',
    is_completed: false,
  },
  {
    id: 'as-2',
    title: 'Grammar worksheet on Unit 3 (Inversion & Conditionals)',
    subject: 'English',
    due_date: formatDate(0), // Today
    priority: 'medium',
    is_completed: true,
  },
  {
    id: 'as-3',
    title: 'Memorize Al-Moallaqat poets & characteristics (Adab Unit 2)',
    subject: 'Arabic',
    due_date: formatDate(1), // Tomorrow
    priority: 'high',
    is_completed: false,
  },
  {
    id: 'as-4',
    title: 'Equilibrium Constant (Kc & Kp) problem set #4',
    subject: 'Chemistry',
    due_date: formatDate(3),
    priority: 'medium',
    is_completed: false,
  },
  {
    id: 'as-5',
    title: 'DNA Replication & Transcription diagram notes',
    subject: 'Biology',
    due_date: formatDate(5),
    priority: 'low',
    is_completed: false,
  },
  {
    id: 'as-6',
    title: 'Plate Tectonics & Continental Drift revision quiz',
    subject: 'Geology',
    due_date: formatDate(7),
    priority: 'medium',
    is_completed: false,
  },
];

export const DEMO_EXAMS: Exam[] = [
  {
    id: 'ex-1',
    subject: 'Physics (الفيزياء)',
    exam_date: formatDate(4), // In 4 days! (< 7 days urgent)
    notes: 'Comprehensive monthly exam on Modern Physics & Electromagnetic Induction (Center Hall A).',
  },
  {
    id: 'ex-2',
    subject: 'Arabic (اللغة العربية)',
    exam_date: formatDate(6), // In 6 days! (< 7 days urgent)
    notes: '80 marks trial exam covering Nahu, Balagha, Adab, and Comprehension.',
  },
  {
    id: 'ex-3',
    subject: 'Chemistry (الكيمياء)',
    exam_date: formatDate(12),
    notes: 'Chapter 3 (Chemical Equilibrium) + Chapter 4 (Electrochemistry intro).',
  },
  {
    id: 'ex-4',
    subject: 'Biology (الأحياء)',
    exam_date: formatDate(21),
    notes: 'Immunity & Molecular Biology mock exam.',
  },
  {
    id: 'ex-5',
    subject: 'English (اللغة الإنجليزية)',
    exam_date: formatDate(30),
    notes: 'Mid-term evaluation on Great Expectations story + Units 1-6.',
  },
];

export const DEMO_GRADES: GradeItem[] = [
  { id: 'gr-1', subject: 'Physics', title: 'Chapter 1 Quiz (Current & Ohm)', score: 58, max_score: 60, weight: 1, date: formatDate(-20) },
  { id: 'gr-2', subject: 'Physics', title: 'Chapter 2 Exam (Magnetic Effects)', score: 54, max_score: 60, weight: 1.5, date: formatDate(-10) },
  { id: 'gr-3', subject: 'Chemistry', title: 'Transition Elements Comprehensive', score: 48, max_score: 50, weight: 1, date: formatDate(-15) },
  { id: 'gr-4', subject: 'Chemistry', title: 'Chemical Analysis Monthly Exam', score: 56, max_score: 60, weight: 2, date: formatDate(-5) },
  { id: 'gr-5', subject: 'Arabic', title: 'Adab & Balagha Quiz', score: 38, max_score: 40, weight: 1, date: formatDate(-18) },
  { id: 'gr-6', subject: 'Arabic', title: 'Full Comprehensive Mock #1', score: 74, max_score: 80, weight: 2, date: formatDate(-8) },
  { id: 'gr-7', subject: 'Biology', title: 'Support and Movement Quiz', score: 29, max_score: 30, weight: 1, date: formatDate(-25) },
  { id: 'gr-8', subject: 'Biology', title: 'Hormonal Coordination Exam', score: 55, max_score: 60, weight: 1.5, date: formatDate(-12) },
  { id: 'gr-9', subject: 'English', title: 'Units 1-3 Cumulative Test', score: 47, max_score: 50, weight: 1, date: formatDate(-14) },
];

export const DEMO_HABITS: Habit[] = [
  { id: 'hb-1', name: 'Sleep Target (7+ hrs)', type: 'sleep', target_value: 7.5, unit: 'hours' },
  { id: 'hb-2', name: 'Daily Focused Revision', type: 'revision', target_value: 6.0, unit: 'hours' },
  { id: 'hb-3', name: 'Solved 50+ MCQs', type: 'custom', target_value: 1, unit: 'done' },
  { id: 'hb-4', name: 'Fajr & Morning Mindset', type: 'custom', target_value: 1, unit: 'done' },
];

export const DEMO_HABIT_LOGS: HabitLog[] = [
  // Past 7 days
  { id: 'hl-1', habit_id: 'hb-1', date: formatDate(-6), value: 7.5, completed: true },
  { id: 'hl-2', habit_id: 'hb-1', date: formatDate(-5), value: 8.0, completed: true },
  { id: 'hl-3', habit_id: 'hb-1', date: formatDate(-4), value: 6.5, completed: false },
  { id: 'hl-4', habit_id: 'hb-1', date: formatDate(-3), value: 7.0, completed: true },
  { id: 'hl-5', habit_id: 'hb-1', date: formatDate(-2), value: 7.5, completed: true },
  { id: 'hl-6', habit_id: 'hb-1', date: formatDate(-1), value: 8.0, completed: true },
  { id: 'hl-7', habit_id: 'hb-1', date: formatDate(0), value: 7.5, completed: true },

  { id: 'hl-8', habit_id: 'hb-2', date: formatDate(-6), value: 6.0, completed: true },
  { id: 'hl-9', habit_id: 'hb-2', date: formatDate(-5), value: 7.0, completed: true },
  { id: 'hl-10', habit_id: 'hb-2', date: formatDate(-4), value: 5.5, completed: false },
  { id: 'hl-11', habit_id: 'hb-2', date: formatDate(-3), value: 6.5, completed: true },
  { id: 'hl-12', habit_id: 'hb-2', date: formatDate(-2), value: 6.0, completed: true },
  { id: 'hl-13', habit_id: 'hb-2', date: formatDate(-1), value: 8.0, completed: true },
  { id: 'hl-14', habit_id: 'hb-2', date: formatDate(0), value: 4.5, completed: false },

  { id: 'hl-15', habit_id: 'hb-3', date: formatDate(-4), value: 1, completed: true },
  { id: 'hl-16', habit_id: 'hb-3', date: formatDate(-3), value: 1, completed: true },
  { id: 'hl-17', habit_id: 'hb-3', date: formatDate(-2), value: 1, completed: true },
  { id: 'hl-18', habit_id: 'hb-3', date: formatDate(-1), value: 1, completed: true },
  { id: 'hl-19', habit_id: 'hb-3', date: formatDate(0), value: 1, completed: true },

  { id: 'hl-20', habit_id: 'hb-4', date: formatDate(-3), value: 1, completed: true },
  { id: 'hl-21', habit_id: 'hb-4', date: formatDate(-2), value: 1, completed: true },
  { id: 'hl-22', habit_id: 'hb-4', date: formatDate(-1), value: 1, completed: true },
  { id: 'hl-23', habit_id: 'hb-4', date: formatDate(0), value: 1, completed: true },
];

export const DEMO_NOTES: Note[] = [
  {
    id: 'nt-1',
    content: '💡 Physics Trick: In Faraday law, the negative sign indicates Lenz law (opposes change in flux). When magnetic flux increases, induced field opposes it!',
    tags: ['Physics', 'Tip'],
    is_pinned: true,
    created_at: formatDate(-2),
  },
  {
    id: 'nt-2',
    content: '🔑 Chemistry: Iron (II) oxalate heated in absence of air produces FeO + CO + CO2. In presence of air it oxidizes to Fe2O3!',
    tags: ['Chemistry', 'Equations'],
    is_pinned: true,
    created_at: formatDate(-4),
  },
  {
    id: 'nt-3',
    content: '📌 Arabic Nahu: الجمل بعد النكرات صفات وبعد المعارف أحوال بشرط اكتمال أركان الجملة الأساسية أولاً.',
    tags: ['Arabic', 'Nahu'],
    is_pinned: false,
    created_at: formatDate(-6),
  },
  {
    id: 'nt-4',
    content: 'Biology: The number of amino acids in a polypeptide chain = (Number of nucleotides in mRNA coding region / 3) - 1 (stop codon does not code for amino acid).',
    tags: ['Biology', 'Rules'],
    is_pinned: false,
    created_at: formatDate(-1),
  },
];

export const DEMO_FLASHCARD_DECKS: FlashcardDeck[] = [
  { id: 'dk-1', subject: 'Physics', title: 'Electromagnetic Induction Formulas', description: 'Faraday, Self & Mutual Induction, Dynamo, Transformer', card_count: 5 },
  { id: 'dk-2', subject: 'Chemistry', title: 'Oxidation States & Colors', description: 'Transition elements color of aqueous solutions and test reagents', card_count: 4 },
  { id: 'dk-3', subject: 'Arabic', title: 'ثوابت إعرابية ونحو', description: 'قواعد الإعراب الأكثر تكراراً في امتحانات الثانوية العامة', card_count: 4 },
];

export const DEMO_FLASHCARDS: Flashcard[] = [
  { id: 'fc-1', deck_id: 'dk-1', question: 'What is the formula for EMF induced in a straight moving wire?', answer: 'EMF = - B * v * L * sin(θ), where θ is angle between wire velocity and magnetic flux lines.', times_reviewed: 12, times_correct: 10 },
  { id: 'fc-2', deck_id: 'dk-1', question: 'State Lenz Law and the physical law it represents.', answer: 'The induced electric current produces a magnetic field that opposes the change causing it. It represents Conservation of Energy.', times_reviewed: 15, times_correct: 14 },
  { id: 'fc-3', deck_id: 'dk-1', question: 'How is eddy currents minimized in transformer iron cores?', answer: 'By dividing the soft iron core into thin sheets or laminations insulated from each other with high electrical resistance silicone.', times_reviewed: 8, times_correct: 5 }, // Frequently missed!
  { id: 'fc-4', deck_id: 'dk-2', question: 'What color is hydrated Fe3+ solution versus Fe2+ solution?', answer: 'Fe3+ (d5) is yellow, while Fe2+ (d6) is pale green.', times_reviewed: 9, times_correct: 6 },
  { id: 'fc-5', deck_id: 'dk-2', question: 'Which catalyst is used in Haber-Bosch process for ammonia synthesis?', answer: 'Finely divided Iron (Fe) as catalyst at 500°C and 200 atm pressure.', times_reviewed: 10, times_correct: 9 },
  { id: 'fc-6', deck_id: 'dk-3', question: 'ما هو إعراب الاسم الواقع بعد (بخاصة) وبعد (خصوصاً)؟', answer: 'بعد (بخاصة) يُعرب مبتدأ مؤخر. بعد (خصوصاً) يُعرب مفعولاً به، وخصوصاً نفسها مفعول مطلق.', times_reviewed: 11, times_correct: 7 },
];

export const DEMO_STUDY_SESSIONS: { subject: string; duration_minutes: number; completed_at: string }[] = [
  { subject: 'Physics', duration_minutes: 50, completed_at: formatDate(0) },
  { subject: 'Chemistry', duration_minutes: 75, completed_at: formatDate(-1) },
  { subject: 'Arabic', duration_minutes: 50, completed_at: formatDate(-1) },
  { subject: 'Biology', duration_minutes: 100, completed_at: formatDate(-2) },
  { subject: 'English', duration_minutes: 25, completed_at: formatDate(-3) },
  { subject: 'Physics', duration_minutes: 120, completed_at: formatDate(-4) },
];
