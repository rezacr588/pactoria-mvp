import { useState, useEffect } from 'react';
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
  HomeIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { textColors, textStyles, typography } from '../utils/typography';

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
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar and smooth scrolling
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  // Handle smooth scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="bg-white" role="main">
      {/* Navbar */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-200/50 shadow-sm' 
          : 'bg-transparent'
      }`}>
        <nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5">
              <div className="flex items-center space-x-3">
                <img
                  src="/pactoria-logo-96.png"
                  srcSet="/pactoria-logo-48.png 1x, /pactoria-logo-96.png 2x, /pactoria-logo-128.png 3x"
                  alt="Pactoria - UK Contract Management"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain pactoria-logo"
                  loading="lazy"
                  width="40"
                  height="40"
                />
                <span className={`${typography.heading.h3} sm:${typography.heading.h2} font-bold transition-colors text-primary-600`}>Pactoria</span>
              </div>
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
          <div className="hidden lg:flex lg:gap-x-8">
            <button
              onClick={() => scrollToSection('features')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToSection('features'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded px-2 py-1`}
              aria-label="Navigate to Features section"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('use-cases')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToSection('use-cases'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded px-2 py-1`}
              aria-label="Navigate to Use Cases section"
            >
              Use Cases
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToSection('testimonials'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded px-2 py-1`}
              aria-label="Navigate to Testimonials section"
            >
              Testimonials
            </button>
            <Link to="/login" className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textStyles.link}`}>
              Pricing
            </Link>
            {user && (
              <Link to="/dashboard" className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textStyles.link} flex items-center gap-1`}>
                <HomeIcon className="h-4 w-4" />
                Back to App
              </Link>
            )}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="px-4">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className={`${typography.body.medium} font-semibold leading-6 transition-colors ${textStyles.link}`}>
                  Sign In
                </Link>
                <Link to="/login">
                  <Button size="sm" className="px-4">
                    Start Free Trial
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50" />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link to="/" className="-m-1.5 p-1.5">
                  <div className="flex items-center space-x-3">
                    <img
                      src="/pactoria-logo-96.png"
                      srcSet="/pactoria-logo-48.png 1x, /pactoria-logo-96.png 2x, /pactoria-logo-128.png 3x"
                      alt="Pactoria - UK Contract Management"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain pactoria-logo"
                      loading="lazy"
                      width="40"
                      height="40"
                    />
                    <span className="text-xl sm:text-2xl font-bold text-primary-600">Pactoria</span>
                  </div>
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
                    <button
                      onClick={() => {
                        scrollToSection('features');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Navigate to Features section"
                    >
                      Features
                    </button>
                    <button
                      onClick={() => {
                        scrollToSection('use-cases');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Navigate to Use Cases section"
                    >
                      Use Cases
                    </button>
                    <button
                      onClick={() => {
                        scrollToSection('testimonials');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Navigate to Testimonials section"
                    >
                      Testimonials
                    </button>
                    <Link
                      to="/login"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    {user && (
                      <Link
                        to="/dashboard"
                        className="-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <HomeIcon className="h-5 w-5" />
                        Back to App
                      </Link>
                    )}
                  </div>
                  <div className="py-6 space-y-2">
                    {user ? (
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button fullWidth className="mt-2">
                          <HomeIcon className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
        {/* Background decoration */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-400 to-primary-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-7xl pb-24 pt-24 sm:pb-32 sm:pt-32 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:px-8 lg:py-40">
          <div className="px-6 lg:px-0 lg:pt-4">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <div className="max-w-xl">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-primary-700 bg-primary-100 mb-6 sm:mb-8">
                  <BoltIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden sm:inline">AI-Powered • UK-Compliant • SME-Focused</span>
                  <span className="sm:hidden">AI-Powered • UK-Compliant</span>
                </div>
                
                <h1 className={`${typography.display.large} font-bold tracking-tight ${textColors.primary} leading-tight`}>
                  UK Contract Management
                  <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent"> Made Simple</span>
                </h1>
                
                <p className={`mt-6 sm:mt-8 ${typography.body.large} leading-8 sm:leading-9 ${textColors.secondary} max-w-2xl`}>
                  Generate legally binding, UK-compliant contracts in seconds. 
                  Save £8,000+ annually on legal fees while ensuring 95% compliance accuracy 
                  with our AI-powered platform built specifically for UK SMEs.
                </p>
                
                <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-x-6">
                  <Link to={user ? "/dashboard" : "/login"} className="w-full sm:w-auto">
                    <Button size="lg" className="px-8 py-4 w-full sm:w-auto text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                      {user ? (
                        <>
                          <HomeIcon className="mr-2 h-5 w-5" />
                          Go to Dashboard
                        </>
                      ) : (
                        <>
                          Start Free Trial
                          <ArrowRightIcon className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </Link>
                  {!user && (
                    <Link to="/login" className={`${typography.body.large} font-semibold leading-6 ${textStyles.linkMuted} transition-colors duration-200 flex items-center justify-center sm:justify-start`}>
                      View Demo <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  )}
                </div>

                {!user && (
                  <div className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-x-8 ${typography.body.small} ${textColors.secondary}`}>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                      No credit card required
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                      14-day free trial
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                      Cancel anytime
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-16 sm:mt-20 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen lg:max-w-none">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/10 rounded-3xl transform rotate-1" />
              <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/10 overflow-hidden">
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 px-6 pt-8 sm:px-10 sm:pt-10">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80"
                      alt="Contract management dashboard showing modern interface with contract list, analytics, and team collaboration features"
                      className="w-full rounded-t-xl shadow-xl ring-1 ring-gray-900/10 transform hover:scale-105 transition-transform duration-300"
                      width={2432}
                      height={1442}
                      loading="eager"
                    />
                    {/* Floating elements for visual appeal */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-500 rounded-full opacity-20 animate-pulse" />
                    <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-primary-300 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '1s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
          <div className="text-center mb-12">
            <p className="text-base font-semibold text-primary-600 mb-2">Trusted by hundreds of UK SMEs</p>
            <h2 className={`${typography.heading.h2} font-bold ${textColors.primary}`}>Proven results that speak for themselves</h2>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:gap-12 text-center lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <dd className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary-600 mb-2">
                  {stat.value}
                </dd>
                <dt className="text-sm sm:text-base leading-6 text-gray-600 font-medium">{stat.name}</dt>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">The Challenge</h2>
            <p className={`mt-2 ${typography.heading.h1} font-bold tracking-tight ${textColors.primary}`}>
              UK SMEs waste £12,000+ annually on contract management
            </p>
            <p className={`mt-6 ${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              Traditional legal services are expensive, slow, and complex. Most contract software 
              isn't built for UK law. SMEs risk non-compliance, costly disputes, and missed opportunities.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="text-center mb-12">
              <h3 className={`${typography.heading.h2} font-bold ${textColors.primary} mb-4`}>Our Solution</h3>
              <p className={`${typography.body.large} ${textColors.secondary}`}>Transform your contract management with measurable results</p>
            </div>
            <dl className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-6 group-hover:bg-primary-200 transition-colors duration-200">
                    <benefit.icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <dt className={`${typography.heading.h4} font-semibold leading-7 ${textColors.primary} mb-4`}>
                    {benefit.title}
                  </dt>
                  <dd className={`${typography.body.medium} leading-7 ${textColors.secondary}`}>
                    {benefit.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Everything you need</h2>
            <p className={`mt-2 ${typography.heading.h1} font-bold tracking-tight ${textColors.primary}`}>
              Enterprise-grade features for SME budgets
            </p>
            <p className={`mt-6 ${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              Built specifically for UK businesses, Pactoria combines cutting-edge AI with deep legal expertise 
              to deliver a contract management platform that actually works for you.
            </p>
          </div>

          <div className="mx-auto mt-16 sm:mt-20 lg:mt-24">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div 
                  key={feature.name} 
                  className="relative group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold leading-7 text-gray-900 group-hover:text-primary-700 transition-colors duration-200">
                    {feature.name}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    {feature.description}
                  </p>
                  
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/5 to-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div id="use-cases" className="bg-primary-50/50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Use Cases</h2>
            <p className={`mt-2 ${typography.heading.h1} font-bold tracking-tight ${textColors.primary}`}>
              One platform, endless possibilities
            </p>
            <p className={`mt-6 ${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              From employment contracts to supplier agreements, Pactoria handles every type of business contract with UK legal precision.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {useCases.map((useCase, index) => (
              <div
                key={useCase}
                className="flex items-center rounded-xl bg-white px-6 py-5 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md hover:ring-primary-200 transition-all duration-200 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-lg mr-4 group-hover:bg-primary-200 transition-colors duration-200">
                  <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                </div>
                <span className="text-base font-medium text-gray-900 group-hover:text-primary-700 transition-colors duration-200">{useCase}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Customer Stories</h2>
            <p className={`mt-2 ${typography.heading.h1} font-bold tracking-tight ${textColors.primary}`}>
              Trusted by UK's fastest-growing SMEs
            </p>
            <p className={`mt-6 ${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              See how businesses like yours are transforming their contract management and saving thousands of pounds annually.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div 
                key={testimonial.author} 
                className="relative flex flex-col bg-white rounded-2xl shadow-lg ring-1 ring-gray-900/5 hover:shadow-xl transition-all duration-300 group overflow-hidden"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 transform rotate-45 translate-x-6 -translate-y-6 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-8">
                  <div className="flex gap-x-1 text-yellow-400 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 flex-none drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-900">
                    <p className="text-lg leading-8 font-medium">"{testimonial.content}"</p>
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center ring-2 ring-white shadow-sm">
                      <span className="text-base font-bold text-primary-700">
                        {testimonial.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">{testimonial.author}</div>
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
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 px-6 py-24 shadow-2xl sm:px-24 xl:py-32">
        {/* Background patterns */}
        <div className="absolute inset-0 -z-10">
          <svg className="absolute inset-0 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
            <defs>
              <pattern id="grid" width={64} height={64} patternUnits="userSpaceOnUse">
                <path d="M64 0H0v64h64z" fill="none" strokeWidth={1} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6" aria-hidden="true">
            <div
              className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary-400 to-primary-600 opacity-30"
              style={{
                clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
        </div>
        
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to transform your contract management?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-primary-100">
            Join hundreds of UK SMEs saving time and money with Pactoria. 
            Start your free 14-day trial today – no credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button size="lg" variant="secondary" className="bg-white text-primary-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                {user ? (
                  <>
                    <HomeIcon className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
            </Link>
            {!user && (
              <Link to="/login" className="text-lg font-semibold leading-6 text-white hover:text-primary-200 transition-colors duration-200">
                Book a Demo <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-4">
                <LightBulbIcon className="h-6 w-6 text-primary-200" />
              </div>
              <p className="text-sm text-primary-100 font-medium">UK Innovator Visa Endorsed</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-4">
                <ScaleIcon className="h-6 w-6 text-primary-200" />
              </div>
              <p className="text-sm text-primary-100 font-medium">GDPR Compliant</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-primary-200" />
              </div>
              <p className="text-sm text-primary-100 font-medium">ISO 27001 Certified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/pactoria-logo-128.png"
                  srcSet="/pactoria-logo-64.png 1x, /pactoria-logo-128.png 2x, /pactoria-logo-256.png 3x"
                  alt="Pactoria - UK Contract Management"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain pactoria-logo"
                  loading="lazy"
                  width="48"
                  height="48"
                />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">Pactoria</span>
              </div>
              <p className="text-base text-gray-600 mb-6 max-w-md">
                AI-powered contract management platform built specifically for UK SMEs. 
                Streamline your legal processes and ensure compliance with confidence.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-primary-500 transition-colors duration-200" aria-label="Follow us on Twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-primary-500 transition-colors duration-200" aria-label="Follow us on LinkedIn">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">Features</button></li>
                <li><button onClick={() => scrollToSection('use-cases')} className="text-gray-600 hover:text-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">Use Cases</button></li>
                <li><Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">Pricing</Link></li>
                <li><button onClick={() => scrollToSection('testimonials')} className="text-gray-600 hover:text-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">Reviews</button></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">Terms of Service</a></li>
                <li><a href="#" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                &copy; 2025 Pactoria Ltd. All rights reserved. Company Number: 12345678. VAT: GB123456789.
              </p>
              <div className="mt-4 md:mt-0 flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-1 text-green-600" />
                  GDPR Compliant
                </span>
                <span className="flex items-center">
                  <LightBulbIcon className="h-4 w-4 mr-1 text-yellow-600" />
                  UK Innovation Visa
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}