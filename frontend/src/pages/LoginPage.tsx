import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { EyeIcon, EyeSlashIcon, UserIcon, BuildingOfficeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Button, Card, Input } from '../components/ui';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    timezone: 'Europe/London'
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (!formData.full_name || !formData.company_name) {
          setErrors({ form: 'Please fill in all fields' });
          setLoading(false);
          return;
        }
        await register(formData.email, formData.password, formData.full_name, formData.company_name, formData.timezone);
      }
      navigate('/dashboard');
    } catch (error: unknown) {
      setErrors({ form: error instanceof Error ? error.message : 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <span className="mt-2 block text-lg font-bold text-primary-600">Pactoria</span>
            </Link>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isLogin ? 'Welcome back' : 'Get started today'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>


        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                label="Full Name"
                placeholder="John Smith"
                leftIcon={<UserIcon />}
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                error={errors.full_name}
              />

              <Input
                id="company_name"
                name="company_name"
                type="text"
                label="Company Name"
                placeholder="Acme Ltd"
                leftIcon={<BuildingOfficeIcon />}
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                error={errors.company_name}
              />
            </>
          )}

          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@company.com"
            leftIcon={<EnvelopeIcon />}
            autoComplete="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            }
          />

          {errors.form && (
            <div 
              className="bg-red-50 border border-red-200 rounded-lg p-3" 
              role="alert"
              data-testid="error-message"
            >
              <div className="text-sm text-red-700">{errors.form}</div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {isLogin ? 'Sign in' : 'Create Account'}
            </Button>

          </div>

          <div className="text-center pt-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to homepage
            </Link>
          </div>
        </form>
      </Card>
      </div>
    </div>
  );
}