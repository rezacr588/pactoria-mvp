import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  CurrencyPoundIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  LightBulbIcon,
  ScaleIcon,
  BoltIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui';

const stats = [
  { id: 1, name: 'Hours Saved Weekly', value: '6+' },
  { id: 2, name: 'UK Legal Compliance', value: '95%' },
  { id: 3, name: 'Risk Reduction', value: '73%' },
  { id: 4, name: 'Cost Savings', value: '£8K+' },
];

const features = [
  {
    name: 'AI-Powered Generation',
    description: 'Transform plain English into legally binding UK contracts in under 30 seconds.',
    icon: SparklesIcon,
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    name: 'UK Legal Compliance',
    description: 'Built-in GDPR, employment law, and consumer rights validation for every contract.',
    icon: ShieldCheckIcon,
    gradient: 'from-green-600 to-teal-600',
  },
  {
    name: 'Risk Assessment',
    description: 'Intelligent 1-10 scale risk scoring with actionable recommendations.',
    icon: ChartBarIcon,
    gradient: 'from-orange-600 to-red-600',
  },
  {
    name: 'Smart Templates',
    description: '20+ UK-specific legal templates for every business need.',
    icon: DocumentTextIcon,
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    name: 'Version Control',
    description: 'Complete audit trail and version history for compliance and transparency.',
    icon: ClockIcon,
    gradient: 'from-pink-600 to-rose-600',
  },
  {
    name: 'Team Collaboration',
    description: 'Secure workspace for up to 5 team members with role-based permissions.',
    icon: UserGroupIcon,
    gradient: 'from-yellow-600 to-amber-600',
  },
];

const benefits = [
  {
    icon: CurrencyPoundIcon,
    title: 'Save £8,000+ Annually',
    description: 'Reduce legal fees by 80% with AI-powered contract generation and review.',
  },
  {
    icon: ClockIcon,
    title: '6+ Hours Saved Weekly',
    description: 'Automate contract creation, compliance checks, and risk assessments.',
  },
  {
    icon: ShieldCheckIcon,
    title: '95% Compliance Accuracy',
    description: 'Stay protected with real-time UK legal compliance validation.',
  },
];

const testimonials = [
  {
    content: "Pactoria has transformed how we handle contracts. What used to take days with solicitors now takes minutes. The UK compliance features give us peace of mind.",
    author: "Sarah Johnson",
    role: "CEO, TechCorp Ltd",
    company: "Management Consultancy",
  },
  {
    content: "The AI risk assessment caught issues we would have missed. It's like having a legal team on demand, but at a fraction of the cost.",
    author: "Michael Chen",
    role: "Operations Director",
    company: "Digital Agency",
  },
  {
    content: "Finally, a contract platform built for UK businesses. The GDPR compliance checks alone have saved us from potential fines.",
    author: "Emma Wilson",
    role: "Founder",
    company: "Recruitment Firm",
  },
];

const useCases = [
  "Professional Services Agreements",
  "Employment Contracts",
  "Supplier Agreements",
  "Non-Disclosure Agreements",
  "Partnership Agreements",
  "Terms of Service",
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white">
      {/* Navbar */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5">
              <span className="text-xl font-bold text-primary-600">Pactoria</span>
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
              Features
            </a>
            <a href="#use-cases" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
              Use Cases
            </a>
            <a href="#testimonials" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
              Testimonials
            </a>
            <Link to="/login" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
              Pricing
            </Link>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <Link to="/login" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
              Sign In
            </Link>
            <Link to="/login">
              <Button size="sm" className="px-4">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50" />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link to="/" className="-m-1.5 p-1.5">
                  <span className="text-xl font-bold text-primary-600">Pactoria</span>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  <div className="space-y-2 py-6">
                    <a
                      href="#features"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Features
                    </a>
                    <a
                      href="#use-cases"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Use Cases
                    </a>
                    <a
                      href="#testimonials"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Testimonials
                    </a>
                    <Link
                      to="/login"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                  </div>
                  <div className="py-6 space-y-2">
                    <Link
                      to="/login"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button fullWidth className="mt-2">
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-primary-100/20">
        <div className="mx-auto max-w-7xl pb-24 pt-20 sm:pb-32 sm:pt-24 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
          <div className="px-6 lg:px-0 lg:pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="max-w-lg">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-primary-700 bg-primary-100 mb-6 sm:mb-8">
                  <BoltIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden sm:inline">AI-Powered • UK-Compliant • SME-Focused</span>
                  <span className="sm:hidden">AI-Powered • UK-Compliant</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-gray-900">
                  UK Contract Management
                  <span className="text-primary-600"> Made Simple</span>
                </h1>
                
                <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
                  Generate legally binding, UK-compliant contracts in seconds. 
                  Save £8,000+ annually on legal fees while ensuring 95% compliance accuracy 
                  with our AI-powered platform built specifically for UK SMEs.
                </p>
                
                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-x-6">
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" className="px-8 w-full sm:w-auto">
                      Start Free Trial
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
                    View Demo <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-x-6 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                    14-day free trial
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
            <div className="shadow-lg md:rounded-3xl">
              <div className="bg-primary-500 [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]">
                <div className="absolute -inset-y-px left-1/2 -z-10 ml-10 w-[200%] skew-x-[-30deg] bg-primary-100 opacity-20 ring-1 ring-inset ring-white md:ml-20 lg:ml-36" />
                <div className="relative px-6 pt-8 sm:px-10 sm:pt-10">
                  <img
                    src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80"
                    alt="Contract management dashboard"
                    className="mb-[-12%] rounded-tl-xl rounded-tr-xl shadow-2xl ring-1 ring-gray-900/10"
                    width={2432}
                    height={1442}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mx-auto -mt-8 sm:-mt-12 max-w-7xl px-6 sm:mt-0 lg:px-8 xl:-mt-8">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-2 gap-4 sm:gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-2 sm:gap-y-3">
                <dt className="text-xs sm:text-base leading-5 sm:leading-7 text-gray-600">{stat.name}</dt>
                <dd className="order-first text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-tight text-gray-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">The Problem</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            UK SMEs waste £12,000+ annually on contract management
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Traditional legal services are expensive, slow, and complex. Most contract software 
            isn't built for UK law. SMEs risk non-compliance, costly disputes, and missed opportunities.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <benefit.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  {benefit.title}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{benefit.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Enterprise-grade features for SME budgets
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Built specifically for UK businesses, Pactoria combines cutting-edge AI with deep legal expertise 
            to deliver a contract management platform that actually works for you.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient}`}>
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Use Cases */}
      <div id="use-cases" className="bg-primary-50/50 py-24 sm:py-32 mt-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Use Cases</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              One platform, endless possibilities
            </p>
          </div>
          
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {useCases.map((useCase) => (
              <div
                key={useCase}
                className="flex items-center rounded-lg bg-white px-6 py-4 shadow-sm ring-1 ring-gray-900/10"
              >
                <CheckCircleIcon className="h-6 w-6 text-primary-600 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">{useCase}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by UK's fastest-growing SMEs
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.author} className="flex flex-col bg-white rounded-2xl shadow-lg ring-1 ring-gray-900/5">
                <div className="p-8">
                  <div className="flex gap-x-1 text-yellow-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 flex-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-900">
                    <p className="text-base">"{testimonial.content}"</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-600">
                        {testimonial.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.author}</div>
                      <div className="text-sm text-gray-600">{testimonial.role} • {testimonial.company}</div>
                    </div>
                  </figcaption>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:px-24 xl:py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-600 to-primary-800 opacity-90" />
        
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your contract management?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-100">
            Join hundreds of UK SMEs saving time and money with Pactoria. 
            Start your free 14-day trial today – no credit card required.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/login">
              <Button size="lg" variant="secondary" className="bg-white text-primary-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/login" className="text-sm font-semibold leading-6 text-white">
              Book a Demo <span aria-hidden="true">→</span>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-x-8 text-sm text-gray-200">
            <div className="flex items-center">
              <LightBulbIcon className="h-5 w-5 mr-2" />
              UK Innovator Visa Endorsed
            </div>
            <div className="flex items-center">
              <ScaleIcon className="h-5 w-5 mr-2" />
              GDPR Compliant
            </div>
          </div>
        </div>

        <svg
          viewBox="0 0 1024 1024"
          className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
          aria-hidden="true"
        >
          <circle cx={512} cy={512} r={512} fill="url(#gradient)" fillOpacity="0.7" />
          <defs>
            <radialGradient id="gradient">
              <stop stopColor="#7c3aed" />
              <stop offset={1} stopColor="#2563eb" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">LinkedIn</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2025 Pactoria Ltd. All rights reserved. Company Number: 12345678. VAT: GB123456789.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}