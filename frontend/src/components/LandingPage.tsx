"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Play,
  RotateCcw,
  BarChart3,
  Calendar,
  Layers,
  BookOpen,
  Clock,
  Sun,
  Moon,
  Lock,
  ChevronRight,
  Check,
  Shield,
  HelpCircle,
  Compass,
} from "lucide-react";

interface LandingPageProps {
  onOpenAuth: (mode: "login" | "register") => void;
}

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("studyos_theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("studyos_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="min-h-screen w-full theme-bg theme-text-primary selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* ======================================================== */}
      {/* NAVIGATION BAR                                           */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl border-b theme-border theme-nav transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full rounded-[14px] bg-[#030712] flex items-center justify-center">
                <span className="font-mono font-black text-emerald-400 text-lg">OS</span>
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight theme-text-primary">
                Study<span className="text-emerald-500">OS</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Discipline System
              </span>
            </div>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold theme-text-secondary">
            <a href="#features" className="hover:theme-text-primary transition-colors">
              Features
            </a>
            <a href="#methodology" className="hover:theme-text-primary transition-colors">
              Methodology
            </a>
            <a href="#focus-mode" className="hover:theme-text-primary transition-colors">
              Focus Engine
            </a>
            <a href="#faq" className="hover:theme-text-primary transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 sm:p-2.5 rounded-xl border theme-border theme-card-subtle hover:theme-text-primary theme-text-secondary transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Sign In */}
            <button
              onClick={() => onOpenAuth("login")}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold theme-text-secondary hover:theme-text-primary border theme-border theme-card-subtle transition-all cursor-pointer"
            >
              Sign In
            </button>

            {/* Get Started */}
            <button
              onClick={() => onOpenAuth("register")}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO SECTION                                             */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border theme-border theme-card-subtle text-emerald-400 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Personal Study Productivity System</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight theme-text-primary leading-[1.1]">
              Build Discipline. <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                Master Consistency.
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-xl theme-text-secondary leading-relaxed max-w-2xl mx-auto">
              Your personal study system for turning daily goals into lasting habits. Plan your study
              sessions, resume unfinished work, track real progress, and stay consistent one day at a time.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-2">
              <button
                onClick={() => onOpenAuth("register")}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Get Started with StudyOS</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenAuth("login")}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold theme-text-secondary hover:theme-text-primary border theme-border theme-card-subtle hover:border-emerald-500/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Sign In to Workspace</span>
              </button>
            </div>

            {/* Trust points */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs theme-text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>5:00 AM Daily Study Rollover</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Persistent Resumable Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Zero Fake / Demo Data</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* HERO VISUAL: INTERACTIVE INTERFACE PREVIEW               */}
          {/* ======================================================== */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="rounded-3xl p-3 sm:p-5 border theme-border theme-card shadow-2xl relative">
              {/* Top Window Bar */}
              <div className="flex items-center justify-between border-b theme-border pb-3 mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono font-bold theme-text-muted">
                    StudyOS Workspace — Live Session
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>5:00 AM Cycle Active</span>
                </div>
              </div>

              {/* Grid of Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Subject Progress Card */}
                <div className="p-4 rounded-2xl theme-card-subtle border theme-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Active Target
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      High Priority
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base theme-text-primary">Python Systems</h4>
                    <p className="text-xs theme-text-muted">Daily Target: 120 minutes</p>
                  </div>
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">35m completed</span>
                      <span className="theme-text-muted">85m remaining</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "29%" }} />
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <span>Finish Block preserved:</span>
                    <strong className="font-mono">85m resumable</strong>
                  </div>
                </div>

                {/* Focus Timer Display */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#090f1d] to-[#040814] border border-emerald-500/30 text-center space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                      Deep Focus Mode
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">Segment 1 of 3</span>
                  </div>
                  <div className="font-mono text-4xl sm:text-5xl font-black text-slate-100 tracking-tight my-1 drop-shadow-md">
                    50:00
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    50m Focused Study • 10m Break
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <button
                      onClick={() => onOpenAuth("register")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Study</span>
                    </button>
                    <button
                      onClick={() => onOpenAuth("register")}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      Pause
                    </button>
                  </div>
                </div>

                {/* Backlog & Rollover Card */}
                <div className="p-4 rounded-2xl theme-card-subtle border theme-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      Daily Boundary
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300">
                      Idempotent
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base theme-text-primary">5:00 AM Rollover</h4>
                    <p className="text-xs theme-text-muted">Unfinished work never discarded</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl border theme-border theme-card flex items-center justify-between">
                      <span className="theme-text-secondary">Historical records:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">100% Preserved</strong>
                    </div>
                    <div className="p-2 rounded-xl border theme-border theme-card flex items-center justify-between">
                      <span className="theme-text-secondary">Unfinished Targets:</span>
                      <strong className="text-sky-600 dark:text-sky-400">Backlog Auto-Allocated</strong>
                    </div>
                  </div>
                  <div className="text-[11px] theme-text-muted">
                    No midnight reset panic. Late night sessions count toward your true study day.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* MOTIVATIONAL BANNER SECTION                              */}
      {/* ======================================================== */}
      <section id="methodology" className="py-16 sm:py-24 border-y theme-border theme-card-subtle relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>

          <blockquote className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight theme-text-primary leading-tight max-w-3xl mx-auto">
            “Consistency beats motivation. Show up every day, focus on what matters, and let your progress speak for itself.”
          </blockquote>

          <p className="text-sm sm:text-base theme-text-muted max-w-xl mx-auto">
            Motivation is fleeting. StudyOS is designed around deterministic principles: measurable daily targets,
            resumable work intervals, and fair backlog recovery that prevents burnout.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onOpenAuth("register")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>Commit to Consistency</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6 CORE ARCHITECTURAL PILLARS                             */}
      {/* ======================================================== */}
      <section id="features" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Engineered For Serious Preparation
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight theme-text-primary">
            Everything You Need To Master Your Studies
          </h2>
          <p className="text-sm sm:text-base theme-text-secondary">
            StudyOS is not a generic to-do list. It is an end-to-end preparation architecture built to protect your focused time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* 1. Daily Study Targets */}
          <div className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Daily Study Targets</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Define target study durations per subject (e.g. Python 120m, DSA 60m). Track exact seconds of focused study without ambiguous estimations.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Subject priority weighting (High/Medium/Low)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Distinct completion vs in-progress states</span>
              </li>
            </ul>
          </div>

          {/* 2. Persistent Study Sessions & Resume */}
          <div className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Persistent Sessions & Resume</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Life happens. If you finish early with 35m done out of a 120m target, the remaining 85m stays preserved and resumable across browser restarts and days.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Exact segment & remaining time recovery</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Multi-subject session isolation</span>
              </li>
            </ul>
          </div>

          {/* 3. Automatic Backlog Management */}
          <div className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Automatic Backlog Management</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Unfinished targets are carried forward into your backlog at the 5:00 AM daily rollover. Smart capacity reallocation guarantees fair study distribution.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Idempotent rollover prevents duplicate backlog</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Capacity-aware planning based on free hours</span>
              </li>
            </ul>
          </div>

          {/* 4. Deep Focus Mode */}
          <div id="focus-mode" className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Deep Focus Mode</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Structured blocks with mandatory rest (50/10, 60/10/50, 60/10/60/10/40). Browser Fullscreen API requests upon explicit user start, with back navigation guards.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Breaks do not count toward focused study</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Accidental back navigation warning</span>
              </li>
            </ul>
          </div>

          {/* 5. Subject Progress & Study Analytics */}
          <div className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Subject Analytics & Progress</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Verify your real study time. Daily trends, weekly hours, subject breakdowns, and session histories computed directly from verified study intervals.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Authoritative backend data persistence</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Clean empty state for new accounts</span>
              </li>
            </ul>
          </div>

          {/* 6. Personal Notes & Approved Resources */}
          <div className="p-6 sm:p-8 rounded-3xl theme-card border theme-border hover:border-emerald-500/40 transition-all space-y-4 shadow-sm group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Notes & Study Resources</h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              Organize revision notes, lecture formulas, and approved study links directly within your workspace. Quick access inside Focus Mode drawer without breaking focus.
            </p>
            <ul className="text-xs theme-text-muted space-y-2 pt-2 border-t theme-border">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Secure URL protocol validation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Subject-tagged notes and markdown support</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* HONEST WEB / PWA FOCUS RESTRICTIONS DISCLOSURE          */}
      {/* ======================================================== */}
      <section className="py-12 border-y theme-border theme-card-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-3xl theme-card border theme-border flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold theme-text-primary">
                Honest Focus Restrictions & PWA Standards
              </h4>
              <p className="text-xs theme-text-secondary leading-relaxed">
                StudyOS is a standards-compliant Website and Progressive Web App. Focus Mode leverages the browser Fullscreen API and application-level back interceptors to maximize focus. We do not make deceptive claims about blocking operating-system Alt+Tab, Task Manager, or native device switching. Fullscreen is a discipline tool, not an OS lock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FAQ ACCORDION / EXPLANATIONS                            */}
      {/* ======================================================== */}
      <section id="faq" className="py-20 sm:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight theme-text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-sm theme-text-secondary">
            Clear explanations of how StudyOS manages your study day and session data.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl theme-card border theme-border space-y-2">
            <h3 className="font-bold text-base theme-text-primary flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>How does the 5:00 AM daily study-cycle reset work?</span>
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed pl-6">
              Unlike ordinary apps that wipe data at midnight, StudyOS defines a study day from 5:00 AM to 4:59 AM the next day. If you study past midnight at 1:30 AM, your time counts toward the current study day. At 5:00 AM, unfinished target time safely moves to your backlog without deleting any history or completed sessions.
            </p>
          </div>

          <div className="p-6 rounded-2xl theme-card border theme-border space-y-2">
            <h3 className="font-bold text-base theme-text-primary flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>What happens if I click &ldquo;Finish Block&rdquo; early?</span>
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed pl-6">
              Clicking Finish Block opens a confirmation prompt. Once confirmed, only the exact minutes of focused study you completed are recorded. The remaining target time stays pending and resumable from your dashboard. Your progress is never wiped or rounded up to a false 100%.
            </p>
          </div>

          <div className="p-6 rounded-2xl theme-card border theme-border space-y-2">
            <h3 className="font-bold text-base theme-text-primary flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Is my study data isolated and permanently saved?</span>
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed pl-6">
              Yes. Each account has isolated records authenticated via secure JWT tokens on the backend database. New accounts start with a clean personal workspace, and your data syncs securely so you can switch browsers or devices without data loss.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FINAL CALL TO ACTION                                     */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-28 relative overflow-hidden border-t theme-border">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-emerald-500/10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight theme-text-primary">
            Ready to build discipline and consistency in your studies?
          </h2>
          <p className="text-base sm:text-lg theme-text-secondary max-w-2xl mx-auto">
            Get started with StudyOS and take control of your daily progress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenAuth("register")}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenAuth("login")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold theme-text-secondary hover:theme-text-primary border theme-border theme-card-subtle flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="border-t theme-border py-8 text-xs theme-text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold theme-text-secondary">
            <span>StudyOS</span>
            <span>•</span>
            <span className="font-normal theme-text-muted">Personal Study & Discipline Workspace</span>
          </div>

          <p className="text-center sm:text-right">
            5:00 AM Study Day Boundary • Persistent Sessions • Zero Demo Data
          </p>
        </div>
      </footer>
    </div>
  );
}
