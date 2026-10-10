import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Scale, Shield, Eye, Brain, Users, Code2, Video, AlertTriangle, BarChart3, FileSearch, Clock, Database } from 'lucide-react'
import Logo from '../components/Logo'

function LandingNavbar() {
  const handleSmoothScroll = (e, href) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    if (element) {
      const offset = 80 // Height of fixed navbar + some padding
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'The Problem', href: '#problem' },
            { label: 'Our Solution', href: '#solution' },
            { label: 'Candidate Portal', href: '#candidate-portal' },
            { label: 'Interviewer Portal', href: '#interviewer-portal' }
          ].map((item) => (
            <a 
              key={item.label} 
              href={item.href} 
              onClick={(e) => handleSmoothScroll(e, item.href)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/pricing"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
          >
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/candidate/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            Candidate Login
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Interviewer Login
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
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Transform your technical hiring with{' '}
              <span className="text-blue-600">precision and fairness</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              An enterprise-grade platform built for engineering managers and technical recruiters. Ensure objective assessments, maintain interview integrity, and make data-driven hiring decisions with confidence.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-xl transform"
              >
                Interviewer Login <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Hero visual - Code Editor Mockup */}
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
                  <AlertTriangle size={16} className="text-orange-600" />
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

function ProblemSection() {
  return (
    <section id="problem" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">The Challenge of Fair Technical Assessment</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            Technical hiring faces critical challenges that undermine the quality and fairness of candidate evaluation. Traditional interview methods leave organizations vulnerable to bias and compromise.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Bias & Inconsistency */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Scale size={28} className="text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Bias & Inconsistency</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Traditional interviews suffer from subjective evaluation, creating unfair outcomes for candidates and unreliable hiring decisions for organizations.
            </p>
            <ul className="space-y-3">
              {[
                'Subjective evaluation varies between interviewers',
                'Inconsistent standards across interview sessions',
                'Unconscious bias affects candidate assessment',
                'Lack of transparency in evaluation criteria',
                'No objective data to support hiring decisions'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Integrity & Cheating */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield size={28} className="text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Integrity & Cheating</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Remote interviews introduce significant risks of dishonesty, with candidates leveraging unauthorized resources that compromise assessment validity.
            </p>
            <ul className="space-y-3">
              {[
                'Code plagiarism from online repositories',
                'Unauthorized external assistance during interviews',
                'Tab switching to access reference materials',
                'Copy-paste from prepared solutions',
                'No verification of code authenticity'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Impact Statement */}
        <div className="mt-12 text-center">
          <p className="text-lg font-semibold text-gray-700 max-w-3xl mx-auto">
            These challenges result in <span className="text-red-600">costly mis-hires</span>, <span className="text-red-600">overlooked talent</span>, and <span className="text-red-600">erosion of team quality</span> over time.
          </p>
        </div>
      </div>
    </section>
  )
}

function SolutionSection() {
  const solutions = [
    {
      icon: Eye,
      title: 'Real-Time Monitoring',
      desc: 'Continuous oversight with live code synchronization, video streaming, and behavioral tracking ensures complete visibility throughout the interview process.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      desc: 'Advanced algorithms leverage TF-IDF vectorization and AST-based comparison to detect plagiarism and assess code quality with 99.8% accuracy.',
    },
    {
      icon: Users,
      title: 'Dual Portal System',
      desc: 'Purpose-built experiences for candidates and interviewers ensure optimal workflows, transparent communication, and fair assessment processes.',
    },
  ]

  return (
    <section id="solution" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">A Comprehensive Platform for Fair, Secure Interviews</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            InterviewLens combines cutting-edge technology with human-centered design to deliver an interview platform that ensures objectivity, maintains integrity, and empowers data-driven hiring decisions.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {solutions.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-all duration-300 group-hover:scale-110">
                <Icon size={28} className="text-blue-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CandidatePortalSection() {
  const features = [
    {
      icon: Code2,
      title: 'Browser-Based Code Editor',
      desc: 'Write code directly in your browser with syntax highlighting for JavaScript, Python, Java, C++, C#, Go, Ruby, and TypeScript. No downloads or setup required.',
    },
    {
      icon: AlertTriangle,
      title: 'Real-Time Code Execution',
      desc: 'Test your solutions instantly with Judge0 integration. Receive immediate feedback on test cases, execution time, and output validation.',
    },
    {
      icon: Video,
      title: 'Live Video Feed',
      desc: 'WebRTC-based camera streaming provides transparent proctoring. Know exactly what is being monitored during your interview session.',
    },
    {
      icon: FileSearch,
      title: 'Clean Problem Interface',
      desc: 'Access clear problem statements, detailed test cases, and example inputs. Track your submission status and execution results in real-time.',
    },
    {
      icon: Shield,
      title: 'Fair Monitoring',
      desc: 'Transparent integrity checks with visible alerts. No hidden surveillance—you are notified of all proctoring activities and signals.',
    },
    {
      icon: Database,
      title: 'Multiple Language Support',
      desc: 'Choose from 20+ programming languages. Work in the language you are most comfortable with for optimal performance.',
    },
  ]

  return (
    <section id="candidate-portal" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            For Candidates
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Candidate Portal: Fair, Transparent Assessment</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            A streamlined coding environment designed to showcase your skills without technical barriers. Focus on problem-solving with a clean interface, fair evaluation, and transparent monitoring.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-all duration-300 group-hover:scale-110">
                <Icon size={24} className="text-emerald-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Additional Benefits */}
        <div className="mt-12 bg-emerald-50 rounded-2xl p-8 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Built for Candidate Success</h3>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl mx-auto">
            {[
              'No software installation or environment setup',
              'Instant feedback on code execution and test results',
              'Clear visibility into proctoring and monitoring activities',
              'Accessible from any modern web browser',
              'Fair evaluation based on objective code performance',
              'Transparent communication with interviewer via chat'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function InterviewerPortalSection() {
  const features = [
    {
      icon: Eye,
      title: 'Live Code Monitoring',
      desc: 'Watch candidates code in real-time with zero latency. View every keystroke, edit, and thought process as code evolves during the interview.',
    },
    {
      icon: Video,
      title: 'Video Feed Reception',
      desc: 'Receive WebRTC video streams directly from candidates. Monitor facial expressions, environment, and behavior throughout the assessment.',
    },
    {
      icon: AlertTriangle,
      title: 'Proctoring Alerts',
      desc: 'Automatic detection and notification of integrity risks including tab switches, multiple face detection, and clipboard usage events.',
    },
    {
      icon: Users,
      title: 'Session Management',
      desc: 'Create interview sessions, assign coding problems, generate secure candidate access tokens, and track interview progress in real-time.',
    },
    {
      icon: FileSearch,
      title: 'Plagiarism Detection',
      desc: 'TF-IDF vectorization and cosine similarity analysis detect code plagiarism with 99.8% accuracy. AST-based comparison identifies structural copying.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      desc: 'Comprehensive metrics including engagement scores, performance trends, submission timing, and behavioral pattern analysis.',
    },
    {
      icon: Code2,
      title: 'Code Analysis',
      desc: 'Detailed submission review with execution results, test case validation, runtime performance, and code quality assessment.',
    },
    {
      icon: Clock,
      title: 'Interview History',
      desc: 'Complete records of all interviews with code snapshots, proctoring signals, submission history, and exportable assessment data.',
    },
  ]

  return (
    <section id="interviewer-portal" className="py-24 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            For Interviewers
          </div>
          <h2 className="text-4xl font-bold mb-4">Interviewer Portal: Powerful Insights, Complete Control</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Gain comprehensive oversight of technical interviews with enterprise-grade monitoring, AI-powered analysis, and data-driven decision tools. Make confident hiring decisions backed by objective data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 hover:bg-gray-800/80 transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-all duration-300 group-hover:scale-110">
                <Icon size={24} className="text-blue-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-extrabold mb-2">99.8%</p>
              <p className="text-blue-100 text-sm">Detection accuracy across 20+ programming languages</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold mb-2">&lt;2s</p>
              <p className="text-blue-100 text-sm">Average similarity analysis time per session</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold mb-2">Real-time</p>
              <p className="text-blue-100 text-sm">Zero latency code synchronization and monitoring</p>
            </div>
          </div>
        </div>

        {/* Key Capabilities */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Real-Time Monitoring Capabilities</h3>
            <ul className="space-y-3">
              {[
                'Live code synchronization with zero latency',
                'WebRTC video feed from candidate camera',
                'Automatic proctoring signal detection',
                'Interactive chat with candidates',
                'Real-time test execution results'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <Check size={18} className="text-blue-400 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Post-Interview Analysis</h3>
            <ul className="space-y-3">
              {[
                'Code similarity analysis and plagiarism detection',
                'Complete interview replay with code snapshots',
                'Behavioral pattern analysis and insights',
                'Performance metrics and engagement tracking',
                'Exportable assessment reports'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <Check size={18} className="text-blue-400 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" />
          <p className="text-gray-500 text-sm mt-4 leading-relaxed max-w-md">
            Elevating technical recruitment through precision monitoring and AI-driven insights. Driving engineering excellence.
          </p>
          <div className="mt-4">
            <a 
              href="mailto:contact.interviewlens@gmail.com" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              contact.interviewlens@gmail.com
            </a>
          </div>
        </div>
        
        <div className="pt-8 mt-8 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">© 2026 InterviewLens Inc. All rights reserved.</p>
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
      <ProblemSection />
      <SolutionSection />
      <CandidatePortalSection />
      <InterviewerPortalSection />
      <Footer />
    </div>
  )
}
