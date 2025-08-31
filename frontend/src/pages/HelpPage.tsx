import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { textColors } from '../utils/typography';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: { title: string; description: string; link: string }[];
}

const helpSections: HelpSection[] = [
  {
    id: 'contracts',
    title: 'Contract Management',
    description: 'Learn how to create, manage, and track your contracts',
    icon: DocumentTextIcon,
    articles: [
      {
        title: 'Creating Your First Contract',
        description: 'Step-by-step guide to using our 3-step contract wizard',
        link: '#creating-contracts'
      },
      {
        title: 'Understanding UK Legal Templates',
        description: 'Overview of our 20+ UK-compliant contract templates',
        link: '#legal-templates'
      },
      {
        title: 'Contract Status and Workflow',
        description: 'Managing contract lifecycle from draft to signed',
        link: '#contract-workflow'
      },
      {
        title: 'Version Control and History',
        description: 'How to track changes and manage contract versions',
        link: '#version-control'
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Legal Compliance',
    description: 'Understanding our AI-powered compliance system',
    icon: ShieldCheckIcon,
    articles: [
      {
        title: 'UK Legal Compliance Scoring',
        description: 'How our system evaluates GDPR, employment law, and commercial terms',
        link: '#compliance-scoring'
      },
      {
        title: 'Compliance Issues and Recommendations',
        description: 'Understanding and resolving compliance warnings',
        link: '#compliance-issues'
      },
      {
        title: 'Industry-Specific Requirements',
        description: 'Compliance considerations for different UK business sectors',
        link: '#industry-compliance'
      }
    ]
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'AI-powered risk analysis and recommendations',
    icon: ChartBarIcon,
    articles: [
      {
        title: 'Understanding Risk Scores (1-10)',
        description: 'How our AI calculates and presents contract risks',
        link: '#risk-scoring'
      },
      {
        title: 'Risk Factors and Mitigation',
        description: 'Common risk factors and how to address them',
        link: '#risk-mitigation'
      },
      {
        title: 'AI Recommendations',
        description: 'Making the most of our intelligent suggestions',
        link: '#ai-recommendations'
      }
    ]
  },
  {
    id: 'team',
    title: 'Team Management',
    description: 'Collaborate with your team members',
    icon: UserGroupIcon,
    articles: [
      {
        title: 'Inviting Team Members',
        description: 'Adding users to your Pactoria workspace',
        link: '#team-invites'
      },
      {
        title: 'User Roles and Permissions',
        description: 'Understanding Admin, Editor, and Viewer permissions',
        link: '#user-roles'
      },
      {
        title: 'Account Limits (5 Users)',
        description: 'Managing your Professional plan user limit',
        link: '#account-limits'
      }
    ]
  }
];

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create my first contract?',
    answer: 'Use our 3-step contract wizard: 1) Select a UK legal template, 2) Fill in your contract details, 3) Review and generate. Our AI will automatically check compliance and assess risks.',
    category: 'Getting Started'
  },
  {
    id: '2',
    question: 'What makes Pactoria contracts UK-compliant?',
    answer: 'All our templates are built with UK legal requirements in mind, including GDPR compliance, employment law, commercial terms, and consumer rights. Our AI continuously monitors for compliance issues.',
    category: 'Legal Compliance'
  },
  {
    id: '3',
    question: 'How does the risk assessment work?',
    answer: 'Our AI analyzes contracts using a 1-10 scale, considering factors like payment terms, scope clarity, party reputation, and delivery timelines. You receive specific recommendations for each identified risk.',
    category: 'Risk Assessment'
  },
  {
    id: '4',
    question: 'Can I collaborate with my team?',
    answer: 'Yes! Invite up to 5 team members with different permission levels. Admins have full access, Editors can create and modify contracts, and Viewers have read-only access.',
    category: 'Team Features'
  },
  {
    id: '5',
    question: 'What export formats are available?',
    answer: 'You can export contracts in PDF (for sharing), Word (for editing), or plain text format. All exports maintain formatting and include compliance scores and risk assessments.',
    category: 'Export & Sharing'
  },
  {
    id: '6',
    question: 'How do I track contract deadlines?',
    answer: 'Pactoria automatically identifies key dates and creates deadline reminders for renewals, reviews, payments, and terminations. View all upcoming deadlines in your dashboard.',
    category: 'Contract Management'
  }
];


export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-secondary-950">
      {/* Header */}
      <div className="bg-white dark:bg-secondary-900 border-b border-neutral-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${textColors.primary}`}>Help & Documentation</h1>
              <p className={`mt-2 ${textColors.secondary}`}>
                Find answers and learn how to make the most of Pactoria
              </p>
            </div>
            <Link
              to="/dashboard"
              className="btn-secondary"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className={`h-5 w-5 ${textColors.subtle}`} />
            </div>
            <input
              type="text"
              className={`block w-full pl-10 pr-3 py-3 border border-neutral-300 dark:border-secondary-600 rounded-lg leading-5 bg-white dark:bg-secondary-800 ${textColors.placeholder} ${textColors.primary} focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
              placeholder="Search help articles and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white mb-8">
              <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/contracts/new"
                  className="flex items-center p-3 bg-white dark:bg-secondary-800 bg-opacity-20 dark:bg-opacity-20 rounded-lg hover:bg-opacity-30 dark:hover:bg-opacity-30 transition-colors"
                >
                  <DocumentTextIcon className="h-6 w-6 mr-3" />
                  <span className="font-medium">Create Contract</span>
                </Link>
                <div className="flex items-center p-3 bg-white dark:bg-secondary-800 bg-opacity-20 dark:bg-opacity-20 rounded-lg">
                  <VideoCameraIcon className="h-6 w-6 mr-3" />
                  <span className="font-medium">Watch Tutorial</span>
                </div>
                <div className="flex items-center p-3 bg-white dark:bg-secondary-800 bg-opacity-20 dark:bg-opacity-20 rounded-lg">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3" />
                  <span className="font-medium">Contact Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Sections */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <h2 className={`text-2xl font-bold ${textColors.primary}`}>Help Topics</h2>
              
              {helpSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <div key={section.id} className="bg-white dark:bg-secondary-900 rounded-lg border border-neutral-200 dark:border-secondary-700 p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-8 w-8 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                        <p className="text-gray-600 mb-4">{section.description}</p>
                        <div className="space-y-2">
                          {section.articles.map((article, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <a href={article.link} className="text-primary-600 hover:text-primary-800 font-medium">
                                {article.title}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQs Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white dark:bg-secondary-900 rounded-lg border border-neutral-200 dark:border-secondary-700 p-6">
                <h2 className={`text-xl font-semibold ${textColors.primary} mb-4`}>Frequently Asked Questions</h2>
                
                {/* Category Filter */}
                <div className="mb-6">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`block w-full rounded-lg border-neutral-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 ${textColors.primary} shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm`}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg">
                      <button
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
                        onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                      >
                        <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                        {openFAQ === faq.id ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      {openFAQ === faq.id && (
                        <div className="px-4 pb-3">
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                            {faq.category}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredFAQs.length === 0 && (
                  <div className="text-center py-6">
                    <QuestionMarkCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No FAQs found matching your search.
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Support */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Still need help?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <button className="btn-primary w-full text-sm">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}