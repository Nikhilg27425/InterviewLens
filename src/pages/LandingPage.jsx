import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Play, ArrowRight, Check, ChevronRight, Github, Twitter, Linkedin } from 'lucide-react'
import Logo from '../components/Logo'

function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Architecture', 'Solutions', 'Pricing'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Log In
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              New: AI-Driven Behavioral Analysis
            </div>
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Make technical interviews{' '}
              <span className="text-blue-600">more reliable</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              The AI-powered platform for engineering managers and recruiters. Gain real-time insights, ensure fair assessments, and automate plagiarism detection with surgical precision.
            </p>
            <div className="flex items-center gap-4 mb-10">
              <Link
                to="/login"
                className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <button className="flex items-center gap-2 text-gray-700 font-semibold px-6 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Play size={14} className="text-blue-600" fill="#2563EB" />
                Watch Demo
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['#3B82F6', '#10B981', '#F59E0B'].map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Joined by <span className="font-semibold text-gray-900">500+</span> engineering teams this month
              </p>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 opacity-40" />
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
                {/* Mock live interview UI */}
                <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      Live Interview Active
                    </span>
                  </div>
                </div>
                <div className="p-4 font-mono text-xs text-green-400 space-y-1 min-h-48">
                  <p><span className="text-blue-400">function</span> <span className="text-yellow-300">twoSum</span>(nums, target) {'{'}</p>
                  <p className="ml-4"><span className="text-blue-400">const</span> map = <span className="text-blue-400">new</span> Map();</p>
                  <p className="ml-4"><span className="text-blue-400">for</span> (<span className="text-blue-400">let</span> i = 0; i &lt; nums.length; i++) {'{'}</p>
                  <p className="ml-8"><span className="text-blue-400">const</span> comp = target - nums[i];</p>
                  <p className="ml-8"><span className="text-blue-400">if</span> (map.has(comp)) {'{'}</p>
                  <p className="ml-12"><span className="text-blue-400">return</span> [map.get(comp), i];</p>
                  <p className="ml-8">{'}'}</p>
                  <p className="ml-8">map.set(nums[i], i);</p>
                  <p className="ml-4">{'}'}</p>
                  <p>{'}'}</p>
                </div>
                <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">✓ Test Case #1: Passed — 42ms</p>
                </div>
              </div>
              {/* Floating alert badge */}
              <div className="absolute -bottom-4 -left-6 bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2 border border-gray-100">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-sm">⚠</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Risk Signal Detected</p>
                  <p className="text-xs text-gray-400">Tab switch detected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: '👁',
      title: 'Live Monitoring',
      desc: 'Watch candidates code in real-time with zero latency. Track focus and environment stability instantly.',
    },
    {
      icon: '🔍',
      title: 'Similarity Analysis',
      desc: 'Detect plagiarism across millions of open-source repositories and internal interview banks.',
    },
    {
      icon: '🧠',
      title: 'Behavioral Insights',
      desc: 'AI-driven analysis of problem-solving patterns and communication clarity during the technical session.',
    },
  ]

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Hiring tools built for precision</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Stop guessing and start measuring. Our platform provides the technical depth recruiters need and the intuitive interface engineering managers love.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="text-center p-8 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-5 mx-auto group-hover:bg-blue-100 transition-colors">
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MonitoringSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">Real-time Oversight</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Keep every interview<br />under your lens
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Our live monitoring suite gives you an eagle-eye view of the candidate's environment. Identify potential red flags before they become issues, ensuring a fair and consistent experience for every applicant.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Multi-tab switching detection',
                'Clipboard monitor & usage alerts',
                'Interactive interviewer-to-candidate chat',
                'Low-latency screen streaming',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm hover:underline">
              Explore Monitoring <ChevronRight size={16} />
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80"
              alt="Monitoring system"
              className="w-full h-72 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CodeOriginalitySection() {
  return (
    <section className="py-24 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80"
              alt="Code editor"
              className="w-full h-72 object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-3">Advanced Integrity</p>
            <h2 className="text-4xl font-bold mb-6">
              Identity-verified<br />code originality
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Go beyond simple string matching. Our engine uses AST-based analysis to detect structural similarity even if the candidate renames variables or refactors logic to hide external libraries.
            </p>
            <div className="flex gap-10 mb-8">
              <div>
                <p className="text-3xl font-extrabold text-blue-400">99.8%</p>
                <p className="text-gray-400 text-xs mt-1">Detection accuracy across 20+ languages</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-blue-400">&lt;2s</p>
                <p className="text-gray-400 text-xs mt-1">Average analysis time per session</p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Similarity Check
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function InfraSection() {
  return (
    <section id="architecture" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Enterprise-grade<br />infrastructure
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Built on a globally distributed serverless architecture to ensure maximum reliability and sub-millisecond latency for live interview sessions.
            </p>
            <ul className="space-y-5 mb-10">
              {[
                { icon: '⚡', title: 'Edge-Computing Nodes', desc: 'Low-latency streaming via AWS Global Accelerator' },
                { icon: '🔒', title: 'End-to-End Encryption', desc: 'AES-256 encryption for all interview recordings' },
                { icon: '🔧', title: 'Highly Scalable APIs', desc: 'Built on top of GraphQL for high-performance data fetching' },
              ].map(({ icon, title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-gray-500 text-sm">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-5 h-5 text-base">🔗</span>
                Microservices Mesh — Isolating compute for code execution
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-5 h-5 text-base">📊</span>
                Real-time Analytics — Post-interview AI scoring pipeline
              </div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80"
              alt="Server infrastructure"
              className="w-full h-80 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 bg-blue-600">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">Ready to scale your hiring?</h2>
        <p className="text-blue-200 mb-10 text-lg">
          Join hundreds of engineering teams using InterviewLens to hire better, faster, and more reliably. Start your 14-day free trial today. No credit card required.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="bg-white text-blue-600 font-bold px-8 py-3.5 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
          >
            Start My Trial
          </Link>
          <button className="border-2 border-white text-white font-bold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors">
            Talk to Sales
          </button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const links = {
    Product: ['Features', 'Integrations', 'Pricing', 'Changelog'],
    Resources: ['Documentation', 'API Reference', 'Help Center', 'Blog'],
    Company: ['About Us', 'Careers', 'Security', 'Contact'],
  }

  return (
    <footer className="bg-white border-t border-gray-100 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2">
            <Logo size="md" />
            <p className="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs">
              Elevating technical recruitment through precision monitoring and AI-driven insights. Driving engineering excellence.
            </p>
            <div className="flex gap-3 mt-5">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button key={i} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="font-semibold text-gray-900 text-sm mb-3">{section}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-400">© 2024 InterviewLens Inc. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((item) => (
              <a key={item} href="#" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <MonitoringSection />
      <CodeOriginalitySection />
      <InfraSection />
      <CTASection />
      <Footer />
    </div>
  )
}
