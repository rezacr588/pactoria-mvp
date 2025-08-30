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

const roleConfig = {
  admin: {
    name: 'Admin',
    description: 'Full access to all features',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    permissions: 'All permissions'
  },
  editor: {
    name: 'Editor',
    description: 'Can create and edit contracts',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    permissions: 'Create, edit, view contracts'
  },
  viewer: {
    name: 'Viewer',
    description: 'View-only access',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    permissions: 'View contracts only'
  },
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

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
    if (hoursAgo < 24) return { text: 'Active today', color: 'text-green-600' };
    if (hoursAgo < 168) return { text: 'Active this week', color: 'text-blue-600' };
    return { text: 'Inactive', color: 'text-gray-500' };
  };

  const maxUsers = 5; // As specified in MVP plan
  const currentUsers = teamMembers.length;
  const remainingSlots = maxUsers - currentUsers;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your team members and permissions ({currentUsers}/{maxUsers} users)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={remainingSlots <= 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Invite Team Member
          </button>
        </div>
      </div>

      {/* Usage Alert */}
      {remainingSlots <= 1 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                {remainingSlots === 0 ? (
                  <>You've reached the 5-user limit for your Professional plan. <a href="/settings" className="font-medium underline">Upgrade to add more users</a>.</>
                ) : (
                  <>You have {remainingSlots} user slot remaining on your Professional plan.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6">
            {teamMembers.map((member) => {
              const roleInfo = roleConfig[member.role];
              const activityStatus = getActivityStatus(member.lastActive);
              const isCurrentUser = member.id === user?.id;

              return (
                <div key={member.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=3b82f6&color=fff`}
                      alt=""
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-medium text-gray-900">{member.name}</h4>
                        {isCurrentUser && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={classNames(
                          roleInfo.color,
                          roleInfo.bgColor,
                          'inline-flex items-center px-2 py-1 rounded text-xs font-medium'
                        )}>
                          {roleInfo.name}
                        </span>
                        <span className={classNames(
                          activityStatus.color,
                          'text-xs'
                        )}>
                          {activityStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-gray-900">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {roleInfo.permissions}
                      </div>
                    </div>

                    {!isCurrentUser && (
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-2 text-gray-400 hover:text-gray-500">
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
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={classNames(
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'block w-full text-left px-4 py-2 text-sm'
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
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'block w-full text-left px-4 py-2 text-sm'
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
                                      active ? 'bg-gray-100 text-red-900' : 'text-red-700',
                                      'block w-full text-left px-4 py-2 text-sm'
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
        </div>
      </div>

      {/* Team Permissions Overview */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Permission Levels</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {Object.entries(roleConfig).map(([roleKey, role]) => (
            <div key={roleKey} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={classNames(role.color, role.bgColor, 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3')}>
                {role.name}
              </div>
              <p className="text-sm text-gray-600 mb-2">{role.description}</p>
              <p className="text-xs text-gray-500">{role.permissions}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowInviteModal(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                  <UserPlusIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Invite Team Member
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Send an invitation to join your Pactoria workspace
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInvite} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="invite-name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="invite-name"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="John Smith"
                    value={inviteData.name}
                    onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="invite-email"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="john@company.co.uk"
                    value={inviteData.email}
                    onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={inviteData.role}
                    onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value as 'admin' | 'editor' | 'viewer' }))}
                  >
                    <option value="viewer">Viewer - View contracts only</option>
                    <option value="editor">Editor - Create and edit contracts</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {roleConfig[inviteData.role].name} Permissions
                  </h4>
                  <p className="text-sm text-gray-600">{roleConfig[inviteData.role].permissions}</p>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:col-start-2"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}