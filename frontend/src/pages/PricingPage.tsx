import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CurrencyPoundIcon,
  ClockIcon,
  ChartBarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui';
import Card, { CardContent, CardTitle } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';
import { textColors, textStyles, typography } from '../utils/typography';

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
      {/* Header */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50/30 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-950">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-10 sm:mt-16 lg:mt-0">
              <div className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 mb-6 ring-1 ring-primary-200 dark:ring-primary-800/50">
                <CurrencyPoundIcon className="h-4 w-4 mr-2" />
                Transparent Pricing
              </div>
              <h1 className={`${typography.display.large} font-bold tracking-tight text-secondary-900 dark:text-secondary-100`}>
                Simple, predictable pricing for UK businesses
              </h1>
              <p className={`mt-6 ${typography.body.large} leading-8 text-secondary-600 dark:text-secondary-400`}>
                Choose the plan that fits your business size and contract volume. 
                All plans include UK legal compliance, unlimited exports, and 14-day free trial.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link to={user ? "/dashboard" : "/login"}>
                  <Button size="lg" className="px-8">
                    Start Free Trial
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login" className={`${typography.body.large} font-semibold leading-6 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400`}>
                  Sign in <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                  alt="UK business professional reviewing contracts on laptop"
                  className="aspect-[6/5] w-full rounded-2xl bg-secondary-50 object-cover shadow-2xl ring-1 ring-secondary-900/10 dark:ring-secondary-700/50"
                  width={2432}
                  height={1442}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className={`${typography.heading.h2} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 mb-6`}>
            Choose your plan
          </h2>
          <p className={`${typography.body.large} leading-8 text-secondary-600 dark:text-secondary-400 mb-12`}>
            All plans include a 14-day free trial with full access to features. No credit card required.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-16">
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
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
      <div className="bg-gradient-to-b from-secondary-50/50 to-white dark:from-secondary-950/50 dark:to-secondary-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
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
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className={`${typography.heading.h2} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 mb-6`}>
            Frequently asked questions
          </h2>
        </div>
        
        <div className="mx-auto max-w-4xl">
          <div className="space-y-8">
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
              <Card key={index} variant="bordered" className="p-6">
                <h3 className={`${typography.body.large} font-semibold text-secondary-900 dark:text-secondary-100 mb-3`}>
                  {faq.question}
                </h3>
                <p className={`${typography.body.medium} text-secondary-600 dark:text-secondary-400`}>
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`${typography.display.medium} font-bold tracking-tight text-white mb-6`}>
              Ready to transform your contract management?
            </h2>
            <p className={`${typography.body.large} leading-8 text-white/90 mb-10`}>
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
  );
}