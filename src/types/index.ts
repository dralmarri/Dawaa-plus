export interface Medication {
  id: string;
  name: string;
  form: 'Pills' | 'Capsules' | 'Liquid' | 'Injection' | 'Drops' | 'Cream' | 'Inhaler' | 'Patches';
  dosage: number;
  concentration?: string;
  frequency: string;
  times: string[];
  startDate?: string;
  isChronic: boolean;
  durationDays?: number;
  mealRelation: 'No preference' | 'Before meal' | 'After meal' | 'With meal';
  notes: string;
  stock: number;
  initialStock?: number;
  imageUrl?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface BloodPressureReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  period: 'Morning' | 'Evening';
  date: string;
  time: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  doctorName?: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  reminderBefore: string;
  notes: string;
  completed: boolean;
}

export interface LabTest {
  id: string;
  name: string;
  notes: string;
  fileUrl?: string;
  date: string;
}

export interface DoseRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'taken' | 'missed' | 'pending';
  date: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  method: 'whatsapp' | 'sms';
}

export interface BloodSugarReading {
  id: string;
  value: number; // mg/dL
  period: 'Fasting' | 'Before meal' | 'After meal' | 'Bedtime' | 'Random';
  date: string;
  time: string;
  notes?: string;
}

export interface AppSettings {
  language: 'en' | 'ar';
  userName: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string[];
  customDiseases?: string;
  notifications: boolean;
  voiceNotifications: boolean;
  reminderBefore: string;
  escalationOnMissed: boolean;
  emergencyContact?: EmergencyContact;
  dailySummary?: boolean;
  dailySummaryTime?: string;
  bpReminders: boolean;
  bpCustomTimes?: string[];
  bloodSugarReminders: boolean;
  bloodSugarCustomTimes?: string[];
  bloodSugarTracking?: boolean; // legacy field, replaced by bloodSugarReminders
}
