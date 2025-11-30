
export interface Transaction {
  id: string;
  note: string;
  date: string; // ISO string
  isDebt: boolean; // true: Lesson (Debt added), false: Payment
  amount: number;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'VIDEO' | 'PDF' | 'LINK' | 'IMAGE';
  date: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  fee: number;
  registrationDate: string;
  debtLessonCount: number;
  makeupCredit: number; // Telafi hakkı bakiyesi
  history: Transaction[];
  resources: Resource[]; // Ödevler ve Materyaller
}

export interface LessonSlot {
  id: string;
  start: string; // HH:mm
  end: string; // HH:mm
  studentId: string | null; // null if empty
  label?: 'REGULAR' | 'MAKEUP' | 'TRIAL'; // Type of the lesson
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export type WeekDay = "Pazartesi" | "Salı" | "Çarşamba" | "Perşembe" | "Cuma" | "Cmt" | "Pazar";

export const DAYS: WeekDay[] = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt", "Pazar"];

export interface AppState {
  schoolName: string;
  schoolIcon: string; // 'sparkles' | 'palette' | 'music' | 'book' | 'trophy'
  themeColor: string; // 'indigo' | 'blue' | 'emerald' | 'rose' | 'violet' | 'amber'
  currentTeacher: string;
  teachers: string[];
  students: Record<string, Student>; // Keyed by ID
  schedule: Record<string, LessonSlot[]>; // Key format: "TeacherName|DayName"
  updatedAt: string; // ISO Timestamp for Sync Logic
  autoLessonProcessing: boolean; // Otomatik ders işleme açık/kapalı
}

export interface CourseContextType {
  state: AppState;
  actions: {
    updateSchoolName: (name: string) => void;
    updateSchoolIcon: (icon: string) => void;
    updateThemeColor: (color: string) => void;
    addTeacher: (name: string) => void;
    switchTeacher: (name: string) => void;
    addStudent: (name: string, phone: string, fee: number, registrationDate?: string) => string;
    updateStudent: (id: string, name: string, phone: string, fee: number) => void;
    deleteStudent: (id: string) => void;
    getStudent: (id: string) => Student | undefined;
    addSlot: (day: WeekDay, start: string, end: string) => void;
    deleteSlot: (day: WeekDay, slotId: string) => void;
    bookSlot: (day: WeekDay, slotId: string, studentId: string, label?: 'REGULAR' | 'MAKEUP' | 'TRIAL') => void;
    cancelSlot: (day: WeekDay, slotId: string) => void;
    addTransaction: (studentId: string, type: 'LESSON' | 'PAYMENT', customDate?: string, amount?: number) => void;
    updateTransaction: (studentId: string, transactionId: string, note: string) => void;
    deleteTransaction: (studentId: string, transactionId: string) => void;
    toggleAutoProcessing: () => void;
    moveSlot: (fromDay: WeekDay, fromSlotId: string, toDay: WeekDay, toSlotId: string) => void;
    swapSlots: (dayA: WeekDay, slotIdA: string, dayB: WeekDay, slotIdB: string) => void;
    addResource: (studentId: string, title: string, url: string, type: 'VIDEO' | 'PDF' | 'LINK' | 'IMAGE') => void;
    deleteResource: (studentId: string, resourceId: string) => void;
    clearDay: (day: WeekDay) => void;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
}
