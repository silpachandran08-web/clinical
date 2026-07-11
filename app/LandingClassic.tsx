import Link from "next/link";
import {
  BellRepeatIcon,
  BoltIcon,
  CalendarGridIcon,
  ChartIcon,
  ChatIcon,
  CheckIcon,
  DesktopIcon,
  PhoneIcon,
  PulseIcon,
  StethoscopeIcon,
} from "./LandingIcons";

const FEATURES = [
  {
    icon: ChatIcon,
    title: "WhatsApp AI Booking",
    body: "Patients book, reschedule, and get confirmations right inside a WhatsApp chat that feels human — in Arabic or English, any hour of the day.",
  },
  {
    icon: CalendarGridIcon,
    title: "Flight-Booking-Style Scheduling",
    body: "Front desk sees a full week of slots per doctor, colour-coded open or taken, so assigning a walk-in takes seconds instead of phone calls.",
  },
  {
    icon: DesktopIcon,
    title: "Front Desk & Doctor, Always In Sync",
    body: "A check-in at reception shows up on the doctor's queue within seconds. No one shouts down the hallway, no one refreshes a page.",
  },
  {
    icon: StethoscopeIcon,
    title: "A Doctor Workspace Built For Speed",
    body: "Call the next patient in one click, write structured notes and prescriptions, and see full visit history — age, gender, allergies, everything.",
  },
  {
    icon: BellRepeatIcon,
    title: "Automatic Follow-Up Recall",
    body: "When a doctor says \"come back in two weeks,\" that's captured automatically — so the clinic can remind patients to return instead of hoping they remember.",
  },
  {
    icon: ChartIcon,
    title: "Clinic Finance At A Glance",
    body: "Track income and expenses in one simple dashboard, so the clinic owner always knows where they stand — no spreadsheets required.",
  },
];

const CHAT_MESSAGES = [
  { from: "patient", text: "Hi, I need an appointment with a dermatologist this week" },
  { from: "bot", text: "Of course! Dr. Fatima has openings Thursday at 4:00 PM or Friday at 10:30 AM. Which works better?" },
  { from: "patient", text: "Thursday 4pm please" },
  { from: "bot", text: "Booked ✅ Thursday, 4:00 PM with Dr. Fatima Al-Harbi. We'll send a reminder the day before." },
];

const WHY_US = [
  "Fewer no-shows, more recovered revenue — automatic reminders keep patients showing up.",
  "Hours saved every week — no more manual phone scheduling for routine bookings.",
  "One flat monthly subscription — no per-booking fees, no hidden costs.",
  "Start free for 7 days — no credit card required, cancel anytime.",
];

const DEMO_CONTACTS = [
  { name: "Afaq Musa", phone: "0503213457", intl: "+966 50 321 3457", tel: "+966503213457", wa: "966503213457" },
  { name: "Razin Hani", phone: "0537358510", intl: "+966 53 735 8510", tel: "+966537358510", wa: "966537358510" },
];

export default function LandingClassic() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-brand">ClinicBook Assistant</span>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#why-us">Why us</a>
            <a href="#demo">Book a demo</a>
          </div>
          <div className="landing-nav-actions">
            <Link href="/login" className="landing-btn landing-btn-ghost">
              Login
            </Link>
            <Link href="/register" className="landing-btn landing-btn-primary">
              Register Clinic
            </Link>
          </div>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">Built for clinics in Saudi Arabia</span>
            <h1>Let WhatsApp book your appointments — so your staff doesn&apos;t have to.</h1>
            <p className="landing-hero-sub">
              An AI receptionist that chats with patients on WhatsApp, checks real-time doctor
              availability, and books the visit — while your front desk and doctors stay perfectly
              in sync, all day, every day.
            </p>
            <div className="landing-hero-ctas">
              <Link href="/register" className="landing-btn landing-btn-primary landing-btn-lg">
                Start free 7-day trial
              </Link>
              <a href="#demo" className="landing-btn landing-btn-outline landing-btn-lg">
                Book a live demo
              </a>
            </div>
            <ul className="landing-trust-list">
              <li>
                <CheckIcon /> No credit card required
              </li>
              <li>
                <CheckIcon /> Live in a day
              </li>
              <li>
                <CheckIcon /> Arabic &amp; English, out of the box
              </li>
            </ul>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-orbit outer" aria-hidden="true" />
            <div className="landing-hero-orbit inner" aria-hidden="true" />

            <div className="phone-mock">
              <div className="phone-mock-notch" />
              <div className="phone-mock-header">
                <div className="phone-mock-avatar">AN</div>
                <div>
                  <div className="phone-mock-name">Al Noor Clinic</div>
                  <div className="phone-mock-status">online</div>
                </div>
              </div>
              <div className="phone-mock-body">
                {CHAT_MESSAGES.map((m, i) => (
                  <div
                    key={i}
                    className={`phone-bubble ${m.from === "patient" ? "phone-bubble-in" : "phone-bubble-out"}`}
                    style={{ animationDelay: `${i * 0.5 + 0.3}s` }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-float-card landing-float-card-a">
              <div className="landing-float-card-icon">
                <BoltIcon size={16} />
              </div>
              <div>
                Booked in seconds
                <span className="landing-float-card-sub">AI confirms instantly</span>
              </div>
            </div>
            <div className="landing-float-card landing-float-card-b">
              <div className="landing-float-card-icon">
                <PulseIcon size={16} />
              </div>
              <div>
                Doctor &amp; front desk in sync
                <span className="landing-float-card-sub">Live, every check-in</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section landing-how">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">How it works</h2>
          <div className="landing-how-steps">
            <div className="landing-how-step">
              <div className="landing-how-num">1</div>
              <h3>Patient messages your WhatsApp number</h3>
              <p>Any time of day, in Arabic or English — no app to download, nothing to install.</p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-num">2</div>
              <h3>The AI books the right slot instantly</h3>
              <p>It checks live doctor availability and confirms the appointment in the same chat.</p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-num">3</div>
              <h3>Your team sees it in real time</h3>
              <p>Front desk and doctor dashboards update within seconds — no phone tag, no double-booking.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-features" id="features">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Everything a clinic actually needs</h2>
          <p className="landing-section-sub">
            One product, three dashboards — admin, front desk, and doctor — each built for how that
            person actually works.
          </p>
          <div className="landing-feature-grid">
            {FEATURES.map((f) => (
              <div className="landing-feature-card" key={f.title}>
                <div className="landing-feature-icon">
                  <f.icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-why" id="why-us">
        <div className="landing-section-inner landing-why-grid">
          <div>
            <h2 className="landing-section-title" style={{ textAlign: "left" }}>
              The financial case for switching
            </h2>
            <p className="landing-section-sub" style={{ textAlign: "left", margin: "0 0 20px" }}>
              This isn&apos;t just a nicer front desk — it&apos;s fewer missed appointments and fewer
              staff hours spent on the phone.
            </p>
            <ul className="landing-why-list">
              {WHY_US.map((w) => (
                <li key={w}>
                  <CheckIcon /> <span>{w}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="landing-btn landing-btn-primary" style={{ marginTop: 22 }}>
              Register your clinic
            </Link>
          </div>
          <div className="landing-finance-card">
            <div className="landing-finance-card-header">
              <ChartIcon />
              <span>This month</span>
            </div>
            <div className="landing-finance-row">
              <span>Income</span>
              <strong className="landing-finance-up">+ SAR 42,300</strong>
            </div>
            <div className="landing-finance-row">
              <span>Expenses</span>
              <strong>SAR 11,150</strong>
            </div>
            <div className="landing-finance-divider" />
            <div className="landing-finance-row">
              <span>Net</span>
              <strong className="landing-finance-up">SAR 31,150</strong>
            </div>
            <p className="landing-finance-caption">One dashboard. No spreadsheets.</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-trial">
        <div className="landing-section-inner" style={{ textAlign: "center" }}>
          <h2 className="landing-section-title">Simple, honest pricing</h2>
          <p className="landing-section-sub">
            Every clinic starts with a free 7-day trial. After that, one simple monthly
            subscription — no setup fees, no long-term contracts.
          </p>
          <Link href="/register" className="landing-btn landing-btn-primary landing-btn-lg">
            Start your free trial
          </Link>
        </div>
      </section>

      <section className="landing-section landing-demo" id="demo">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Want to see it live first?</h2>
          <p className="landing-section-sub">
            Book a personal walkthrough with our team before you sign up — no pressure, just a demo.
          </p>
          <div className="landing-contact-grid">
            {DEMO_CONTACTS.map((c) => (
              <div className="landing-contact-card" key={c.name}>
                <div className="landing-contact-avatar">
                  {c.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="landing-contact-name">{c.name}</div>
                  <div className="landing-contact-phone">{c.intl}</div>
                </div>
                <div className="landing-contact-actions">
                  <a href={`tel:${c.tel}`} className="landing-btn landing-btn-outline landing-btn-sm">
                    <PhoneIcon /> Call
                  </a>
                  <a
                    href={`https://wa.me/${c.wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-btn landing-btn-primary landing-btn-sm"
                  >
                    <ChatIcon /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-section-inner landing-footer-inner">
          <span className="landing-brand">ClinicBook Assistant</span>
          <div className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#why-us">Why us</a>
            <a href="#demo">Book a demo</a>
            <Link href="/login">Login</Link>
            <Link href="/register">Register Clinic</Link>
          </div>
          <span className="muted">© {new Date().getFullYear()} ClinicBook Assistant</span>
        </div>
      </footer>
    </div>
  );
}
