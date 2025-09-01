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
import Card, { CardContent, CardTitle } from '../components/ui/Card';
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
    colorScheme: 'primary',
    bgGradient: 'from-primary-50 to-primary-100',
    iconBg: 'bg-gradient-to-br from-primary-600 to-primary-700',
  },
  {
    name: 'UK Legal Compliance',
    description: 'Built-in GDPR, employment law, and consumer rights validation for every contract.',
    icon: ShieldCheckIcon,
    colorScheme: 'success',
    bgGradient: 'from-success-50 to-success-100',
    iconBg: 'bg-gradient-to-br from-success-600 to-success-700',
  },
  {
    name: 'Risk Assessment',
    description: 'Intelligent 1-10 scale risk scoring with actionable recommendations.',
    icon: ChartBarIcon,
    colorScheme: 'warning',
    bgGradient: 'from-warning-50 to-warning-100',
    iconBg: 'bg-gradient-to-br from-warning-600 to-warning-700',
  },
  {
    name: 'Smart Templates',
    description: '20+ UK-specific legal templates for every business need.',
    icon: DocumentTextIcon,
    colorScheme: 'primary',
    bgGradient: 'from-primary-50 to-primary-100',
    iconBg: 'bg-gradient-to-br from-primary-500 to-primary-600',
  },
  {
    name: 'Version Control',
    description: 'Complete audit trail and version history for compliance and transparency.',
    icon: ClockIcon,
    colorScheme: 'secondary',
    bgGradient: 'from-secondary-50 to-secondary-100',
    iconBg: 'bg-gradient-to-br from-secondary-600 to-secondary-700',
  },
  {
    name: 'Team Collaboration',
    description: 'Secure workspace for up to 5 team members with role-based permissions.',
    icon: UserGroupIcon,
    colorScheme: 'primary',
    bgGradient: 'from-primary-50 to-primary-100',
    iconBg: 'bg-gradient-to-br from-primary-700 to-primary-800',
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
    <div className="bg-white dark:bg-secondary-950 transition-colors duration-300" role="main">
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
                <span className={`${typography.heading.h3} sm:${typography.heading.h2} font-bold transition-colors text-primary-600 group-hover:text-primary-700`}>Pactoria</span>
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
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20`}
              aria-label="Navigate to Features section"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('use-cases')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToSection('use-cases'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20`}
              aria-label="Navigate to Use Cases section"
            >
              Use Cases
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToSection('testimonials'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 ${textColors.secondary} ${textStyles.link} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20`}
              aria-label="Navigate to Testimonials section"
            >
              Testimonials
            </button>
            <Link to="/login" className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 ${textStyles.link} rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20`}>
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
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50/30 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-950">
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
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-primary-700 bg-primary-100 mb-6 sm:mb-8 ring-1 ring-primary-200 animate-fade-in shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                  <BoltIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-pulse" />
                  <span className="hidden sm:inline">AI-Powered • UK-Compliant • SME-Focused</span>
                  <span className="sm:hidden">AI-Powered • UK-Compliant</span>
                </div>
                
                <h1 className={`${typography.display.large} font-bold tracking-tight ${textColors.primary} leading-tight`}>
                  UK Contract Management
                  <span className="bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 bg-clip-text text-transparent animate-pulse"> Made Simple</span>
                </h1>
                
                <p className={`mt-6 sm:mt-8 ${typography.body.large} leading-8 sm:leading-9 ${textColors.secondary} max-w-2xl`}>
                  Generate legally binding, UK-compliant contracts in seconds. 
                  Save <span className="font-semibold text-success-600">£8,000+ annually</span> on legal fees while ensuring <span className="font-semibold text-primary-600">95% compliance accuracy</span> 
                  with our AI-powered platform built specifically for UK SMEs.
                </p>
                
                <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-x-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <Link to={user ? "/dashboard" : "/login"} className="w-full sm:w-auto">
                    <Button size="lg" className="px-8 py-4 w-full sm:w-auto text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                      {user ? (
                        <>
                          <HomeIcon className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                          Go to Dashboard
                        </>
                      ) : (
                        <>
                          Start Free Trial
                          <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </>
                      )}
                    </Button>
                  </Link>
                  {!user && (
                    <Link to="/login" className={`${typography.body.large} font-semibold leading-6 ${textStyles.linkMuted} transition-all duration-200 flex items-center justify-center sm:justify-start group hover:scale-105`}>
                      View Demo <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                  )}
                </div>

                {!user && (
                  <div className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-x-8 ${typography.body.small} ${textColors.secondary} animate-fade-in`} style={{ animationDelay: '500ms' }}>
                    {[
                      'No credit card required',
                      '14-day free trial', 
                      'Cancel anytime'
                    ].map((text, index) => (
                      <div key={text} className="flex items-center animate-fade-in" style={{ animationDelay: `${600 + index * 100}ms` }}>
                        <CheckCircleIcon className="h-5 w-5 text-success-600 mr-2 flex-shrink-0" />
                        {text}
                      </div>
                    ))}
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
            <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-primary-700 bg-primary-100 mb-4 ring-1 ring-primary-200">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Trusted by hundreds of UK SMEs
            </div>
            <h2 className={`${typography.heading.h2} font-bold ${textColors.primary}`}>Proven results that speak for themselves</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:gap-8 text-center lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card
                key={stat.id}
                variant="elevated"
                padding="lg"
                hover
                className="group animate-fade-in hover:scale-[1.02] transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="text-center">
                  <dd className={`${typography.display.small} font-bold tracking-tight text-primary-600 mb-3 group-hover:text-primary-700 transition-colors duration-300`}>
                    {stat.value}
                  </dd>
                  <dt className={`${typography.body.small} ${textColors.secondary} font-medium group-hover:${textColors.primary} transition-colors duration-300`}>
                    {stat.name}
                  </dt>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="bg-gradient-to-b from-secondary-50/50 via-secondary-50/30 to-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-danger-700 bg-danger-100 mb-6 ring-1 ring-danger-200">
              <ScaleIcon className="h-4 w-4 mr-2" />
              The Challenge
            </div>
            <h2 className={`${typography.display.medium} font-bold tracking-tight ${textColors.primary} mb-6`}>
              UK SMEs waste 
              <span className="bg-gradient-to-r from-danger-600 to-danger-700 bg-clip-text text-transparent">£12,000+ annually</span>
              <br />on contract management
            </h2>
            <p className={`${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              Traditional legal services are expensive, slow, and complex. Most contract software 
              isn't built for UK law. SMEs risk non-compliance, costly disputes, and missed opportunities.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-success-700 bg-success-100 mb-6 ring-1 ring-success-200">
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Our Solution
              </div>
              <h3 className={`${typography.heading.h2} font-bold ${textColors.primary} mb-4`}>Transform your contract management with measurable results</h3>
            </div>
            <div className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3 mx-auto">
              {benefits.map((benefit, index) => (
                <Card
                  key={benefit.title}
                  variant="elevated"
                  padding="lg"
                  hover
                  className="group animate-fade-in hover:scale-[1.02] transition-all duration-300"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <CardContent>
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl mb-6 group-hover:from-primary-200 group-hover:to-primary-300 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                      <benefit.icon className="h-7 w-7 text-primary-600" aria-hidden="true" />
                    </div>
                    <CardTitle className={`${textStyles.cardTitle} mb-4 group-hover:${textColors.interactive} transition-colors duration-300`}>
                      {benefit.title}
                    </CardTitle>
                    <p className={`${typography.body.medium} ${textColors.secondary} leading-relaxed group-hover:${textColors.primary} transition-colors duration-300`}>
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 sm:py-32 bg-gradient-to-b from-white via-secondary-50/30 to-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 mb-6 ring-1 ring-primary-200">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Everything you need
            </div>
            <h2 className={`${typography.display.medium} font-bold tracking-tight ${textColors.primary} mb-6`}>
              Enterprise-grade features for 
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">SME budgets</span>
            </h2>
            <p className={`${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              Built specifically for UK businesses, Pactoria combines cutting-edge AI with deep legal expertise 
              to deliver a contract management platform that actually works for you.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={feature.name}
                variant="elevated"
                padding="lg"
                hover
                interactive
                className={`group transition-all duration-300 hover:scale-[1.02] animate-fade-in bg-gradient-to-br ${feature.bgGradient} dark:from-secondary-900 dark:to-secondary-800 border-0 hover:shadow-strong`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="relative">
                  {/* Icon with enhanced styling */}
                  <div className="relative mb-6">
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 ring-1 ring-white/20`}>
                      <feature.icon className="h-7 w-7 text-white" aria-hidden="true" />
                    </div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 h-14 w-14 rounded-2xl ${feature.iconBg} opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-300`} />
                  </div>
                  
                  <CardTitle className={`${textStyles.cardTitle} mb-4 group-hover:${textColors.interactive} transition-colors duration-300`}>
                    {feature.name}
                  </CardTitle>
                  
                  <p className={`${typography.body.medium} ${textColors.secondary} leading-relaxed group-hover:${textColors.primary} transition-colors duration-300`}>
                    {feature.description}
                  </p>
                  
                  {/* Subtle accent line */}
                  <div className={`mt-6 h-1 w-12 rounded-full bg-gradient-to-r ${feature.iconBg} opacity-60 group-hover:opacity-100 group-hover:w-20 transition-all duration-300`} />
                  
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div id="use-cases" className="bg-gradient-to-br from-primary-50/30 via-primary-50/50 to-primary-100/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 mb-6 ring-1 ring-primary-200">
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Use Cases
            </div>
            <h2 className={`${typography.display.medium} font-bold tracking-tight ${textColors.primary} mb-6`}>
              One platform, 
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">endless possibilities</span>
            </h2>
            <p className={`${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              From employment contracts to supplier agreements, Pactoria handles every type of business contract with UK legal precision.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase, index) => (
              <Card
                key={useCase}
                variant="elevated"
                padding="md"
                hover
                className="group animate-fade-in hover:scale-[1.01] transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl mr-4 group-hover:from-primary-200 group-hover:to-primary-300 transition-all duration-300 shadow-sm group-hover:shadow-md">
                    <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className={`${typography.body.medium} font-medium ${textColors.primary} group-hover:${textColors.interactive} transition-colors duration-300`}>
                    {useCase}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="bg-gradient-to-b from-white via-secondary-50/20 to-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 mb-6 ring-1 ring-primary-200">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              Customer Stories
            </div>
            <h2 className={`${typography.display.medium} font-bold tracking-tight ${textColors.primary} mb-6`}>
              Trusted by UK's 
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">fastest-growing SMEs</span>
            </h2>
            <p className={`${typography.body.large} leading-8 ${textColors.secondary} max-w-3xl mx-auto`}>
              See how businesses like yours are transforming their contract management and saving thousands of pounds annually.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.author} 
                variant="elevated"
                padding="lg"
                hover
                className="group overflow-hidden animate-fade-in hover:scale-[1.02] transition-all duration-300"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <CardContent className="relative">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 transform rotate-45 translate-x-6 -translate-y-6 opacity-60 group-hover:opacity-100 transition-opacity duration-300 dark:from-primary-900 dark:to-primary-800" />
                  
                  <div className="relative">
                    <div className="flex gap-x-1 text-warning-400 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="h-5 w-5 flex-none drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                        </svg>
                      ))}
                    </div>
                    <blockquote className={textColors.primary}>
                      <p className={`${typography.body.large} leading-8 font-medium`}>"{testimonial.content}"</p>
                    </blockquote>
                    <figcaption className="mt-8 flex items-center gap-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center ring-2 ring-white shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <span className={`${typography.body.medium} font-bold text-primary-700`}>
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className={`${typography.body.medium} font-semibold ${textColors.primary}`}>{testimonial.author}</div>
                        <div className={`${typography.body.small} ${textColors.secondary}`}>{testimonial.role} • {testimonial.company}</div>
                      </div>
                    </figcaption>
                  </div>
                </CardContent>
              </Card>
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
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-200 bg-primary-800/50 mb-8 ring-1 ring-primary-700/50 backdrop-blur-sm">
            <BoltIcon className="h-4 w-4 mr-2" />
            Transform Your Business Today
          </div>
          <h2 className={`${typography.display.medium} font-bold tracking-tight text-white mb-6`}>
            Ready to transform your 
            <span className="bg-gradient-to-r from-primary-200 to-white bg-clip-text text-transparent">contract management?</span>
          </h2>
          <p className={`mx-auto max-w-2xl ${typography.body.large} leading-8 text-primary-100 mb-10`}>
            Join hundreds of UK SMEs saving time and money with Pactoria. 
            Start your <span className="font-semibold text-white">free 14-day trial</span> today – no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button size="lg" variant="secondary" className="bg-white text-primary-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                {user ? (
                  <>
                    <HomeIcon className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </Link>
            {!user && (
              <Link to="/login" className={`${typography.body.large} font-semibold leading-6 text-white hover:text-primary-200 transition-colors duration-200 flex items-center group`}>
                Book a Demo 
                <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: LightBulbIcon, title: 'UK Innovator Visa Endorsed' },
              { icon: ScaleIcon, title: 'GDPR Compliant' },
              { icon: ShieldCheckIcon, title: 'ISO 27001 Certified' }
            ].map((item, index) => (
              <Card
                key={item.title}
                variant="glass"
                padding="md"
                className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-3 group-hover:bg-white/30 transition-colors duration-300">
                    <item.icon className="h-6 w-6 text-primary-200" />
                  </div>
                  <p className={`${typography.body.small} text-primary-100 font-medium`}>{item.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-t border-secondary-200">
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
                <span className={`${typography.heading.h3} sm:${typography.heading.h2} font-bold ${textColors.primary}`}>Pactoria</span>
              </div>
              <p className={`${typography.body.medium} ${textColors.secondary} mb-6 max-w-md`}>
                AI-powered contract management platform built specifically for UK SMEs. 
                Streamline your legal processes and ensure compliance with confidence.
              </p>
              <div className="flex space-x-6">
                <a href="#" className={`${textColors.muted} hover:${textColors.interactive} transition-colors duration-200`} aria-label="Follow us on Twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className={`${textColors.muted} hover:${textColors.interactive} transition-colors duration-200`} aria-label="Follow us on LinkedIn">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className={`${typography.label.medium} font-semibold ${textColors.primary} uppercase tracking-wider mb-4`}>Product</h3>
              <ul className="space-y-3">
                <li><button onClick={() => scrollToSection('features')} className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-2 py-1`}>Features</button></li>
                <li><button onClick={() => scrollToSection('use-cases')} className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-2 py-1`}>Use Cases</button></li>
                <li><Link to="/login" className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-2 py-1`}>Pricing</Link></li>
                <li><button onClick={() => scrollToSection('testimonials')} className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-2 py-1`}>Reviews</button></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className={`${typography.label.medium} font-semibold ${textColors.primary} uppercase tracking-wider mb-4`}>Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200`}>About</a></li>
                <li><a href="#" className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200`}>Privacy Policy</a></li>
                <li><a href="#" className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200`}>Terms of Service</a></li>
                <li><a href="#" className={`${typography.body.small} ${textColors.secondary} hover:${textColors.interactive} transition-colors duration-200`}>Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-secondary-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className={`${typography.body.small} ${textColors.muted}`}>
                &copy; 2025 Pactoria Ltd. All rights reserved. Company Number: 12345678. VAT: GB123456789.
              </p>
              <div className="mt-4 md:mt-0 flex items-center space-x-6">
                <span className={`${typography.body.small} ${textColors.muted} flex items-center`}>
                  <ShieldCheckIcon className="h-4 w-4 mr-1 text-success-600" />
                  GDPR Compliant
                </span>
                <span className={`${typography.body.small} ${textColors.muted} flex items-center`}>
                  <LightBulbIcon className="h-4 w-4 mr-1 text-warning-600" />
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