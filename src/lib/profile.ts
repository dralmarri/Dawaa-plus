import type { AppSettings } from "@/types";

export const diseaseOptions = [
  { key: "diabetes", ar: "السكري", en: "Diabetes" },
  { key: "hypertension", ar: "ضغط الدم", en: "Hypertension" },
  { key: "cholesterol", ar: "الكوليسترول", en: "Cholesterol" },
  { key: "heart", ar: "القلب", en: "Heart Disease" },
  { key: "asthma", ar: "الربو", en: "Asthma" },
  { key: "thyroid", ar: "الغدة الدرقية", en: "Thyroid" },
  { key: "kidney", ar: "الكلى", en: "Kidney" },
  { key: "liver", ar: "الكبد", en: "Liver" },
  { key: "rheumatism", ar: "الروماتيزم", en: "Rheumatism" },
  { key: "anemia", ar: "فقر الدم", en: "Anemia" },
];
export const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Number of filled profile fields, out of PROFILE_TOTAL. */
export const PROFILE_TOTAL = 8;
export const countProfileFilled = (s: AppSettings) =>
  [
    s.userName,
    s.dateOfBirth,
    s.bloodType,
    s.allergies,
    (s.chronicDiseases || []).length > 0 ? "1" : "",
    s.customDiseases,
    s.emergencyContact?.name,
    s.emergencyContact?.phone,
  ].filter(Boolean).length;
