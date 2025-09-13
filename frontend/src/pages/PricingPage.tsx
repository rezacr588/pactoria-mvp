import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CurrencyPoundIcon,
  ChartBarIcon,
  LightBulbIcon,
  Bars3Icon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { 
  Button, 
  HeroSection, 
  HeroBadge, 
  HeroActions, 
  HeroTrustIndicators, 
  HeroImage 
} from '../components/ui';
import Card, { CardContent } from '../components/ui/Card';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { typography } from '../utils/typography';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  features: {
    included: string[];
    excluded?: string[];
  };
  maxContracts: string;
  maxUsers: number;
  aiGeneration: string;
  support: string;
  compliance: boolean;
  customTemplates: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses just getting started',
    monthlyPrice: 29,
    yearlyPrice: 290,
    maxContracts: '50',
    maxUsers: 2,
    aiGeneration: '20 per month',
    support: 'Email',
    compliance: true,
    customTemplates: false,
    apiAccess: false,
    advancedAnalytics: false,
    features: {
      included: [
        'Up to 50 contracts per month',
        'Up to 2 team members',
        '20 AI contract generations',
        'UK legal compliance checking',
        'Standard contract templates',
        'Email support',
        'Basic analytics',
        'Document export (PDF/Word)',
      ],
      excluded: [
        'Custom templates',
        'API access',
        'Advanced analytics',
        'Priority support',
      ]
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing SMEs with regular contract needs',
    monthlyPrice: 79,
    yearlyPrice: 790,
    popular: true,
    maxContracts: '200',
    maxUsers: 5,
    aiGeneration: '100 per month',
    support: 'Priority email & phone',
    compliance: true,
    customTemplates: true,
    apiAccess: true,
    advancedAnalytics: true,
    features: {
      included: [
        'Up to 200 contracts per month',
        'Up to 5 team members',
        '100 AI contract generations',
        'UK legal compliance checking',
        'All standard templates + custom templates',
        'Priority email & phone support',
        'Advanced analytics & reporting',
        'Document export (PDF/Word)',
        'API access',
        'Workflow automation',
        'Contract collaboration tools',
      ],
      excluded: [
        'White-label solution',
        'Dedicated account manager',
      ]
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Comprehensive solution for larger organizations',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    maxContracts: 'Unlimited',
    maxUsers: 25,
    aiGeneration: 'Unlimited',
    support: 'Dedicated account manager',
    compliance: true,
    customTemplates: true,
    apiAccess: true,
    advancedAnalytics: true,
    features: {
      included: [
        'Unlimited contracts',
        'Up to 25 team members',
        'Unlimited AI contract generations',
        'UK legal compliance checking',
        'All templates + unlimited custom templates',
        'Dedicated account manager',
        'Advanced analytics & reporting',
        'Document export (PDF/Word)',
        'Full API access',
        'Advanced workflow automation',
        'Contract collaboration tools',
        'White-label solution',
        'Single Sign-On (SSO)',
        'Custom integrations',
        'Training & onboarding',
      ],
    }
  }
];

const features = [
  {
    name: 'Save Time & Money',
    description: 'Reduce legal fees by up to 80% and save 6+ hours weekly',
    icon: CurrencyPoundIcon,
  },
  {
    name: 'UK Legal Compliance',
    description: 'Built-in GDPR, employment law, and consumer rights validation',
    icon: ShieldCheckIcon,
  },
  {
    name: 'AI-Powered Generation',
    description: 'Transform plain English into legal contracts in seconds',
    icon: SparklesIcon,
  },
  {
    name: 'Advanced Analytics',
    description: 'Track contract performance and identify risks',
    icon: ChartBarIcon,
  },
];

export default function PricingPage() {
  const { user } = useAuthStore();
  const [isYearly, setIsYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle smooth scrolling to landing page sections
  const scrollToLandingSection = (sectionId: string) => {
    // Navigate to landing page with section anchor
    window.location.href = `/#${sectionId}`;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const getPrice = (tier: PricingTier) => {
    return isYearly ? tier.yearlyPrice : tier.monthlyPrice;
  };

  const getSavings = (tier: PricingTier) => {
    const monthlyCost = tier.monthlyPrice * 12;
    const yearlyCost = tier.yearlyPrice;
    return monthlyCost - yearlyCost;
  };

  return (
    <div className="bg-white dark:bg-secondary-950 min-h-screen">
      {/* Navbar */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md border-b border-neutral-200/50 dark:border-secondary-700/50 shadow-sm dark:shadow-secondary-950/20' 
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
                <span className={`${typography.heading.h3} sm:${typography.heading.h2} font-bold transition-colors text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300`}>Pactoria</span>
              </div>
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-secondary-700 dark:text-secondary-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open main navigation menu"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-8">
            <button
              onClick={() => scrollToLandingSection('features')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToLandingSection('features'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px] flex items-center`}
              aria-label="Navigate to Features section"
            >
              Features
            </button>
            <button
              onClick={() => scrollToLandingSection('use-cases')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToLandingSection('use-cases'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px] flex items-center`}
              aria-label="Navigate to Use Cases section"
            >
              Use Cases
            </button>
            <button
              onClick={() => scrollToLandingSection('testimonials')}
              onKeyDown={(e) => handleKeyDown(e, () => scrollToLandingSection('testimonials'))}
              className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px] flex items-center`}
              aria-label="Navigate to Testimonials section"
            >
              Testimonials
            </button>
            <Link to="/pricing" className={`${typography.body.medium} font-semibold leading-6 transition-all duration-200 text-primary-600 dark:text-primary-400 font-bold focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px] flex items-center`}>
              Pricing
            </Link>
            {user && (
              <Link to="/dashboard" className={`${typography.body.medium} font-semibold leading-6 transition-colors text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 min-h-[44px]`}>
                <HomeIcon className="h-4 w-4" />
                Back to App
              </Link>
            )}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 lg:items-center">
            {/* Theme Toggle */}
            <ThemeToggle size="sm" variant="button" />
            
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="px-4">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className={`${typography.body.medium} font-semibold leading-6 transition-colors text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 min-h-[44px] flex items-center`}>
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
            <div 
              className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40" 
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white dark:bg-secondary-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-secondary-900/10 dark:sm:ring-secondary-700/50">
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
                    <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">Pactoria</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-secondary-200 dark:divide-secondary-700">
                  <div className="space-y-2 py-6">
                    <button
                      onClick={() => {
                        scrollToLandingSection('features');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-secondary-900 min-h-[44px] flex items-center transition-colors duration-200"
                      aria-label="Navigate to Features section"
                    >
                      Features
                    </button>
                    <button
                      onClick={() => {
                        scrollToLandingSection('use-cases');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-secondary-900 min-h-[44px] flex items-center transition-colors duration-200"
                      aria-label="Navigate to Use Cases section"
                    >
                      Use Cases
                    </button>
                    <button
                      onClick={() => {
                        scrollToLandingSection('testimonials');
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-secondary-900 min-h-[44px] flex items-center transition-colors duration-200"
                      aria-label="Navigate to Testimonials section"
                    >
                      Testimonials
                    </button>
                    <Link
                      to="/pricing"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-primary-600 dark:text-primary-400 font-bold hover:bg-secondary-50 dark:hover:bg-secondary-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] flex items-center transition-colors duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    {user && (
                      <Link
                        to="/dashboard"
                        className="-mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] transition-colors duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <HomeIcon className="h-5 w-5" />
                        Back to App
                      </Link>
                    )}
                  </div>
                  <div className="py-6 space-y-2">
                    {/* Theme Toggle for Mobile */}
                    <div className="px-3">
                      <ThemeToggle size="sm" variant="button" />
                    </div>
                    {user ? (
                      <Link
                        to="/dashboard"
                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 min-h-[44px] flex items-center transition-colors duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <HomeIcon className="h-5 w-5 mr-2" />
                        Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800 min-h-[44px] flex items-center transition-colors duration-200"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/login"
                          className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 bg-primary-600 text-white hover:bg-primary-700 min-h-[44px] flex items-center transition-colors duration-200"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Start Free Trial
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

      {/* Main Content - Add top padding to account for fixed header */}
      <div className="pt-20">
      {/* Hero Section */}
      <HeroSection
        badge={
          <HeroBadge 
            icon={CurrencyPoundIcon}
            mobileText="Transparent Pricing"
          >
            Transparent Pricing • UK-Compliant • 14-Day Trial
          </HeroBadge>
        }
        title={
          <>
            Simple, predictable pricing
            <span className="text-primary-600 dark:text-primary-400 font-extrabold"> for UK businesses</span>
          </>
        }
        description={
          <>
            Choose the plan that fits your business size and contract volume. 
            All plans include <span className="font-semibold text-success-600 dark:text-success-400">UK legal compliance</span>, 
            unlimited exports, and <span className="font-semibold text-primary-600 dark:text-primary-400">14-day free trial</span>.
          </>
        }
        actions={
          <HeroActions 
            user={user}
            primaryButtonText="Start Free Trial"
            secondaryButtonText="Sign In"
          />
        }
        trustIndicators={
          !user ? <HeroTrustIndicators /> : undefined
        }
        image={
          <HeroImage
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80"
            alt="Professional pricing dashboard showing transparent plans and features for UK contract management software"
          />
        }
        showTrustIndicators={!user}
      />

      {/* Pricing Toggle */}
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className={`${typography.heading.h2} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 mb-6`}>
            Choose your plan
          </h2>
          <p className={`${typography.body.large} leading-8 text-secondary-600 dark:text-secondary-400 mb-10`}>
            All plans include a 14-day free trial with full access to features. No credit card required.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex rounded-lg bg-secondary-100 dark:bg-secondary-800 p-1">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  !isYearly
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center ${
                  isYearly
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-1 text-xs bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded-full">
                  Save up to £240
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.id}
                variant={tier.popular ? "elevated" : "bordered"}
                className={`relative overflow-hidden ${
                  tier.popular 
                    ? 'ring-2 ring-primary-500 dark:ring-primary-400 scale-105' 
                    : 'hover:shadow-lg'
                } transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="inline-flex items-center rounded-full bg-primary-600 px-4 py-1 text-sm font-medium text-white shadow-lg">
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardContent className="p-8">
                  <div className="text-center">
                    <h3 className={`${typography.heading.h3} font-bold text-secondary-900 dark:text-secondary-100 mb-2`}>
                      {tier.name}
                    </h3>
                    <p className={`${typography.body.medium} text-secondary-600 dark:text-secondary-400 mb-6`}>
                      {tier.description}
                    </p>
                    
                    <div className="mb-6">
                      <span className={`${typography.display.small} font-bold text-secondary-900 dark:text-secondary-100`}>
                        £{getPrice(tier)}
                      </span>
                      <span className={`${typography.body.medium} text-secondary-600 dark:text-secondary-400 ml-1`}>
                        /{isYearly ? 'year' : 'month'}
                      </span>
                      {isYearly && (
                        <div className={`${typography.body.small} text-success-600 dark:text-success-400 mt-1`}>
                          Save £{getSavings(tier)} per year
                        </div>
                      )}
                    </div>

                    <Link to={user ? "/dashboard" : "/login"}>
                      <Button
                        size="lg"
                        variant={tier.popular ? "primary" : "ghost"}
                        fullWidth
                        className="mb-8"
                      >
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
                      <h4 className={`${typography.body.medium} font-semibold text-secondary-900 dark:text-secondary-100 mb-4`}>
                        Everything in {tier.name}:
                      </h4>
                      <ul className="space-y-3">
                        {tier.features.included.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-success-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className={`${typography.body.small} text-secondary-600 dark:text-secondary-400`}>
                              {feature}
                            </span>
                          </li>
                        ))}
                        {tier.features.excluded?.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <XMarkIcon className="h-5 w-5 text-secondary-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span className={`${typography.body.small} text-secondary-400 line-through`}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-secondary-50/50 to-white dark:from-secondary-950/50 dark:to-secondary-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-12">
            <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 mb-6 ring-1 ring-primary-200 dark:ring-primary-800/50">
              <LightBulbIcon className="h-4 w-4 mr-2" />
              Value Proposition
            </div>
            <h2 className={`${typography.display.medium} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 mb-6`}>
              Why Pactoria delivers exceptional value
            </h2>
            <p className={`${typography.body.large} leading-8 text-secondary-600 dark:text-secondary-400`}>
              Compare our pricing to traditional legal services and see the dramatic cost savings for your business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {features.map((feature) => (
              <Card key={feature.name} variant="elevated" hover className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
                    <feature.icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className={`${typography.body.large} font-semibold text-secondary-900 dark:text-secondary-100 mb-2`}>
                    {feature.name}
                  </h3>
                  <p className={`${typography.body.medium} text-secondary-600 dark:text-secondary-400`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-12">
          <h2 className={`${typography.heading.h2} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 mb-6`}>
            Frequently asked questions
          </h2>
        </div>
        
        <div className="mx-auto max-w-4xl">
          <div className="space-y-6">
            {[
              {
                question: "Do you offer a free trial?",
                answer: "Yes! All plans include a 14-day free trial with full access to features. No credit card required to start."
              },
              {
                question: "Can I change plans at any time?",
                answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
              },
              {
                question: "Is my data secure and compliant?",
                answer: "Yes. We're fully GDPR compliant, ISO 27001 certified, and use bank-level encryption. Your data is stored securely in UK data centers."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, MasterCard, American Express) and Direct Debit for UK customers. Enterprise customers can also pay by invoice."
              },
              {
                question: "Do you offer discounts for charities or non-profits?",
                answer: "Yes! We offer a 25% discount for registered UK charities and non-profit organizations. Contact our sales team for details."
              }
            ].map((faq, index) => (
              <Card key={index} variant="bordered" className="p-6 hover:shadow-md dark:hover:shadow-secondary-900/20 transition-shadow duration-200">
                <h3 className={`${typography.body.large} font-semibold text-secondary-900 dark:text-secondary-100 mb-3`}>
                  {faq.question}
                </h3>
                <p className={`${typography.body.medium} text-secondary-600 dark:text-secondary-400 leading-relaxed`}>
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`${typography.display.medium} font-bold tracking-tight text-white mb-6`}>
              Ready to transform your contract management?
            </h2>
            <p className={`${typography.body.large} leading-8 text-white/90 mb-8`}>
              Join hundreds of UK SMEs saving time and money with Pactoria. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={user ? "/dashboard" : "/login"}>
                <Button size="lg" variant="secondary" className="bg-white text-primary-700 hover:bg-secondary-50 px-8">
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className={`${typography.body.large} font-semibold leading-6 text-white hover:text-primary-200 transition-colors duration-200 flex items-center justify-center px-6 py-3`}>
                Sign In
                <ArrowRightIcon className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}