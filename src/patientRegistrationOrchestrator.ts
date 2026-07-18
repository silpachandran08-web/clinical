import { prisma } from "@/src/db/client";
import type { Clinic, Locale } from "@prisma/client";
import { createWhatsAppProvider } from "@/src/whatsapp";

export interface RegistrationState {
  phone: string;
  clinicId: string;
  step: "name" | "age" | "gender" | "medicalHistory" | "consent" | "complete";
  data: {
    name?: string;
    birthYear?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
    medicalNotes?: string;
  };
}

const registrationStates = new Map<string, RegistrationState>();

const messages = {
  AR: {
    greeting: "مرحباً! 👋 سنساعدك في تسجيل حسابك الطبي.\n\nما اسمك؟",
    askAge: "شكراً! كم سنة عمرك؟",
    askGender: "اختر جنسك:",
    askMedicalHistory: "هل لديك أي حالات طبية أو حساسيات من أدوية معينة? (يمكنك تخطيها)",
    askConsent: "هل توافق على حفظ بيانات صحتك لدينا؟",
    maleBtn: "ذكر",
    femaleBtn: "أنثى",
    otherBtn: "آخر",
    yesBtn: "موافق",
    noBtn: "لا",
    skipBtn: "تخطي",
    confirmationMsg: (name: string, clinic: string) =>
      `✅ تم تسجيلك بنجاح!\n\nأهلاً وسهلاً ${name} في ${clinic}\n\nيمكنك الآن حجز موعد طبي.`,
  },
  EN: {
    greeting: "Hello! 👋 Let's register your medical account.\n\nWhat's your name?",
    askAge: "Great! How old are you?",
    askGender: "Select your gender:",
    askMedicalHistory: "Any medical conditions or allergies? (You can skip)",
    askConsent: "Do you consent to store your health data with us?",
    maleBtn: "Male",
    femaleBtn: "Female",
    otherBtn: "Other",
    yesBtn: "Yes",
    noBtn: "No",
    skipBtn: "Skip",
    confirmationMsg: (name: string, clinic: string) =>
      `✅ Registration Complete!\n\nWelcome ${name} to ${clinic}\n\nYou can now book appointments.`,
  },
};

export async function initializeRegistration(
  phone: string,
  clinic: Clinic
): Promise<RegistrationState> {
  const key = `${clinic.id}_${phone}`;
  const state: RegistrationState = {
    phone,
    clinicId: clinic.id,
    step: "name",
    data: {},
  };
  registrationStates.set(key, state);

  const provider = createWhatsAppProvider(clinic);
  const msg = messages[clinic.defaultLocale];
  await provider.sendMessage(phone, msg.greeting);

  return state;
}

export async function handleRegistrationResponse(
  phone: string,
  clinic: Clinic,
  userMessage: string
): Promise<{ done: boolean; state: RegistrationState }> {
  const key = `${clinic.id}_${phone}`;
  let state = registrationStates.get(key);

  if (!state) {
    state = await initializeRegistration(phone, clinic);
    return { done: false, state };
  }

  const provider = createWhatsAppProvider(clinic);
  const msg = messages[clinic.defaultLocale];

  switch (state.step) {
    case "name":
      state.data.name = userMessage.trim();
      state.step = "age";
      await provider.sendMessage(phone, msg.askAge);
      break;

    case "age": {
      const age = parseInt(userMessage.trim(), 10);
      if (isNaN(age) || age < 1 || age > 120) {
        await provider.sendMessage(phone, "Please enter a valid age");
        break;
      }
      const currentYear = new Date().getFullYear();
      state.data.birthYear = currentYear - age;
      state.step = "gender";

      await provider.sendButtonMessage(phone, msg.askGender, [
        { id: "GENDER_MALE", title: msg.maleBtn },
        { id: "GENDER_FEMALE", title: msg.femaleBtn },
        { id: "GENDER_OTHER", title: msg.otherBtn },
      ]);
      break;
    }

    case "gender":
      if (userMessage.includes("GENDER_")) {
        const genderMap: Record<string, "MALE" | "FEMALE" | "OTHER"> = {
          GENDER_MALE: "MALE",
          GENDER_FEMALE: "FEMALE",
          GENDER_OTHER: "OTHER",
        };
        state.data.gender = genderMap[userMessage] || "OTHER";
      }
      state.step = "medicalHistory";
      await provider.sendMessage(phone, msg.askMedicalHistory);
      break;

    case "medicalHistory":
      if (!userMessage.toLowerCase().includes("skip") && userMessage.trim().length > 0) {
        state.data.medicalNotes = userMessage.trim();
      }
      state.step = "consent";
      await provider.sendButtonMessage(phone, msg.askConsent, [
        { id: "CONSENT_YES", title: msg.yesBtn },
        { id: "CONSENT_NO", title: msg.noBtn },
      ]);
      break;

    case "consent":
      if (!userMessage.includes("CONSENT_YES")) {
        await provider.sendMessage(
          phone,
          clinic.defaultLocale === "AR"
            ? "يجب أن توافق للمتابعة. جاري إعادة المحاولة..."
            : "You must consent to register. Restarting registration..."
        );
        registrationStates.delete(key);
        await initializeRegistration(phone, clinic);
        return { done: false, state: registrationStates.get(key)! };
      }

      // Create patient in database
      const patient = await prisma.patient.create({
        data: {
          clinicId: clinic.id,
          phone,
          name: state.data.name || "Unknown",
          birthYear: state.data.birthYear,
          gender: state.data.gender,
          medicalNotes: state.data.medicalNotes,
          locale: clinic.defaultLocale,
        },
      });

      // Send confirmation
      const confirmMsg = msg.confirmationMsg(state.data.name || "Friend", clinic.name);
      await provider.sendMessage(phone, confirmMsg);

      // Clean up
      registrationStates.delete(key);
      state.step = "complete";
      return { done: true, state };

    default:
      break;
  }

  registrationStates.set(key, state);
  return { done: false, state };
}

export function getRegistrationState(
  phone: string,
  clinicId: string
): RegistrationState | undefined {
  return registrationStates.get(`${clinicId}_${phone}`);
}

export function clearRegistrationState(phone: string, clinicId: string): void {
  registrationStates.delete(`${clinicId}_${phone}`);
}
