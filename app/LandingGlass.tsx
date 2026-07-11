"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./landing-glass.css";
import {
  BellRepeatIcon,
  BoltIcon,
  CalendarGridIcon,
  ChartIcon,
  ChatIcon,
  CheckIcon,
  DesktopIcon,
  PhoneIcon,
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

const WHY_US = [
  "Fewer no-shows, more recovered revenue — automatic reminders keep patients showing up.",
  "Hours saved every week — no more manual phone scheduling for routine bookings.",
  "One flat monthly subscription — no per-booking fees, no hidden costs.",
  "Start free for 7 days — no credit card required, cancel anytime.",
];

const DEMO_CONTACTS = [
  { name: "Afaq Musa", intl: "+966 50 321 3457", tel: "+966503213457", wa: "966503213457" },
  { name: "Razin Hani", intl: "+966 53 735 8510", tel: "+966537358510", wa: "966537358510" },
];

const STATS = [
  { value: 24, suffix: "/7", label: "AI availability" },
  { value: 2, suffix: " min", label: "Average booking" },
  { value: 73, suffix: "%", label: "Fewer no-shows" },
  { value: 31, suffix: "%", label: "More revenue" },
];

/** Fade-up-on-scroll, no animation library — just IntersectionObserver + a CSS class toggle. */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`gl-reveal ${visible ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        const duration = 1400;
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          setDisplay(Math.round(value * (1 - Math.pow(2, -10 * progress))));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function GlowOrbs() {
  return (
    <div className="gl-orbs" aria-hidden="true">
      <div className="gl-orb a" />
      <div className="gl-orb b" />
      <div className="gl-orb c" />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="gl-nav">
      <div className="gl-nav-inner">
        <div className="gl-nav-glass">
          <Link href="/" className="gl-brand">
            <span className="gl-brand-mark">
              <StethoscopeIcon />
            </span>
            <span className="gl-brand-text">ClinicBook Assistant</span>
          </Link>
          <div className="gl-nav-links">
            <a href="#features">Features</a>
            <a href="#why-us">Why us</a>
            <a href="#demo">Book a demo</a>
          </div>
          <div className="gl-nav-actions">
            <Link href="/login" className="gl-btn gl-btn-ghost">
              Login
            </Link>
            <Link href="/register" className="gl-btn gl-btn-solid">
              Register Clinic
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="gl-hero">
      <div className="gl-hero-inner">
        <Reveal className="gl-hero-copy">
          <span className="gl-eyebrow">
            <span className="gl-pulse-dot" />
            Medical AI for Saudi Clinics
          </span>
          <h1>
            Let WhatsApp book your appointments —{" "}
            <span className="gl-gradient-text">so your staff doesn&apos;t have to.</span>
          </h1>
          <p className="gl-hero-sub">
            An AI receptionist that chats with patients on WhatsApp, checks real-time doctor
            availability, and books the visit — while your front desk and doctors stay perfectly
            in sync, all day, every day.
          </p>
          <div className="gl-hero-ctas">
            <Link href="/register" className="gl-btn gl-btn-solid gl-btn-lg">
              Start free 7-day trial
            </Link>
            <a href="#demo" className="gl-btn gl-btn-glass gl-btn-lg">
              Book a live demo
            </a>
          </div>
          <ul className="gl-trust-list">
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
        </Reveal>

        <Reveal className="gl-hero-visual">
          <div className="gl-panel gl-chat-panel">
            <div className="gl-chat-head">
              <span className="gl-chat-avatar">AN</span>
              <div>
                <div className="gl-chat-name">Al Noor Clinic</div>
                <div className="gl-chat-status">
                  <span className="gl-status-dot" /> online
                </div>
              </div>
            </div>
            <div className="gl-chat-bubble in">Hi, I need a dermatologist this week</div>
            <div className="gl-chat-bubble out">Dr. Fatima has Thu 4 PM or Fri 10:30 AM — which works?</div>
            <div className="gl-chat-bubble in">Thursday 4pm please</div>
            <div className="gl-chat-bubble out">Booked ✓ See you Thursday at 4 PM.</div>
          </div>

          <div className="gl-panel gl-float gl-float-a">
            <BoltIcon size={16} />
            <div>
              Booked in seconds
              <span className="gl-float-sub">AI confirms instantly</span>
            </div>
          </div>
          <div className="gl-panel gl-float gl-float-b">
            <CalendarGridIcon />
            <div>
              Live availability
              <span className="gl-float-sub">Every doctor, every week</span>
            </div>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function Stats() {
  return (
    <section className="gl-stats">
      <div className="gl-stats-inner">
        {STATS.map((s) => (
          <Reveal key={s.label} className="gl-panel gl-stat">
            <div className="gl-stat-value">
              <CountUp value={s.value} suffix={s.suffix} />
            </div>
            <div className="gl-stat-label">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="gl-section" id="features">
      <div className="gl-section-inner">
        <Reveal>
          <h2 className="gl-section-title">
            One clinic OS. <span className="gl-gradient-text">Every workflow.</span>
          </h2>
          <p className="gl-section-sub">
            One product, three dashboards — admin, front desk, and doctor — each built for how
            that person actually works.
          </p>
        </Reveal>

        <div className="gl-feature-grid">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} className="gl-panel gl-feature-card">
                <div className="gl-feature-icon">
                  <Icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  return (
    <section className="gl-section" id="why-us">
      <div className="gl-section-inner gl-why-grid">
        <Reveal>
          <h2 className="gl-section-title left">
            The financial case for <span className="gl-gradient-text">automation</span>
          </h2>
          <p className="gl-section-sub left">
            This isn&apos;t just a nicer front desk — it&apos;s fewer missed appointments and
            fewer staff hours spent on the phone.
          </p>
          <ul className="gl-why-list">
            {WHY_US.map((w) => (
              <li key={w}>
                <CheckIcon /> <span>{w}</span>
              </li>
            ))}
          </ul>
          <Link href="/register" className="gl-btn gl-btn-solid" style={{ marginTop: 28 }}>
            Register your clinic
          </Link>
        </Reveal>

        <Reveal>
          <div className="gl-panel gl-finance-card">
            <div className="gl-finance-head">
              <ChartIcon />
              <span>This month</span>
            </div>
            <div className="gl-finance-row">
              <span>Income</span>
              <strong className="up">+ SAR 42,300</strong>
            </div>
            <div className="gl-finance-row">
              <span>Expenses</span>
              <strong>SAR 11,150</strong>
            </div>
            <div className="gl-finance-divider" />
            <div className="gl-finance-row">
              <span>Net</span>
              <strong className="up">SAR 31,150</strong>
            </div>
            <p className="gl-finance-caption">One dashboard. No spreadsheets.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Trial() {
  return (
    <section className="gl-section gl-trial">
      <div className="gl-section-inner">
        <Reveal>
          <div className="gl-panel gl-trial-panel">
            <h2 className="gl-section-title">
              Simple, honest <span className="gl-gradient-text">pricing</span>
            </h2>
            <p className="gl-section-sub">
              Every clinic starts with a free 7-day trial. After that, one simple monthly
              subscription — no setup fees, no long-term contracts.
            </p>
            <Link href="/register" className="gl-btn gl-btn-solid gl-btn-lg">
              Start your free trial
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section className="gl-section" id="demo">
      <div className="gl-section-inner">
        <Reveal>
          <h2 className="gl-section-title">
            Want to see it <span className="gl-gradient-text">live</span>?
          </h2>
          <p className="gl-section-sub">
            Book a personal walkthrough with our team before you sign up — no pressure, just a
            demo.
          </p>
        </Reveal>

        <div className="gl-contact-grid">
          {DEMO_CONTACTS.map((c) => (
            <Reveal key={c.name} className="gl-panel gl-contact-card">
              <div className="gl-contact-avatar">
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div className="gl-contact-name">{c.name}</div>
                <div className="gl-contact-phone">{c.intl}</div>
              </div>
              <div className="gl-contact-actions">
                <a href={`tel:${c.tel}`} className="gl-btn gl-btn-glass gl-btn-sm">
                  <PhoneIcon /> Call
                </a>
                <a
                  href={`https://wa.me/${c.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gl-btn gl-btn-solid gl-btn-sm"
                >
                  <ChatIcon /> WhatsApp
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="gl-footer">
      <div className="gl-section-inner gl-footer-inner">
        <span className="gl-brand">
          <span className="gl-brand-mark">
            <StethoscopeIcon />
          </span>
          ClinicBook Assistant
        </span>
        <div className="gl-footer-links">
          <a href="#features">Features</a>
          <a href="#why-us">Why us</a>
          <a href="#demo">Book a demo</a>
          <Link href="/login">Login</Link>
          <Link href="/register">Register Clinic</Link>
        </div>
        <span className="gl-copy">© {new Date().getFullYear()} ClinicBook Assistant</span>
      </div>
    </footer>
  );
}

export default function LandingGlass() {
  return (
    <div className="gl-landing">
      <div className="gl-bg" />
      <GlowOrbs />
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <WhyUs />
      <Trial />
      <Demo />
      <Footer />
    </div>
  );
}
