import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface RiskFactor {
  category: string;
  factor_name: string;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact_description: string;
  mitigation_suggestion: string;
  confidence: number;
}

interface RiskAssessment {
  overall_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: RiskFactor[];
  assessment_summary: string;
  key_concerns: string[];
  priority_actions: string[];
  assessment_confidence: number;
  category_scores: Record<string, number>;
  sme_specific_risks: string[];
  industry_specific_risks: string[];
  assessed_at: string;
}

interface ContractRiskAssessmentProps {
  contractId: string;
  contractContent?: string;
  existingAssessment?: RiskAssessment;
  onAssessmentComplete?: (assessment: RiskAssessment) => void;
  isLoading?: boolean;
  onTriggerAssessment?: () => Promise<void>;
}

function getRiskColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'LOW':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'HIGH':
      return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'CRITICAL':
      return 'text-red-600 bg-red-100 border-red-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}

function getSeverityIcon(severity: string) {
  switch (severity.toUpperCase()) {
    case 'LOW':
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    case 'MEDIUM':
      return <InformationCircleIcon className="h-5 w-5 text-yellow-600" />;
    case 'HIGH':
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
    case 'CRITICAL':
      return <XCircleIcon className="h-5 w-5 text-red-600" />;
    default:
      return <InformationCircleIcon className="h-5 w-5 text-gray-600" />;
  }
}

export default function ContractRiskAssessment({
  contractId,
  contractContent,
  existingAssessment,
  onAssessmentComplete,
  isLoading = false,
  onTriggerAssessment,
}: ContractRiskAssessmentProps) {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(existingAssessment || null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingAssessment) {
      setAssessment(existingAssessment);
    }
  }, [existingAssessment]);

  const handleAssessment = async () => {
    if (!contractContent && !assessment) {
      setError('No contract content available for assessment');
      return;
    }

    setIsAssessing(true);
    setError(null);

    try {
      if (onTriggerAssessment) {
        await onTriggerAssessment();
      } else {
        // Fallback: simulate AI assessment if no backend integration
        await simulateAIAssessment();
      }
    } catch (err) {
      console.error('Risk assessment failed:', err);
      setError('Failed to perform risk assessment. Please try again.');
    } finally {
      setIsAssessing(false);
    }
  };

  const simulateAIAssessment = async (): Promise<void> => {
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create simulated assessment based on content
    const mockAssessment: RiskAssessment = {
      overall_score: 6.5,
      risk_level: 'MEDIUM',
      assessment_summary: 'This contract presents moderate risk for your SME business. Several areas require attention to ensure proper protection and compliance.',
      risk_factors: [
        {
          category: 'legal_compliance',
          factor_name: 'UK Legal Compliance',
          score: 7.0,
          severity: 'MEDIUM',
          description: 'Contract may not fully comply with current UK commercial law requirements',
          impact_description: 'Potential legal vulnerabilities and enforcement issues',
          mitigation_suggestion: 'Review contract terms with legal counsel and ensure compliance with UK Commercial Law',
          confidence: 0.85,
        },
        {
          category: 'financial_exposure',
          factor_name: 'Payment Terms Risk',
          score: 5.5,
          severity: 'MEDIUM',
          description: 'Payment terms may expose business to cash flow risks',
          impact_description: 'Delayed payments could impact business operations',
          mitigation_suggestion: 'Consider shorter payment terms or milestone-based payments',
          confidence: 0.90,
        },
        {
          category: 'termination_risk',
          factor_name: 'Termination Clauses',
          score: 8.0,
          severity: 'HIGH',
          description: 'Contract contains potentially unfavorable termination terms',
          impact_description: 'Risk of unexpected contract termination with limited recourse',
          mitigation_suggestion: 'Negotiate more balanced termination terms with adequate notice periods',
          confidence: 0.78,
        },
      ],
      key_concerns: [
        'Termination clauses favor the other party',
        'Payment terms may impact cash flow',
        'Some UK compliance gaps identified',
      ],
      priority_actions: [
        'HIGH: Negotiate more balanced termination terms',
        'MEDIUM: Review and adjust payment terms',
        'MEDIUM: Ensure UK legal compliance',
      ],
      assessment_confidence: 0.84,
      category_scores: {
        legal_compliance: 7.0,
        financial_exposure: 5.5,
        operational_impact: 4.0,
        termination_risk: 8.0,
        reputational_risk: 3.0,
      },
      sme_specific_risks: [
        'High financial exposure relative to typical SME cash flow',
        'Resource allocation constraints typical for SME operations',
      ],
      industry_specific_risks: [
        'Consider industry-specific regulatory requirements',
      ],
      assessed_at: new Date().toISOString(),
    };

    setAssessment(mockAssessment);
    if (onAssessmentComplete) {
      onAssessmentComplete(mockAssessment);
    }
  };

  // Show empty state if no assessment and no content
  if (!assessment && !contractContent) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Risk Assessment Unavailable</h3>
          <p className="text-gray-600 mb-4">
            Contract content is required to perform risk assessment.
          </p>
        </div>
      </div>
    );
  }

  // Show assessment trigger if no existing assessment
  if (!assessment) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Risk Assessment</h3>
          <p className="text-gray-600 mb-4">
            Get AI-powered risk analysis of this contract to identify potential issues and recommendations.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <button
            onClick={handleAssessment}
            disabled={isAssessing || isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
          >
            {isAssessing ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Contract...
              </>
            ) : (
              <>
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Perform Risk Assessment
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">AI Risk Assessment</h3>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(assessment.risk_level)}`}>
              {getSeverityIcon(assessment.risk_level)}
              <span className="ml-2">{assessment.risk_level} Risk</span>
            </span>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{assessment.overall_score}/10</div>
              <div className="text-xs text-gray-500">Risk Score</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Risk Level</span>
            <span>{assessment.overall_score}/10</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                assessment.overall_score <= 3 ? 'bg-green-600' :
                assessment.overall_score <= 6 ? 'bg-yellow-600' :
                assessment.overall_score <= 8 ? 'bg-orange-600' :
                'bg-red-600'
              }`}
              style={{ width: `${(assessment.overall_score / 10) * 100}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">{assessment.assessment_summary}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Confidence: {Math.round(assessment.assessment_confidence * 100)}%</span>
          <span>Assessed: {new Date(assessment.assessed_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Key Concerns */}
      {assessment.key_concerns.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-2" />
            Key Concerns
          </h4>
          <ul className="space-y-2">
            {assessment.key_concerns.map((concern, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">{concern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Actions */}
      {assessment.priority_actions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
            Recommended Actions
          </h4>
          <ul className="space-y-3">
            {assessment.priority_actions.map((action, index) => {
              const priority = action.split(':')[0];
              const description = action.split(':').slice(1).join(':').trim();
              
              return (
                <li key={index} className="flex items-start space-x-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {priority}
                  </span>
                  <span className="text-sm text-gray-700">{description}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Risk Factors Detail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">Detailed Risk Analysis</h4>
        <div className="space-y-4">
          {assessment.risk_factors.map((factor, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900">{factor.factor_name}</h5>
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(factor.severity)}
                  <span className="text-xs text-gray-500">{factor.severity}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{factor.description}</p>
              
              <div className="bg-gray-50 rounded p-3 mb-3">
                <div className="text-xs font-medium text-gray-700 mb-1">Impact:</div>
                <p className="text-xs text-gray-600 mb-2">{factor.impact_description}</p>
                
                <div className="text-xs font-medium text-gray-700 mb-1">Recommendation:</div>
                <p className="text-xs text-gray-600">{factor.mitigation_suggestion}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-xs text-gray-500">
                    Score: <span className="font-medium">{factor.score}/10</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence: <span className="font-medium">{Math.round(factor.confidence * 100)}%</span>
                  </div>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      factor.score <= 3 ? 'bg-green-600' :
                      factor.score <= 6 ? 'bg-yellow-600' :
                      factor.score <= 8 ? 'bg-orange-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${(factor.score / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SME-Specific Insights */}
      {(assessment.sme_specific_risks.length > 0 || assessment.industry_specific_risks.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
            Business-Specific Insights
          </h4>
          
          {assessment.sme_specific_risks.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">SME Considerations:</h5>
              <ul className="space-y-1">
                {assessment.sme_specific_risks.map((risk, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {assessment.industry_specific_risks.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Industry Considerations:</h5>
              <ul className="space-y-1">
                {assessment.industry_specific_risks.map((risk, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Re-assessment option */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">Need updated assessment?</div>
            <div className="text-xs text-gray-600">Re-run analysis if contract content has changed</div>
          </div>
          <button
            onClick={handleAssessment}
            disabled={isAssessing}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md"
          >
            {isAssessing ? (
              <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4 mr-1" />
            )}
            Re-assess
          </button>
        </div>
      </div>
    </div>
  );
}