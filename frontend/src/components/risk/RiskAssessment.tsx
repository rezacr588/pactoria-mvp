import React, { useState, useEffect } from 'react';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card } from '../ui';
import { useAuthStore } from '../../store/authStore';

interface RiskFactor {
  score: number;
  description: string;
  impact: string;
  recommendations: string[];
}

interface RiskAssessmentData {
  contract_type: string;
  overall_risk_score: number;
  risk_level: string;
  risk_factors: {
    [key: string]: RiskFactor;
  };
  critical_issues: string[];
  recommendations: string[];
  compliance_summary: string;
}

interface RiskAssessmentProps {
  contractId: string;
  contractContent?: string;
  contractType?: string;
}

function getRiskColor(score: number) {
  if (score <= 3) return 'text-green-600 bg-green-100 border-green-200';
  if (score <= 6) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  return 'text-red-600 bg-red-100 border-red-200';
}

function getRiskLevel(score: number) {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  return 'High';
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function RiskAssessment({ contractId, contractContent, contractType }: RiskAssessmentProps) {
  const [riskData, setRiskData] = useState<RiskAssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get token from auth store
  const { token, isAuthenticated } = useAuthStore();

  const fetchRiskAssessment = async () => {
    if (!contractContent || !contractType) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!token || !isAuthenticated) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/ai/assess-risk?contract_content=${encodeURIComponent(contractContent)}&contract_type=${contractType}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.statusText}`);
      }

      const data = await response.json();
      setRiskData(data);
    } catch (err) {
      console.error('Risk assessment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to assess contract risk');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contractContent && contractType) {
      fetchRiskAssessment();
    }
  }, [contractContent, contractType]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-y-4">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Contract Risk</h3>
            <p className="text-sm text-gray-600">
              Our AI is evaluating potential risks and compliance issues...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Risk Assessment Failed</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRiskAssessment}
            className="btn-secondary btn-sm"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry Assessment
          </button>
        </div>
      </Card>
    );
  }

  if (!riskData) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Risk Assessment Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            Risk assessment requires contract content and type to be available.
          </p>
          {contractContent && contractType && (
            <button
              onClick={fetchRiskAssessment}
              className="btn-primary btn-sm"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Perform Risk Assessment
            </button>
          )}
        </div>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(riskData.overall_risk_score);
  const riskFactorEntries = Object.entries(riskData.risk_factors);

  return (
    <div className="space-y-6">
      {/* Risk Assessment Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ShieldExclamationIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">AI Risk Assessment</h3>
              <p className="text-sm text-gray-600">Contract type: {riskData.contract_type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">Overall Risk Score:</span>
            <span className={classNames(
              getRiskColor(riskData.overall_risk_score),
              'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border'
            )}>
              {riskLevel} ({riskData.overall_risk_score}/10)
            </span>
          </div>
        </div>

        {/* Risk Level Description */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Level: {riskData.risk_level}</h4>
          <p className="text-sm text-gray-600">{riskData.compliance_summary}</p>
        </div>

        {/* Critical Issues */}
        {riskData.critical_issues && riskData.critical_issues.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-sm font-medium text-red-900">Critical Issues Identified</h4>
            </div>
            <div className="space-y-2">
              {riskData.critical_issues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-red-800">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Risk Factors */}
      <Card className="p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-6">Risk Factor Analysis</h4>
        <div className="space-y-4">
          {riskFactorEntries.map(([factorName, factor], index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-900 capitalize">
                  {factorName.replace(/_/g, ' ')}
                </h5>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">Impact: {factor.impact}</span>
                  <span className={classNames(
                    getRiskColor(factor.score),
                    'inline-flex items-center px-2 py-1 rounded text-xs font-medium border'
                  )}>
                    {factor.score}/10
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{factor.description}</p>
              
              {/* Risk Score Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Risk Level</span>
                  <span>{getRiskLevel(factor.score)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      factor.score <= 3 ? 'bg-green-600' :
                      factor.score <= 6 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${(factor.score / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Recommendations for this factor */}
              {factor.recommendations && factor.recommendations.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <h6 className="text-xs font-medium text-gray-700 mb-2">Recommendations:</h6>
                  <div className="space-y-1">
                    {factor.recommendations.map((rec, recIndex) => (
                      <div key={recIndex} className="flex items-start space-x-2">
                        <CheckCircleIcon className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Overall Recommendations */}
      <Card className="p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-6">AI Recommendations</h4>
        <div className="space-y-3">
          {riskData.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{recommendation}</p>
            </div>
          ))}
        </div>
        
        {riskData.overall_risk_score > 7 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800 font-medium">
                High Risk Warning: Consider legal review before contract execution
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}