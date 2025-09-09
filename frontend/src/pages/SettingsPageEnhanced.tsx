import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Textarea, Avatar, Toggle } from '../components/ui';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';
import { UserService, CompanyService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';

interface TabItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { id: 'profile', name: 'Profile', icon: UserIcon },
  { id: 'company', name: 'Company', icon: BuildingOfficeIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  { id: 'preferences', name: 'Preferences', icon: Cog6ToothIcon },
];

export default function SettingsPageEnhanced() {
  const { showToast } = useToast();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    bio: ''
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    website: '',
    vat_number: '',
    company_number: '',
    contract_defaults: {
      payment_terms: '30',
      jurisdiction: 'England and Wales',
      governing_law: 'English Law',
      currency: 'GBP'
    }
  });

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    contract_deadlines: true,
    compliance_alerts: true,
    team_updates: true,
    marketing_emails: false,
    weekly_digest: true
  });

  // Security settings
  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_enabled: false
  });

  // Preferences
  const [preferencesForm, setPreferencesForm] = useState({
    timezone: 'Europe/London',
    date_format: 'DD/MM/YYYY',
    currency: 'GBP',
    language: 'en-GB'
  });

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const profileData = await UserService.getProfile();
      
      setProfileForm({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        job_title: profileData.job_title || '',
        bio: profileData.bio || ''
      });
      
      setPreferencesForm({
        timezone: profileData.timezone || 'Europe/London',
        date_format: profileData.date_format || 'DD/MM/YYYY',
        currency: profileData.currency || 'GBP',
        language: profileData.language || 'en-GB'
      });
      
      if (profileData.notification_preferences) {
        setNotificationPrefs(profileData.notification_preferences);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Load company data
  const loadCompanyData = useCallback(async () => {
    try {
      const companyData = await CompanyService.getCompany();
      
      setCompanyForm({
        name: companyData.name || '',
        address: companyData.address || '',
        city: companyData.city || '',
        postcode: companyData.postcode || '',
        country: companyData.country || 'United Kingdom',
        website: companyData.website || '',
        vat_number: companyData.vat_number || '',
        company_number: companyData.company_number || '',
        contract_defaults: companyData.contract_defaults || {
          payment_terms: '30',
          jurisdiction: 'England and Wales',
          governing_law: 'English Law',
          currency: 'GBP'
        }
      });
    } catch (err) {
      console.warn('Failed to load company data:', err);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
    loadCompanyData();
  }, [loadUserProfile, loadCompanyData]);

  // Save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedProfile = await UserService.updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        job_title: profileForm.job_title,
        bio: profileForm.bio
      });
      
      // Update local user state
      updateUser({
        name: updatedProfile.full_name,
        email: updatedProfile.email
      });
      
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save company details
  const handleSaveCompany = async () => {
    setIsSaving(true);
    try {
      await CompanyService.updateCompany({
        name: companyForm.name,
        address: companyForm.address,
        city: companyForm.city,
        postcode: companyForm.postcode,
        country: companyForm.country,
        website: companyForm.website,
        vat_number: companyForm.vat_number,
        company_number: companyForm.company_number,
        contract_defaults: companyForm.contract_defaults
      });
      
      showToast('Company details updated successfully', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await UserService.updateNotificationPreferences(notificationPrefs);
      showToast('Notification preferences updated', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (securityForm.new_password !== securityForm.confirm_password) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      await UserService.changePassword({
        current_password: securityForm.current_password,
        new_password: securityForm.new_password
      });
      
      // Clear form
      setSecurityForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
        two_factor_enabled: securityForm.two_factor_enabled
      });
      
      showToast('Password changed successfully', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await UserService.updateProfile({
        timezone: preferencesForm.timezone,
        date_format: preferencesForm.date_format,
        currency: preferencesForm.currency,
        language: preferencesForm.language
      });
      
      showToast('Preferences updated successfully', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      showToast('File size must be less than 1MB', 'error');
      return;
    }
    
    try {
      const result = await UserService.uploadAvatar(file);
      showToast('Avatar updated successfully', 'success');
      // Update local state if needed
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar
              src={user?.avatar}
              name={profileForm.full_name || user?.name}
              size="2xl"
            />
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload">
                <Button variant="secondary" size="sm" as="span">
                  Change Avatar
                </Button>
              </label>
              <p className={`${textStyles.formHelpText} mt-1`}>JPG, GIF or PNG. Max size 1MB.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
            />
            <Input
              label="Email Address"
              type="email"
              value={profileForm.email}
              disabled
              helpText="Email cannot be changed"
            />
            <Input
              label="Phone Number"
              value={profileForm.phone}
              onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Job Title"
              value={profileForm.job_title}
              onChange={(e) => setProfileForm(prev => ({ ...prev, job_title: e.target.value }))}
            />
          </div>
          
          <Textarea
            label="Bio"
            rows={3}
            value={profileForm.bio}
            onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
            helpText="Brief description about yourself"
          />
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={handleSaveProfile}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Company Name"
              value={companyForm.name}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              label="Website"
              value={companyForm.website}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
            />
            <Input
              label="VAT Number"
              value={companyForm.vat_number}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, vat_number: e.target.value }))}
            />
            <Input
              label="Company Number"
              value={companyForm.company_number}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, company_number: e.target.value }))}
            />
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-sm font-medium ${textColors.primary}`}>Address</h4>
            <Input
              label="Street Address"
              value={companyForm.address}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="City"
                value={companyForm.city}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
              />
              <Input
                label="Postcode"
                value={companyForm.postcode}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, postcode: e.target.value }))}
              />
              <Select
                label="Country"
                value={companyForm.country}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
                options={[
                  { value: 'United Kingdom', label: 'United Kingdom' },
                  { value: 'Ireland', label: 'Ireland' },
                  { value: 'United States', label: 'United States' },
                  { value: 'Canada', label: 'Canada' },
                  { value: 'Australia', label: 'Australia' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-medium ${textColors.primary}`}>Contract Defaults</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Payment Terms (days)"
                value={companyForm.contract_defaults.payment_terms}
                onChange={(e) => setCompanyForm(prev => ({ 
                  ...prev, 
                  contract_defaults: { ...prev.contract_defaults, payment_terms: e.target.value }
                }))}
              />
              <Select
                label="Default Currency"
                value={companyForm.contract_defaults.currency}
                onChange={(e) => setCompanyForm(prev => ({ 
                  ...prev, 
                  contract_defaults: { ...prev.contract_defaults, currency: e.target.value }
                }))}
                options={[
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'USD', label: 'USD ($)' },
                ]}
              />
              <Input
                label="Jurisdiction"
                value={companyForm.contract_defaults.jurisdiction}
                onChange={(e) => setCompanyForm(prev => ({ 
                  ...prev, 
                  contract_defaults: { ...prev.contract_defaults, jurisdiction: e.target.value }
                }))}
              />
              <Input
                label="Governing Law"
                value={companyForm.contract_defaults.governing_law}
                onChange={(e) => setCompanyForm(prev => ({ 
                  ...prev, 
                  contract_defaults: { ...prev.contract_defaults, governing_law: e.target.value }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={handleSaveCompany}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Toggle
              label="Enable email notifications"
              description="Receive important updates via email"
              checked={notificationPrefs.email_notifications}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, email_notifications: checked }))}
            />
            <Toggle
              label="Contract deadlines"
              description="Get notified about upcoming contract expirations"
              checked={notificationPrefs.contract_deadlines}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, contract_deadlines: checked }))}
            />
            <Toggle
              label="Compliance alerts"
              description="Receive alerts about compliance issues"
              checked={notificationPrefs.compliance_alerts}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, compliance_alerts: checked }))}
            />
            <Toggle
              label="Team updates"
              description="Stay informed about team activities"
              checked={notificationPrefs.team_updates}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, team_updates: checked }))}
            />
            <Toggle
              label="Marketing emails"
              description="Receive product updates and offers"
              checked={notificationPrefs.marketing_emails}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, marketing_emails: checked }))}
            />
            <Toggle
              label="Weekly digest"
              description="Get a weekly summary of your contract activity"
              checked={notificationPrefs.weekly_digest}
              onChange={(checked) => setNotificationPrefs(prev => ({ ...prev, weekly_digest: checked }))}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={handleSaveNotifications}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={securityForm.current_password}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, current_password: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={securityForm.new_password}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, new_password: e.target.value }))}
            helpText="Minimum 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={securityForm.confirm_password}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, confirm_password: e.target.value }))}
          />
          
          <div className="flex justify-end">
            <Button
              loading={isSaving}
              onClick={handleChangePassword}
              disabled={!securityForm.current_password || !securityForm.new_password || !securityForm.confirm_password}
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <Toggle
            label="Enable two-factor authentication"
            description="Add an extra layer of security to your account"
            checked={securityForm.two_factor_enabled}
            onChange={(checked) => setSecurityForm(prev => ({ ...prev, two_factor_enabled: checked }))}
          />
          {securityForm.two_factor_enabled && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className={textStyles.bodyTextSecondary}>
                Two-factor authentication will be enabled on your next login
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Timezone"
              value={preferencesForm.timezone}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, timezone: e.target.value }))}
              options={[
                { value: 'Europe/London', label: 'London (GMT)' },
                { value: 'Europe/Dublin', label: 'Dublin (GMT)' },
                { value: 'Europe/Paris', label: 'Paris (CET)' },
                { value: 'America/New_York', label: 'New York (EST)' },
                { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
              ]}
            />
            <Select
              label="Date Format"
              value={preferencesForm.date_format}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, date_format: e.target.value }))}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
            <Select
              label="Currency"
              value={preferencesForm.currency}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: 'GBP', label: 'British Pound (GBP)' },
                { value: 'EUR', label: 'Euro (EUR)' },
                { value: 'USD', label: 'US Dollar (USD)' },
              ]}
            />
            <Select
              label="Language"
              value={preferencesForm.language}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, language: e.target.value }))}
              options={[
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'en-US', label: 'English (US)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={handleSavePreferences}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'company':
        return renderCompanyTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      case 'preferences':
        return renderPreferencesTab();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage your account and preferences
          </p>
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Manage your account and preferences
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                tab.id === activeTab
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                'group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors w-full'
              )}
            >
              <tab.icon
                className={classNames(
                  tab.id === activeTab
                    ? 'text-primary-500'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                  'flex-shrink-0 -ml-1 mr-3 h-6 w-6'
                )}
                aria-hidden="true"
              />
              <span className="truncate">{tab.name}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
