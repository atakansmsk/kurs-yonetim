
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
  makeupCredit: number;
  history: Transaction[];
  resources: Resource[];
  color?: string;
  nextLessonNote?: string;
  isActive?: boolean;
}

export interface LessonSlot {
  id: string;
  start: string;
  end: string;
  studentId: string | null;
  label?: 'REGULAR' | 'MAKEUP' | 'TRIAL';
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
  schoolIcon: string;
  themeColor: string;
  currentTeacher: string;
  teachers: string[];
  students: Record<string, Student>;
  schedule: Record<string, LessonSlot[]>;
  updatedAt: string;
  autoLessonProcessing: boolean;
  processedSlots?: Record<string, string[]>; 
}

export interface CourseContextType {
  state: AppState;
  isRecovered: boolean;
  actions: {
    updateSchoolName: (name: string) => void;
    updateSchoolIcon: (icon: string) => void;
    updateThemeColor: (color: string) => void;
    addTeacher: (name: string) => void;
    switchTeacher: (name: string) => void;
    addStudent: (name: string, phone: string, fee: number, registrationDate?: string, color?: string) => string;
    updateStudent: (id: string, name: string, phone: string, fee: number, color?: string, nextLessonNote?: string) => void;
    toggleStudentStatus: (id: string, isActive: boolean) => void;
    deleteStudent: (id: string) => void;
    getStudent: (id: string) => Student | undefined;
    addSlot: (day: WeekDay, start: string, end: string) => void;
    deleteSlot: (day: WeekDay, slotId: string) => void;
    bookSlot: (day: WeekDay, slotId: string, studentId: string, label?: 'REGULAR' | 'MAKEUP' | 'TRIAL') => void;
    cancelSlot: (day: WeekDay, slotId: string) => void;
    extendSlot: (day: WeekDay, slotId: string, minutes: number) => void;
    addTransaction: (studentId: string, type: 'LESSON' | 'PAYMENT', customDate?: string, amount?: number) => void;
    updateTransaction: (studentId: string, transactionId: string, note: string, customDate?: string) => void;
    deleteTransaction: (studentId: string, transactionId: string) => void;
    toggleAutoProcessing: () => void;
    moveSlot: (fromDay: WeekDay, fromSlotId: string, toDay: WeekDay, toSlotId: string) => void;
    moveStudent: (studentId: string, fromDay: WeekDay, fromSlotId: string, toDay: WeekDay, newStart: string) => void;
    swapSlots: (dayA: WeekDay, slotIdA: string, dayB: WeekDay, slotIdB: string) => void;
    addResource: (studentId: string, title: string, url: string, type: 'VIDEO' | 'PDF' | 'LINK' | 'IMAGE') => void;
    deleteResource: (studentId: string, resourceId: string) => void;
    clearDay: (day: WeekDay) => void;
    forceSync: () => Promise<void>;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
}
