import { useEffect, useState } from 'react';
import { useContractStore } from '../store/contractStore';
import { useAuthStore } from '../store/authStore';
import {
  EllipsisVerticalIcon,
  CheckCircleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const roleConfig = {
  admin: {
    name: 'Admin',
    description: 'Full access to all features',
    variant: 'primary' as const,
    permissions: 'All permissions'
  },
  editor: {
    name: 'Editor',
    description: 'Can create and edit contracts', 
    variant: 'info' as const,
    permissions: 'Create, edit, view contracts'
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to contracts',
    variant: 'default' as const,
    permissions: 'View contracts only'
  }
};

export default function TeamPage() {
  const { teamMembers, fetchTeamMembers } = useContractStore();
  const { user } = useAuthStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer'
  });

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement invite functionality
    console.log('Inviting user:', inviteData);
    setShowInviteModal(false);
    setInviteData({ email: '', name: '', role: 'viewer' });
  };

  const getActivityStatus = (lastActive: Date) => {
    const hoursAgo = (new Date().getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) return { text: 'Active today', color: textColors.success };
    if (hoursAgo < 168) return { text: 'Active this week', color: textColors.info };
    return { text: 'Inactive', color: textColors.muted };
  };

  const maxUsers = 5; // As specified in MVP plan
  const currentUsers = teamMembers.length;
  const remainingSlots = maxUsers - currentUsers;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className={textStyles.pageTitle}>Team Management</h1>
          <p className={classNames(textStyles.pageSubtitle, "mt-2")}>
            Manage your team members and permissions ({currentUsers}/{maxUsers} users)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button
            onClick={() => setShowInviteModal(true)}
            disabled={remainingSlots <= 0}
            icon={<UserPlusIcon className="h-4 w-4" />}
            variant="primary"
          >
            Invite Team Member
          </Button>
        </div>
      </div>

      {/* Usage Alert */}
      {remainingSlots <= 1 && (
        <div className="mb-6 bg-warning-50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-800/30 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            <div className="ml-3">
              <p className="text-sm text-warning-800 dark:text-warning-200">
                {remainingSlots === 0 ? (
                  <>You've reached the 5-user limit for your Professional plan. <a href="/settings" className="font-medium underline text-warning-800 dark:text-warning-200 hover:text-warning-900 dark:hover:text-warning-100">Upgrade to add more users</a>.</>
                ) : (
                  <>You have {remainingSlots} user slot remaining on your Professional plan.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <Card variant="elevated" padding="lg">
        <div className="grid grid-cols-1 gap-6">
          {teamMembers.map((member) => {
            const roleInfo = roleConfig[member.role];
            const activityStatus = getActivityStatus(member.lastActive);
            const isCurrentUser = member.id === user?.id;

            return (
              <div key={member.id} className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-secondary-800/50 rounded-xl transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-700/50">
                <div className="flex items-center space-x-4">
                  <img
                    className="h-12 w-12 rounded-full ring-2 ring-white dark:ring-secondary-700"
                    src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=3b82f6&color=fff`}
                    alt=""
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className={classNames(textStyles.listTitle)}>{member.name}</h4>
                      {isCurrentUser && (
                        <Badge variant="primary" size="sm">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className={classNames(textStyles.listSubtitle)}>{member.email}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant={roleInfo.variant} size="sm">
                        {roleInfo.name}
                      </Badge>
                      <span className={classNames(
                        activityStatus.color,
                        'text-xs font-medium'
                      )}>
                        {activityStatus.text}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className={textStyles.dataValue}>
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                    <div className={textStyles.captionText}>
                      {roleInfo.permissions}
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className={classNames(
                        'p-2 transition-colors',
                        textColors.muted,
                        textColors.interactiveHover
                      )}>
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-secondary-900 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-secondary-700 focus:outline-none border border-neutral-200 dark:border-secondary-700">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={classNames(
                                    active ? 'bg-neutral-100 dark:bg-secondary-800' : '',
                                    textColors.primary,
                                    'block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-800'
                                  )}
                                >
                                  Edit permissions
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={classNames(
                                    active ? 'bg-neutral-100 dark:bg-secondary-800' : '',
                                    textColors.primary,
                                    'block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-800'
                                  )}
                                >
                                  Resend invitation
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={classNames(
                                    active ? 'bg-neutral-100 dark:bg-secondary-800' : '',
                                    textColors.danger,
                                    'block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-800'
                                  )}
                                >
                                  Remove user
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Team Permissions Overview */}
      <Card variant="elevated" padding="lg" className="mt-8">
        <h3 className={classNames(textStyles.sectionTitle, 'mb-6')}>Permission Levels</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {Object.entries(roleConfig).map(([roleKey, role]) => (
            <div key={roleKey} className="text-center p-4 bg-neutral-50 dark:bg-secondary-800/50 rounded-lg transition-colors">
              <div className="mb-3">
                <Badge variant={role.variant} size="md">
                  {role.name}
                </Badge>
              </div>
              <p className={classNames(textStyles.cardSubtitle, 'mb-2')}>{role.description}</p>
              <p className={textStyles.captionText}>{role.permissions}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-neutral-500 dark:bg-neutral-800 bg-opacity-75 dark:bg-opacity-80 transition-opacity" onClick={() => setShowInviteModal(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-secondary-900 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 border border-neutral-200 dark:border-secondary-700">
              <div>
                <h3 className={classNames(textStyles.sectionTitle, 'mb-4')}>Invite Team Member</h3>
                
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label htmlFor="invite-name" className={textStyles.formLabel}>
                      Name
                    </label>
                    <input
                      type="text"
                      id="invite-name"
                      className="mt-1 block w-full border-neutral-300 dark:border-secondary-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-800 dark:text-secondary-100"
                      value={inviteData.name}
                      onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="invite-email" className={textStyles.formLabel}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="invite-email"
                      className="mt-1 block w-full border-neutral-300 dark:border-secondary-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-800 dark:text-secondary-100"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="invite-role" className={textStyles.formLabel}>
                      Role
                    </label>
                    <select
                      id="invite-role"
                      className="mt-1 block w-full border-neutral-300 dark:border-secondary-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-800 dark:text-secondary-100"
                      value={inviteData.role}
                      onChange={(e) => setInviteData({...inviteData, role: e.target.value as 'admin' | 'editor' | 'viewer'})}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Send Invitation
                    </Button>
                    <button
                      type="button"
                      className={classNames(textStyles.button, textColors.secondary, 'px-4 py-2 border border-neutral-300 dark:border-secondary-600 rounded-md hover:bg-neutral-50 dark:hover:bg-secondary-800')}
                      onClick={() => setShowInviteModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}