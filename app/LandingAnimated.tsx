"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./landing-animated.css";
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
    title: "Front Desk \u0026 Doctor, Always In Sync",
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
  { name: "Afaq Musa", phone: "0503213457", intl: "+966 50 321 3457", tel: "+966503213457", wa: "966503213457" },
  { name: "Razin Hani", phone: "0537358510", intl: "+966 53 735 8510", tel: "+966537358510", wa: "966537358510" },
];

const STATS = [
  { value: 24, suffix: "/7", label: "AI availability" },
  { value: 2, suffix: " min", label: "Average booking" },
  { value: 73, suffix: "%", label: "Fewer no-shows" },
  { value: 31, suffix: "%", label: "More revenue" },
];

gsap.registerPlugin(ScrollTrigger);

function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const particleCount = Math.min(60, Math.floor(width / 25));
    const connectionDistance = 140;
    const mouse = { x: -1000, y: -1000 };

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
      });
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }

    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function handleMouseLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.vx += dx * 0.00005;
          p.vy += dy * 0.00005;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(8, 145, 178, 0.4)";
        ctx!.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.2;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(8, 145, 178, ${opacity})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="cb-particles" />;
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`cb-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="cb-nav-inner">
        <Link href="/" className="cb-brand">
          <span className="cb-brand-mark">
            <StethoscopeIcon />
          </span>
          ClinicBook Assistant
        </Link>
        <div className="cb-nav-links">
          <a href="#features">Features</a>
          <a href="#why-us">Why us</a>
          <a href="#demo">Book a demo</a>
        </div>
        <div className="cb-nav-actions">
          <Link href="/login" className="cb-btn cb-btn-ghost">
            Login
          </Link>
          <Link href="/register" className="cb-btn cb-btn-primary">
            Register Clinic
          </Link>
        </div>
      </div>
    </nav>
  );
}

const ORBIT_ROLES = [
  { icon: PhoneIcon, title: "Patient", subtitle: "WhatsApp chat", cls: "a" },
  { icon: ChatIcon, title: "Receptionist", subtitle: "Live scheduling", cls: "b" },
  { icon: BellRepeatIcon, title: "Nurse", subtitle: "Follow-ups", cls: "c" },
  { icon: ChartIcon, title: "Admin", subtitle: "Finance view", cls: "d" },
  { icon: StethoscopeIcon, title: "Doctor", subtitle: "Queue updates", cls: "e" },
  { icon: CalendarGridIcon, title: "Manager", subtitle: "Clinic overview", cls: "f" },
];

function OrbitalNetwork() {
  return (
    <div className="cb-orbit-scene">
      <motion.div
        className="cb-orbit-system"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <div className="cb-orbit-ring a" />
        <div className="cb-orbit-ring b" />
        <div className="cb-orbit-ring c" />

        <div className="cb-orbit-core">
          <div className="cb-core-icon">
            <ChatIcon />
          </div>
        </div>

        {ORBIT_ROLES.map((role, i) => (
          <div key={role.cls} className={`cb-data-packet ${role.cls}`} />
        ))}

        {ORBIT_ROLES.map((role, i) => {
          const Icon = role.icon;
          return (
            <motion.div
              key={role.cls}
              className={`cb-orbit-node ${role.cls}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.12, duration: 0.6, type: "spring" }}
            >
              <div className={`cb-node-card ${role.cls}`}>
                <div className="cb-node-icon">
                  <Icon />
                </div>
                <h4>{role.title}</h4>
                <p>{role.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Hero() {
  return (
    <header className="cb-hero">
      <div className="cb-hero-inner">
        <div className="cb-hero-copy">
          <motion.span
            className="cb-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="cb-pulse-dot" />
            Medical AI for Saudi Clinics
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            Connect your clinic with{" "}
            <span className="cyan">intelligent</span>{" "}
            appointment automation.
          </motion.h1>

          <motion.p
            className="cb-hero-sub"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            ClinicBook Assistant is the neural layer between your patients, front desk, and doctors
            — booking appointments on WhatsApp while keeping everyone in perfect sync.
          </motion.p>

          <motion.div
            className="cb-hero-ctas"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
          >
            <Link href="/register" className="cb-btn cb-btn-primary cb-btn-lg">
              Start free 7-day trial
            </Link>
            <a href="#demo" className="cb-btn cb-btn-outline cb-btn-lg">
              Book a live demo
            </a>
          </motion.div>

          <motion.ul
            className="cb-trust-list"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
          >
            <li>
              <CheckIcon /> No credit card required
            </li>
            <li>
              <CheckIcon /> Live in a day
            </li>
            <li>
              <CheckIcon /> Arabic \u0026 English, out of the box
            </li>
          </motion.ul>
        </div>

        <OrbitalNetwork />
      </div>
    </header>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current || !ref.current) return;
    hasAnimated.current = true;

    const el = ref.current;
    const duration = 2200;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      const current = Math.round(value * eased);
      el.textContent = current.toString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return <span ref={ref}>0</span>;
}

function StatsStrip() {
  return (
    <div className="cb-stats">
      <div className="cb-stats-inner">
        {STATS.map((stat) => (
          <div key={stat.label} className="cb-stat">
            <div className="cb-stat-value">
              <AnimatedCounter value={stat.value} />
              <span className="cb-stat-suffix">{stat.suffix}</span>
            </div>
            <span className="cb-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 70 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 80%",
            once: true,
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function AnimatedCards({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = ref.current?.querySelectorAll(":scope > *");
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: {
              trigger: ref.current,
              start: "top 80%",
              once: true,
            },
          }
        );
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Timeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(pathRef.current, {
        height: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 60%",
          end: "bottom 70%",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const steps = [
    {
      num: "01",
      title: "Patient starts a WhatsApp chat",
      body: "Any time of day, in Arabic or English — no app to download, nothing to install. The AI reads intent and responds naturally.",
      visual: "chat",
    },
    {
      num: "02",
      title: "AI checks live availability",
      body: "The assistant queries every doctor's real-time schedule and presents the best open slots inside the same conversation.",
      visual: "slots",
    },
    {
      num: "03",
      title: "Appointment syncs to every dashboard",
      body: "Front desk and doctor dashboards update instantly. Reminders, follow-ups, and recalls are scheduled automatically.",
      visual: "sync",
    },
  ];

  return (
    <section ref={sectionRef} className="cb-section cb-how" id="features">
      <div className="cb-section-inner">
        <AnimatedSection>
          <h2 className="cb-section-title">
            How the{" "}
            <span className="cyan">neural network</span>{" "}
            works
          </h2>
          <p className="cb-section-sub">
            One living system connects patient, front desk, and doctor in a single automated flow.
          </p>
        </AnimatedSection>

        <div className="cb-timeline">
          <div className="cb-timeline-path">
            <div ref={pathRef} className="cb-timeline-path-fill" />
          </div>

          {steps.map((s, i) => (
            <AnimatedSection key={s.num}>
              <div className="cb-timeline-item">
                <div className="cb-timeline-dot" />
                <div className="cb-timeline-content">
                  <div className="cb-timeline-num">Step {s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <div className="cb-timeline-visual">
                  {s.visual === "chat" && (
                    <div className="cb-chat-preview">
                      <div className="cb-chat-bubble in" style={{ animationDelay: "0.1s" }}>
                        Hi, I need a dermatologist appointment this week
                      </div>
                      <div className="cb-chat-bubble out" style={{ animationDelay: "0.6s" }}>
                        Dr. Fatima has Thursday 4 PM or Friday 10:30 AM. Which works?
                      </div>
                      <div className="cb-chat-bubble in" style={{ animationDelay: "1.1s" }}>
                        Thursday 4 PM please
                      </div>
                      <div className="cb-chat-bubble out" style={{ animationDelay: "1.6s" }}>
                        Booked ✅ See you Thursday at 4 PM.
                      </div>
                    </div>
                  )}
                  {s.visual === "slots" && (
                    <div>
                      <div style={{ fontSize: 13, color: "var(--cb-text-muted)", marginBottom: 14, fontWeight: 600 }}>
                        Dr. Fatima — available slots
                      </div>
                      <div className="cb-slot-preview">
                        <span className="cb-slot-chip open">Thu 4:00 PM</span>
                        <span className="cb-slot-chip selected">Fri 10:30 AM</span>
                        <span className="cb-slot-chip open">Fri 2:00 PM</span>
                        <span className="cb-slot-chip booked">Fri 3:30 PM</span>
                      </div>
                    </div>
                  )}
                  {s.visual === "sync" && (
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--cb-cyan), var(--cb-blue))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                          color: "#fff",
                          boxShadow: "0 0 40px -10px var(--cb-cyan-glow)",
                          animation: "corePulse 3s ease-in-out infinite",
                        }}
                      >
                        <BoltIcon size={28} />
                      </div>
                      <div style={{ fontSize: 14, color: "var(--cb-text-muted)" }}>
                        Synced across all dashboards in milliseconds
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="cb-section cb-features">
      <div className="cb-section-inner">
        <AnimatedSection>
          <h2 className="cb-section-title">
            One clinic OS.{" "}
            <span className="cyan">Every workflow.</span>
          </h2>
          <p className="cb-section-sub">
            One product, three dashboards — admin, front desk, and doctor — each built for how that
            person actually works.
          </p>
        </AnimatedSection>

        <AnimatedCards className="cb-feature-grid">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="cb-feature-card" key={f.title}>
                <div className="cb-feature-icon">
                  <Icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            );
          })}
        </AnimatedCards>
      </div>
    </section>
  );
}

function WhyUs() {
  return (
    <section className="cb-section" id="why-us">
      <div className="cb-section-inner cb-why-grid">
        <AnimatedSection>
          <h2 className="cb-section-title">
            The financial case for{" "}
            <span className="cyan">automation</span>
          </h2>
          <p className="cb-section-sub">
            This isn\u0027t just a nicer front desk — it\u0027s fewer missed appointments and fewer
            staff hours spent on the phone.
          </p>
          <ul className="cb-why-list">
            {WHY_US.map((w) => (
              <li key={w}>
                <CheckIcon /> <span>{w}</span>
              </li>
            ))}
          </ul>
          <Link href="/register" className="cb-btn cb-btn-primary" style={{ marginTop: 32 }}>
            Register your clinic
          </Link>
        </AnimatedSection>

        <AnimatedSection>
          <div className="cb-impact-card">
            <div className="cb-impact-header">
              <ChartIcon />
              <span>Live clinic dashboard</span>
            </div>

            <div className="cb-impact-stat">
              <strong>+31%</strong>
              <span>more recovered revenue</span>
            </div>
            <p className="cb-impact-caption">
              Clinics using automatic reminders and follow-ups see fewer no-shows and more returning
              patients.
            </p>
            <div className="cb-impact-bar">
              <div className="cb-impact-bar-fill" />
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function Trial() {
  return (
    <section className="cb-section cb-trial">
      <div className="cb-trial-ring a" />
      <div className="cb-trial-ring b" />
      <div className="cb-section-inner">
        <AnimatedSection>
          <h2 className="cb-section-title">
            Simple, honest{" "}
            <span className="cyan">pricing</span>
          </h2>
          <p className="cb-section-sub">
            Every clinic starts with a free 7-day trial. After that, one simple monthly
            subscription — no setup fees, no long-term contracts.
          </p>
          <Link href="/register" className="cb-btn cb-btn-primary cb-btn-lg">
            Start your free trial
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section className="cb-section cb-demo" id="demo">
      <div className="cb-section-inner">
        <AnimatedSection>
          <h2 className="cb-section-title">
            Want to see it{" "}
            <span className="cyan">live</span>?
          </h2>
          <p className="cb-section-sub">
            Book a personal walkthrough with our team before you sign up — no pressure, just a demo.
          </p>
        </AnimatedSection>

        <AnimatedCards className="cb-contact-grid">
          {DEMO_CONTACTS.map((c) => (
            <div className="cb-contact-card" key={c.name}>
              <div className="cb-contact-avatar">
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div className="cb-contact-name">{c.name}</div>
                <div className="cb-contact-phone">{c.intl}</div>
              </div>
              <div className="cb-contact-actions">
                <a href={`tel:${c.tel}`} className="cb-btn cb-btn-outline cb-btn-sm">
                  <PhoneIcon /> Call
                </a>
                <a
                  href={`https://wa.me/${c.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cb-btn cb-btn-primary cb-btn-sm"
                >
                  <ChatIcon /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </AnimatedCards>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="cb-footer">
      <div className="cb-footer-inner">
        <span className="cb-brand">
          <span className="cb-brand-mark">
            <StethoscopeIcon />
          </span>
          ClinicBook Assistant
        </span>
        <div className="cb-footer-links">
          <a href="#features">Features</a>
          <a href="#why-us">Why us</a>
          <a href="#demo">Book a demo</a>
          <Link href="/login">Login</Link>
          <Link href="/register">Register Clinic</Link>
        </div>
        <span className="cb-copy">© {new Date().getFullYear()} ClinicBook Assistant</span>
      </div>
    </footer>
  );
}

export default function LandingAnimated() {
  return (
    <SmoothScroll>
      <div className="cb-landing">
        <div className="cb-mesh-bg" />
        <NetworkBackground />
        <Navbar />
        <Hero />
        <StatsStrip />
        <Timeline />
        <Features />
        <WhyUs />
        <Trial />
        <Demo />
        <Footer />
      </div>
    </SmoothScroll>
  );
}
