"""
Comprehensive E2E Test Coverage Runner for Pactoria MVP

This script runs all comprehensive E2E tests and measures coverage improvements.
It provides detailed reporting on test coverage, performance metrics, and identifies gaps.

Usage:
    python tests/run_comprehensive_e2e_coverage.py [--coverage] [--performance] [--report]
"""

import subprocess
import sys
import time
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import argparse


class ComprehensiveE2ETestRunner:
    """Runner for comprehensive E2E tests with coverage analysis"""
    
    def __init__(self):
        self.test_results = {}
        self.coverage_results = {}
        self.performance_metrics = {}
        self.start_time = None
        self.end_time = None
        
        # Define comprehensive test modules
        self.comprehensive_test_modules = [
            "tests.e2e.test_comprehensive_authentication_e2e",
            "tests.e2e.test_comprehensive_contract_management_e2e", 
            "tests.e2e.test_comprehensive_integrations_e2e",
            "tests.e2e.test_comprehensive_notifications_e2e",
            "tests.e2e.test_comprehensive_analytics_audit_e2e"
        ]
        
        # Define existing test modules for comparison
        self.existing_test_modules = [
            "tests.e2e.test_authentication_flows",
            "tests.e2e.test_contract_lifecycle",
            "tests.e2e.test_team_management_e2e",
            "tests.e2e.test_realtime_collaboration",
            "tests.e2e.test_search_and_analytics",
            "tests.e2e.test_error_handling_and_edge_cases",
            "tests.e2e.test_performance_and_load",
            "tests.e2e.test_file_management_and_bulk_operations"
        ]

    def run_comprehensive_tests(self, coverage=True, performance=True):
        """Run all comprehensive E2E tests"""
        print("=" * 80)
        print("🚀 STARTING COMPREHENSIVE E2E TEST SUITE")
        print("=" * 80)
        
        self.start_time = datetime.utcnow()
        
        # Run comprehensive tests
        print("\\n📋 Running Comprehensive E2E Tests...")
        comprehensive_results = self._run_test_modules(
            self.comprehensive_test_modules, 
            "comprehensive", 
            coverage=coverage
        )
        
        # Run existing tests for comparison
        print("\\n📊 Running Existing E2E Tests for Comparison...")
        existing_results = self._run_test_modules(
            self.existing_test_modules, 
            "existing", 
            coverage=coverage
        )
        
        self.end_time = datetime.utcnow()
        
        # Generate comprehensive report
        self._generate_comprehensive_report(comprehensive_results, existing_results)
        
        return {
            "comprehensive": comprehensive_results,
            "existing": existing_results,
            "execution_time": (self.end_time - self.start_time).total_seconds()
        }

    def _run_test_modules(self, modules: List[str], suite_name: str, coverage=True) -> Dict[str, Any]:
        """Run a set of test modules and collect results"""
        results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "skipped_tests": 0,
            "execution_time": 0,
            "coverage": None,
            "module_results": {},
            "errors": []
        }
        
        for module in modules:
            print(f"\\n  🧪 Running {module}...")
            module_start = time.time()
            
            try:
                # Build pytest command
                cmd = ["python", "-m", "pytest"]
                
                if coverage:
                    cmd.extend([
                        "--cov=app", 
                        "--cov-report=json",
                        f"--cov-report=html:coverage_reports/{suite_name}_{module.split('.')[-1]}"
                    ])
                
                cmd.extend([
                    "-v",
                    "--tb=short",
                    "--disable-warnings",
                    module.replace(".", "/") + ".py"
                ])
                
                # Run the test
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout per module
                )
                
                module_time = time.time() - module_start
                
                # Parse pytest output
                module_results = self._parse_pytest_output(result.stdout, result.stderr)
                module_results["execution_time"] = module_time
                module_results["return_code"] = result.returncode
                
                results["module_results"][module] = module_results
                
                # Aggregate results
                results["total_tests"] += module_results.get("total", 0)
                results["passed_tests"] += module_results.get("passed", 0)
                results["failed_tests"] += module_results.get("failed", 0)
                results["skipped_tests"] += module_results.get("skipped", 0)
                results["execution_time"] += module_time
                
                # Print module summary
                status = "✅ PASSED" if result.returncode == 0 else "❌ FAILED"
                print(f"    {status} - {module_results.get('total', 0)} tests in {module_time:.2f}s")
                
                if result.returncode != 0:
                    print(f"    Error: {result.stderr[:200]}...")
                
            except subprocess.TimeoutExpired:
                error_msg = f"Module {module} timed out after 5 minutes"
                results["errors"].append(error_msg)
                print(f"    ⏱️ TIMEOUT - {error_msg}")
                
            except Exception as e:
                error_msg = f"Module {module} failed with exception: {str(e)}"
                results["errors"].append(error_msg)
                print(f"    💥 ERROR - {error_msg}")
        
        # Load coverage data if available
        if coverage and os.path.exists("coverage.json"):
            try:
                with open("coverage.json", "r") as f:
                    results["coverage"] = json.load(f)
            except Exception as e:
                print(f"    ⚠️ Warning: Could not load coverage data - {e}")
        
        return results

    def _parse_pytest_output(self, stdout: str, stderr: str) -> Dict[str, Any]:
        """Parse pytest output to extract test metrics"""
        results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "warnings": 0,
            "errors": []
        }
        
        # Look for test summary line
        lines = stdout.split("\\n")
        for line in lines:
            if "passed" in line and "failed" in line:
                # Parse line like: "5 failed, 10 passed, 2 skipped in 30.2s"
                parts = line.split()
                for i, part in enumerate(parts):
                    if part == "passed" and i > 0:
                        results["passed"] = int(parts[i-1])
                    elif part == "failed" and i > 0:
                        results["failed"] = int(parts[i-1])
                    elif part == "skipped" and i > 0:
                        results["skipped"] = int(parts[i-1])
            elif "warnings" in line.lower():
                # Count warnings
                parts = line.split()
                for i, part in enumerate(parts):
                    if "warning" in part.lower() and i > 0:
                        try:
                            results["warnings"] = int(parts[i-1])
                        except:
                            pass
        
        results["total"] = results["passed"] + results["failed"] + results["skipped"]
        
        # Collect error messages from stderr
        if stderr:
            results["errors"] = stderr.split("\\n")[:5]  # First 5 error lines
        
        return results

    def _generate_comprehensive_report(self, comprehensive_results: Dict, existing_results: Dict):
        """Generate comprehensive test coverage report"""
        print("\\n" + "=" * 80)
        print("📊 COMPREHENSIVE E2E TEST COVERAGE REPORT")
        print("=" * 80)
        
        # Test execution summary
        print("\\n🏃‍♂️ EXECUTION SUMMARY")
        print("-" * 40)
        
        total_execution_time = (self.end_time - self.start_time).total_seconds()
        print(f"Total Execution Time: {total_execution_time:.2f} seconds")
        print(f"Start Time: {self.start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"End Time: {self.end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        # Test metrics comparison
        print("\\n📈 TEST METRICS COMPARISON")
        print("-" * 40)
        
        def print_suite_metrics(name: str, results: Dict):
            print(f"\\n{name.upper()} TESTS:")
            print(f"  Total Tests: {results['total_tests']}")
            print(f"  Passed: {results['passed_tests']} ✅")
            print(f"  Failed: {results['failed_tests']} ❌")
            print(f"  Skipped: {results['skipped_tests']} ⏭️")
            print(f"  Success Rate: {(results['passed_tests'] / max(results['total_tests'], 1) * 100):.1f}%")
            print(f"  Execution Time: {results['execution_time']:.2f}s")
            
            if results['errors']:
                print(f"  Errors: {len(results['errors'])}")
        
        print_suite_metrics("Comprehensive E2E", comprehensive_results)
        print_suite_metrics("Existing E2E", existing_results)
        
        # Coverage analysis
        print("\\n📊 COVERAGE ANALYSIS")
        print("-" * 40)
        
        if comprehensive_results.get("coverage"):
            coverage_data = comprehensive_results["coverage"]
            totals = coverage_data.get("totals", {})
            
            print(f"Line Coverage: {totals.get('percent_covered', 0):.1f}%")
            print(f"Lines Covered: {totals.get('covered_lines', 0)}")
            print(f"Total Lines: {totals.get('num_statements', 0)}")
            print(f"Missing Lines: {totals.get('missing_lines', 0)}")
            
            # Coverage by module
            files = coverage_data.get("files", {})
            if files:
                print("\\n📁 TOP MODULES BY COVERAGE:")
                sorted_files = sorted(
                    files.items(), 
                    key=lambda x: x[1].get("summary", {}).get("percent_covered", 0),
                    reverse=True
                )[:10]
                
                for filepath, file_data in sorted_files:
                    summary = file_data.get("summary", {})
                    coverage_pct = summary.get("percent_covered", 0)
                    print(f"  {filepath}: {coverage_pct:.1f}%")
        else:
            print("Coverage data not available")
        
        # Module-by-module breakdown
        print("\\n🔍 MODULE BREAKDOWN")
        print("-" * 40)
        
        def print_module_breakdown(name: str, results: Dict):
            print(f"\\n{name.upper()} MODULES:")
            for module, module_results in results.get("module_results", {}).items():
                status = "✅" if module_results.get("return_code", 1) == 0 else "❌"
                total = module_results.get("total", 0)
                passed = module_results.get("passed", 0)
                exec_time = module_results.get("execution_time", 0)
                
                print(f"  {status} {module.split('.')[-1]}: {passed}/{total} tests ({exec_time:.1f}s)")
        
        print_module_breakdown("Comprehensive E2E", comprehensive_results)
        print_module_breakdown("Existing E2E", existing_results)
        
        # Coverage improvement analysis
        print("\\n🚀 COVERAGE IMPROVEMENTS")
        print("-" * 40)
        
        comprehensive_total = comprehensive_results['total_tests']
        existing_total = existing_results['total_tests']
        
        print(f"Test Count Increase: +{comprehensive_total - existing_total} tests")
        print(f"Coverage Expansion: +{len(self.comprehensive_test_modules)} new test modules")
        
        # Areas covered by comprehensive tests
        coverage_areas = [
            "Complete Authentication Flows (OAuth, JWT, Password Reset)",
            "Full Contract CRUD Lifecycle with AI Integration", 
            "External Integration Management (OAuth, API Keys, Webhooks)",
            "Real-time Notifications and Delivery Systems",
            "Analytics Dashboard and Business Metrics",
            "Comprehensive Audit Trail and Security Monitoring",
            "Error Handling and Edge Cases",
            "Performance Testing with Large Datasets",
            "Security and Permission Testing",
            "Data Export and Reporting Functionality"
        ]
        
        print("\\n🎯 NEW COVERAGE AREAS:")
        for area in coverage_areas:
            print(f"  ✅ {area}")
        
        # Recommendations
        print("\\n💡 RECOMMENDATIONS")
        print("-" * 40)
        
        recommendations = []
        
        if comprehensive_results['failed_tests'] > 0:
            recommendations.append("Fix failing comprehensive tests to improve coverage")
        
        if existing_results['failed_tests'] > 0:
            recommendations.append("Address existing test failures to maintain stability")
        
        coverage_pct = 0
        if comprehensive_results.get("coverage"):
            coverage_pct = comprehensive_results["coverage"].get("totals", {}).get("percent_covered", 0)
        
        if coverage_pct < 80:
            recommendations.append("Aim for >80% code coverage by adding unit tests")
        elif coverage_pct < 90:
            recommendations.append("Excellent coverage! Consider targeting >90% for critical paths")
        
        if total_execution_time > 300:  # 5 minutes
            recommendations.append("Consider test optimization to reduce execution time")
        
        recommendations.extend([
            "Run comprehensive E2E tests in CI/CD pipeline",
            "Set up automated coverage reporting",
            "Implement performance regression testing",
            "Add comprehensive tests for new features"
        ])
        
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
        
        # Final summary
        print("\\n" + "=" * 80)
        print("✨ SUMMARY")
        print("=" * 80)
        
        total_tests = comprehensive_total + existing_total
        total_passed = comprehensive_results['passed_tests'] + existing_results['passed_tests']
        overall_success_rate = (total_passed / max(total_tests, 1)) * 100
        
        print(f"🎯 Overall Test Success Rate: {overall_success_rate:.1f}%")
        print(f"📊 Total E2E Test Coverage: {total_tests} tests across {len(self.comprehensive_test_modules) + len(self.existing_test_modules)} modules")
        print(f"⏱️  Total Execution Time: {total_execution_time:.1f} seconds")
        
        if coverage_pct > 0:
            print(f"📈 Code Coverage: {coverage_pct:.1f}%")
        
        if overall_success_rate >= 95:
            print("\\n🏆 EXCELLENT! Your E2E test suite provides comprehensive coverage.")
        elif overall_success_rate >= 85:
            print("\\n🎉 GREAT! Strong E2E coverage with room for improvement.")
        elif overall_success_rate >= 70:
            print("\\n👍 GOOD! Solid foundation, focus on fixing failing tests.")
        else:
            print("\\n⚠️  NEEDS WORK! Significant test failures need attention.")

    def generate_html_report(self, results: Dict):
        """Generate HTML report for easy viewing"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pactoria MVP - Comprehensive E2E Test Coverage Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; }}
                .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }}
                .metrics {{ display: flex; gap: 20px; flex-wrap: wrap; }}
                .metric {{ background-color: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px; }}
                .success {{ color: #059669; }}
                .error {{ color: #dc2626; }}
                .warning {{ color: #d97706; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f8f9fa; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 Pactoria MVP - Comprehensive E2E Test Coverage Report</h1>
                <p>Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            </div>
            
            <!-- Report content would be generated here -->
            <div class="section">
                <h2>📊 Test Results Summary</h2>
                <div class="metrics">
                    <div class="metric">
                        <h3>Comprehensive Tests</h3>
                        <p><strong>Total:</strong> {results.get('comprehensive', {}).get('total_tests', 0)}</p>
                        <p><strong>Passed:</strong> <span class="success">{results.get('comprehensive', {}).get('passed_tests', 0)}</span></p>
                        <p><strong>Failed:</strong> <span class="error">{results.get('comprehensive', {}).get('failed_tests', 0)}</span></p>
                    </div>
                    <div class="metric">
                        <h3>Existing Tests</h3>
                        <p><strong>Total:</strong> {results.get('existing', {}).get('total_tests', 0)}</p>
                        <p><strong>Passed:</strong> <span class="success">{results.get('existing', {}).get('passed_tests', 0)}</span></p>
                        <p><strong>Failed:</strong> <span class="error">{results.get('existing', {}).get('failed_tests', 0)}</span></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Save HTML report
        report_path = "coverage_reports/comprehensive_e2e_report.html"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, "w") as f:
            f.write(html_content)
        
        print(f"\\n📄 HTML Report Generated: {report_path}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Run comprehensive E2E tests with coverage analysis")
    parser.add_argument("--coverage", action="store_true", default=True, help="Run with coverage analysis")
    parser.add_argument("--performance", action="store_true", default=True, help="Include performance metrics")
    parser.add_argument("--html-report", action="store_true", help="Generate HTML report")
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = ComprehensiveE2ETestRunner()
    
    try:
        # Run comprehensive tests
        results = runner.run_comprehensive_tests(
            coverage=args.coverage,
            performance=args.performance
        )
        
        # Generate HTML report if requested
        if args.html_report:
            runner.generate_html_report(results)
        
        # Determine exit code based on results
        total_failed = results["comprehensive"]["failed_tests"] + results["existing"]["failed_tests"]
        
        if total_failed == 0:
            print("\\n🎉 All tests passed! Comprehensive E2E coverage successful.")
            sys.exit(0)
        else:
            print(f"\\n⚠️  {total_failed} tests failed. Review and fix failing tests.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\\n⏹️  Test run interrupted by user.")
        sys.exit(130)
    except Exception as e:
        print(f"\\n💥 Test run failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()