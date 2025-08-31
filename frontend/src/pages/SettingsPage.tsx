import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Textarea, Avatar, Toggle } from '../components/ui';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';

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

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    jobTitle: '',
    bio: ''
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: user?.company || '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    website: '',
    vatNumber: '',
    companyNumber: ''
  });

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    contractDeadlines: true,
    complianceAlerts: true,
    teamUpdates: true,
    marketingEmails: false,
    weeklyDigest: true
  });

  // Security settings
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Preferences
  const [preferencesForm, setPreferencesForm] = useState({
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    currency: 'GBP',
    language: 'en-GB',
    contractDefaults: {
      paymentTerms: '30',
      jurisdiction: 'England and Wales',
      governingLaw: 'English Law'
    }
  });

  const handleSave = async (section: string) => {
    setIsSaving(true);
    try {
      // Mock save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Saving ${section} settings...`);
      // In real app, would call API to save settings
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
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
              name={user?.name}
              size="2xl"
            />
            <div>
              <Button variant="secondary" size="sm">Change Avatar</Button>
              <p className={`${textStyles.formHelpText} mt-1`}>JPG, GIF or PNG. Max size 1MB.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              label="Email Address"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              label="Phone Number"
              value={profileForm.phone}
              onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Job Title"
              value={profileForm.jobTitle}
              onChange={(e) => setProfileForm(prev => ({ ...prev, jobTitle: e.target.value }))}
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
          onClick={() => handleSave('profile')}
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
              value={companyForm.vatNumber}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, vatNumber: e.target.value }))}
            />
            <Input
              label="Company Number"
              value={companyForm.companyNumber}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, companyNumber: e.target.value }))}
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
                options={[
                  { value: 'United Kingdom', label: 'United Kingdom' },
                  { value: 'Ireland', label: 'Ireland' }
                ]}
                value={companyForm.country}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={() => handleSave('company')}
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
          {[
            { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'contractDeadlines', label: 'Contract Deadlines', description: 'Alerts for upcoming contract deadlines' },
            { key: 'complianceAlerts', label: 'Compliance Alerts', description: 'Notifications about compliance issues' },
            { key: 'teamUpdates', label: 'Team Updates', description: 'Updates about team member activities' },
            { key: 'marketingEmails', label: 'Marketing Emails', description: 'Product updates and marketing communications' },
            { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Weekly summary of your contract activity' }
          ].map((item) => (
            <div key={item.key} className="py-4 border-b border-neutral-200 dark:border-secondary-700 last:border-0">
              <Toggle
                id={item.key}
                checked={notificationPrefs[item.key as keyof typeof notificationPrefs]}
                onChange={(checked) => setNotificationPrefs(prev => ({
                  ...prev,
                  [item.key]: checked
                }))}
                label={item.label}
                description={item.description}
                size="md"
              />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={() => handleSave('notifications')}
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
            value={securityForm.currentPassword}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={securityForm.newPassword}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={securityForm.confirmPassword}
            onChange={(e) => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-sm font-medium ${textColors.primary}`}>Two-Factor Authentication</h4>
              <p className={`text-sm ${textColors.muted}`}>Add an extra layer of security to your account</p>
            </div>
            <Button variant="secondary">
              {securityForm.twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={() => handleSave('security')}
        >
          Update Security
        </Button>
      </div>
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
              options={[
                { value: 'Europe/London', label: 'London (GMT/BST)' },
                { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' }
              ]}
              value={preferencesForm.timezone}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, timezone: e.target.value }))}
            />
            <Select
              label="Date Format"
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
              ]}
              value={preferencesForm.dateFormat}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, dateFormat: e.target.value }))}
            />
            <Select
              label="Currency"
              options={[
                { value: 'GBP', label: 'British Pound (£)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'USD', label: 'US Dollar ($)' }
              ]}
              value={preferencesForm.currency}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, currency: e.target.value }))}
            />
            <Select
              label="Language"
              options={[
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'en-US', label: 'English (US)' }
              ]}
              value={preferencesForm.language}
              onChange={(e) => setPreferencesForm(prev => ({ ...prev, language: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Default Payment Terms (days)"
              value={preferencesForm.contractDefaults.paymentTerms}
              onChange={(e) => setPreferencesForm(prev => ({
                ...prev,
                contractDefaults: {
                  ...prev.contractDefaults,
                  paymentTerms: e.target.value
                }
              }))}
            />
            <Select
              label="Jurisdiction"
              options={[
                { value: 'England and Wales', label: 'England and Wales' },
                { value: 'Scotland', label: 'Scotland' },
                { value: 'Northern Ireland', label: 'Northern Ireland' }
              ]}
              value={preferencesForm.contractDefaults.jurisdiction}
              onChange={(e) => setPreferencesForm(prev => ({
                ...prev,
                contractDefaults: {
                  ...prev.contractDefaults,
                  jurisdiction: e.target.value
                }
              }))}
            />
            <Select
              label="Governing Law"
              options={[
                { value: 'English Law', label: 'English Law' },
                { value: 'Scottish Law', label: 'Scottish Law' },
                { value: 'Northern Irish Law', label: 'Northern Irish Law' }
              ]}
              value={preferencesForm.contractDefaults.governingLaw}
              onChange={(e) => setPreferencesForm(prev => ({
                ...prev,
                contractDefaults: {
                  ...prev.contractDefaults,
                  governingLaw: e.target.value
                }
              }))}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          loading={isSaving}
          onClick={() => handleSave('preferences')}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );

  const renderTabContent = () => {
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
        return renderProfileTab();
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className={textStyles.pageTitle}>Settings</h1>
        <p className={`mt-2 ${textStyles.pageSubtitle}`}>
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={classNames(
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-500'
                      : `${textColors.secondary} hover:bg-neutral-50 dark:hover:bg-secondary-800 ${textColors.interactiveHover}`,
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-l-lg transition-colors w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900'
                  )}
                >
                  <Icon
                    className={classNames(
                      activeTab === tab.id ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-400 dark:text-secondary-500 group-hover:text-neutral-500 dark:group-hover:text-secondary-400',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}