"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./landing-bento.css";
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
    <div ref={ref} className={`bt-reveal ${visible ? "in" : ""} ${className}`}>
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

function Navbar() {
  return (
    <nav className="bt-nav">
      <div className="bt-nav-inner">
        <Link href="/" className="bt-brand">
          <span className="bt-brand-mark">
            <StethoscopeIcon />
          </span>
          <span className="bt-brand-text">ClinicBook Assistant</span>
        </Link>
        <div className="bt-nav-links">
          <a href="#features">Features</a>
          <a href="#why-us">Why us</a>
          <a href="#demo">Book a demo</a>
        </div>
        <div className="bt-nav-actions">
          <Link href="/login" className="bt-btn bt-btn-ghost">
            Login
          </Link>
          <Link href="/register" className="bt-btn bt-btn-solid">
            Register Clinic
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="bt-hero">
      <div className="bt-hero-inner">
        <Reveal className="bt-hero-copy">
          <span className="bt-eyebrow">Built for clinics in Saudi Arabia</span>
          <h1>
            Let WhatsApp book your appointments — so your staff doesn&apos;t have to.
          </h1>
          <p className="bt-hero-sub">
            An AI receptionist that chats with patients on WhatsApp, checks real-time doctor
            availability, and books the visit — while your front desk and doctors stay perfectly
            in sync, all day, every day.
          </p>
          <div className="bt-hero-ctas">
            <Link href="/register" className="bt-btn bt-btn-solid bt-btn-lg">
              Start free 7-day trial
            </Link>
            <a href="#demo" className="bt-btn bt-btn-outline bt-btn-lg">
              Book a live demo
            </a>
          </div>
          <ul className="bt-trust-list">
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

        <Reveal className="bt-bento">
          <div className="bt-tile bt-tile-chat">
            <div className="bt-chat-head">
              <span className="bt-chat-avatar">AN</span>
              <div>
                <div className="bt-chat-name">Al Noor Clinic</div>
                <div className="bt-chat-status">online</div>
              </div>
            </div>
            <div className="bt-chat-bubble in">Hi, I need a dermatologist this week</div>
            <div className="bt-chat-bubble out">Dr. Fatima has Thu 4 PM or Fri 10:30 AM — which works?</div>
            <div className="bt-chat-bubble in">Thursday 4pm please</div>
          </div>

          <div className="bt-tile bt-tile-stat">
            <div className="bt-tile-big">73%</div>
            <div className="bt-tile-label">fewer no-shows</div>
          </div>

          <div className="bt-tile bt-tile-cal">
            <CalendarGridIcon />
            <div className="bt-tile-label">Live doctor availability, every week</div>
          </div>

          <div className="bt-tile bt-tile-lang">
            <div className="bt-tile-label">Arabic &amp; English</div>
            <div className="bt-tile-sub">out of the box</div>
          </div>

          <div className="bt-tile bt-tile-sync">
            <BoltIcon size={20} />
            <span>Synced across every dashboard in seconds</span>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function Stats() {
  return (
    <section className="bt-stats">
      <div className="bt-stats-inner">
        {STATS.map((s) => (
          <Reveal key={s.label} className="bt-stat">
            <div className="bt-stat-value">
              <CountUp value={s.value} suffix={s.suffix} />
            </div>
            <div className="bt-stat-label">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bt-section" id="features">
      <div className="bt-section-inner">
        <Reveal>
          <h2 className="bt-section-title">
            One clinic OS. <span className="accent">Every workflow.</span>
          </h2>
          <p className="bt-section-sub">
            One product, three dashboards — admin, front desk, and doctor — each built for how
            that person actually works.
          </p>
        </Reveal>

        <div className="bt-feature-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} className={`bt-feature-card ${i < 2 ? "big" : ""}`}>
                <div className="bt-feature-icon">
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
    <section className="bt-section" id="why-us">
      <div className="bt-section-inner bt-why-grid">
        <Reveal>
          <h2 className="bt-section-title left">
            The financial case for <span className="accent">automation</span>
          </h2>
          <p className="bt-section-sub left">
            This isn&apos;t just a nicer front desk — it&apos;s fewer missed appointments and
            fewer staff hours spent on the phone.
          </p>
          <ul className="bt-why-list">
            {WHY_US.map((w) => (
              <li key={w}>
                <CheckIcon /> <span>{w}</span>
              </li>
            ))}
          </ul>
          <Link href="/register" className="bt-btn bt-btn-solid" style={{ marginTop: 28 }}>
            Register your clinic
          </Link>
        </Reveal>

        <Reveal>
          <div className="bt-finance-card">
            <div className="bt-finance-head">
              <ChartIcon />
              <span>This month</span>
            </div>
            <div className="bt-finance-row">
              <span>Income</span>
              <strong className="up">+ SAR 42,300</strong>
            </div>
            <div className="bt-finance-row">
              <span>Expenses</span>
              <strong>SAR 11,150</strong>
            </div>
            <div className="bt-finance-divider" />
            <div className="bt-finance-row">
              <span>Net</span>
              <strong className="up">SAR 31,150</strong>
            </div>
            <p className="bt-finance-caption">One dashboard. No spreadsheets.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Trial() {
  return (
    <section className="bt-section bt-trial">
      <div className="bt-section-inner">
        <Reveal>
          <h2 className="bt-section-title">
            Simple, honest <span className="accent">pricing</span>
          </h2>
          <p className="bt-section-sub">
            Every clinic starts with a free 7-day trial. After that, one simple monthly
            subscription — no setup fees, no long-term contracts.
          </p>
          <Link href="/register" className="bt-btn bt-btn-solid bt-btn-lg">
            Start your free trial
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section className="bt-section" id="demo">
      <div className="bt-section-inner">
        <Reveal>
          <h2 className="bt-section-title">
            Want to see it <span className="accent">live</span>?
          </h2>
          <p className="bt-section-sub">
            Book a personal walkthrough with our team before you sign up — no pressure, just a
            demo.
          </p>
        </Reveal>

        <div className="bt-contact-grid">
          {DEMO_CONTACTS.map((c) => (
            <Reveal key={c.name} className="bt-contact-card">
              <div className="bt-contact-avatar">
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div className="bt-contact-name">{c.name}</div>
                <div className="bt-contact-phone">{c.intl}</div>
              </div>
              <div className="bt-contact-actions">
                <a href={`tel:${c.tel}`} className="bt-btn bt-btn-outline bt-btn-sm">
                  <PhoneIcon /> Call
                </a>
                <a
                  href={`https://wa.me/${c.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bt-btn bt-btn-solid bt-btn-sm"
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
    <footer className="bt-footer">
      <div className="bt-section-inner bt-footer-inner">
        <span className="bt-brand">
          <span className="bt-brand-mark">
            <StethoscopeIcon />
          </span>
          ClinicBook Assistant
        </span>
        <div className="bt-footer-links">
          <a href="#features">Features</a>
          <a href="#why-us">Why us</a>
          <a href="#demo">Book a demo</a>
          <Link href="/login">Login</Link>
          <Link href="/register">Register Clinic</Link>
        </div>
        <span className="bt-copy">© {new Date().getFullYear()} ClinicBook Assistant</span>
      </div>
    </footer>
  );
}

export default function LandingBento() {
  return (
    <div className="bt-landing">
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
