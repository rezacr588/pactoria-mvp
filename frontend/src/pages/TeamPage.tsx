import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { TeamService } from '../services/api';
import { TeamMemberNew, TeamStats } from '../types';
import { useToast } from '../contexts/ToastContext';
import {
  EllipsisVerticalIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

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
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMemberNew[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: 'viewer',
    department: '',
    send_email: true
  });

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [members, stats] = await Promise.all([
        TeamService.getTeamMembers({ include_inactive: false }),
        TeamService.getTeamStats()
      ]);
      setTeamMembers(members);
      setTeamStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team members';
      setError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Handle invite team member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    
    try {
      const newMember = await TeamService.inviteTeamMember(inviteData);
      setTeamMembers(prev => [...prev, newMember]);
      
      // Update stats
      if (teamStats) {
        setTeamStats({
          ...teamStats,
          total_members: teamStats.total_members + 1,
          pending_invitations: teamStats.pending_invitations + 1
        });
      }
      
      showToast({
        type: 'success',
        title: 'Invitation Sent',
        message: `Invitation sent to ${inviteData.email}`
      });
      
      setShowInviteModal(false);
      setInviteData({
        email: '',
        full_name: '',
        role: 'viewer',
        department: '',
        send_email: true
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Invitation Failed',
        message: err instanceof Error ? err.message : 'Failed to send invitation'
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Handle remove team member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      await TeamService.removeTeamMember(memberId);
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      
      // Update stats
      if (teamStats) {
        setTeamStats({
          ...teamStats,
          total_members: teamStats.total_members - 1,
          active_members: teamStats.active_members - 1
        });
      }
      
      showToast({
        type: 'success',
        title: 'Member Removed',
        message: `${memberName} has been removed from the team`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to remove team member'
      });
    }
  };

  // Handle update member role
  const handleUpdateRole = async (memberId: string, newRole: string, memberName: string) => {
    try {
      await TeamService.updateMemberRole(memberId, newRole);
      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m)
      );
      
      showToast({
        type: 'success',
        title: 'Role Updated',
        message: `${memberName}'s role has been updated to ${newRole}`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to update role'
      });
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (memberId: string, memberName: string) => {
    try {
      await TeamService.resendInvitation(memberId);
      showToast({
        type: 'success',
        title: 'Invitation Resent',
        message: `Invitation has been resent to ${memberName}`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to resend invitation'
      });
    }
  };

  const getActivityStatus = (lastActive: string) => {
    const hoursAgo = (new Date().getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) return { text: 'Active today', color: textColors.success };
    if (hoursAgo < 168) return { text: 'Active this week', color: textColors.info };
    return { text: 'Inactive', color: textColors.muted };
  };

  const maxUsers = teamStats?.total_members || 5; // Default to 5 for MVP
  const currentUsers = teamMembers.length;
  const remainingSlots = Math.max(0, maxUsers - currentUsers);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon={ExclamationTriangleIcon}
          title="Error Loading Team"
          description={error}
          action={{
            label: "Retry",
            onClick: fetchTeamMembers,
            icon: ArrowPathIcon
          }}
        />
      </div>
    );
  }

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
                  <>You've reached the user limit for your plan. <a href="/settings" className="font-medium underline text-warning-800 dark:text-warning-200 hover:text-warning-900 dark:hover:text-warning-100">Upgrade to add more users</a>.</>
                ) : (
                  <>You have {remainingSlots} user slot remaining on your current plan.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      {teamMembers.length === 0 ? (
        <EmptyState
          icon={UserPlusIcon}
          title="No team members yet"
          description="Invite your first team member to start collaborating"
          action={{
            label: "Invite Team Member",
            onClick: () => setShowInviteModal(true),
            icon: UserPlusIcon
          }}
        />
      ) : (
        <Card variant="elevated" padding="lg">
          <div className="grid grid-cols-1 gap-6">
            {teamMembers.map((member) => {
              const roleInfo = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.viewer;
              const activityStatus = getActivityStatus(member.last_active);
              const isCurrentUser = member.id === user?.id;
              const isPending = member.invitation_status === 'pending';

              return (
                <div key={member.id} className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-secondary-800/50 rounded-xl transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-700/50">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-12 w-12 rounded-full ring-2 ring-white dark:ring-secondary-700"
                      src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=3b82f6&color=fff`}
                      alt=""
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className={classNames(textStyles.listTitle)}>{member.full_name}</h4>
                        {isCurrentUser && (
                          <Badge variant="primary" size="sm">
                            You
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="warning" size="sm">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className={classNames(textStyles.listSubtitle)}>{member.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant={roleInfo.variant} size="sm">
                          {roleInfo.name}
                        </Badge>
                        {member.department && (
                          <span className={textStyles.captionText}>
                            {member.department}
                          </span>
                        )}
                        {!isPending && (
                          <span className={classNames(
                            activityStatus.color,
                            'text-xs font-medium'
                          )}>
                            {activityStatus.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className={textStyles.dataValue}>
                        {isPending ? 'Invited' : 'Joined'} {new Date(member.joined_at).toLocaleDateString()}
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
                              {!isPending && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => {
                                        const newRole = prompt(`Change role for ${member.full_name} (admin/editor/viewer):`, member.role);
                                        if (newRole && ['admin', 'editor', 'viewer'].includes(newRole)) {
                                          handleUpdateRole(member.id, newRole, member.full_name);
                                        }
                                      }}
                                      className={classNames(
                                        active ? 'bg-neutral-100 dark:bg-secondary-800' : '',
                                        textColors.primary,
                                        'block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-800'
                                      )}
                                    >
                                      Change role
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              {isPending && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleResendInvitation(member.id, member.full_name)}
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
                              )}
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleRemoveMember(member.id, member.full_name)}
                                    className={classNames(
                                      active ? 'bg-neutral-100 dark:bg-secondary-800' : '',
                                      textColors.danger,
                                      'block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-secondary-800'
                                    )}
                                  >
                                    Remove from team
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
      )}

      {/* Team Statistics */}
      {teamStats && (
        <Card variant="elevated" padding="lg" className="mt-8">
          <h3 className={classNames(textStyles.sectionTitle, 'mb-6')}>Team Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-neutral-50 dark:bg-secondary-800/50 rounded-lg">
              <div className={textStyles.dataValue}>{teamStats.total_members}</div>
              <div className={textStyles.captionText}>Total Members</div>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-secondary-800/50 rounded-lg">
              <div className={textStyles.dataValue}>{teamStats.active_members}</div>
              <div className={textStyles.captionText}>Active Members</div>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-secondary-800/50 rounded-lg">
              <div className={textStyles.dataValue}>{teamStats.pending_invitations}</div>
              <div className={textStyles.captionText}>Pending Invites</div>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-secondary-800/50 rounded-lg">
              <div className={textStyles.dataValue}>{remainingSlots}</div>
              <div className={textStyles.captionText}>Available Slots</div>
            </div>
          </div>
        </Card>
      )}

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
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="invite-name"
                      className="mt-1 block w-full border-neutral-300 dark:border-secondary-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-800 dark:text-secondary-100"
                      value={inviteData.full_name}
                      onChange={(e) => setInviteData({...inviteData, full_name: e.target.value})}
                      required
                      disabled={isInviting}
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
                      disabled={isInviting}
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
                      onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                      disabled={isInviting}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="invite-department" className={textStyles.formLabel}>
                      Department (Optional)
                    </label>
                    <input
                      type="text"
                      id="invite-department"
                      className="mt-1 block w-full border-neutral-300 dark:border-secondary-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-800 dark:text-secondary-100"
                      value={inviteData.department}
                      onChange={(e) => setInviteData({...inviteData, department: e.target.value})}
                      placeholder="e.g., Legal, Sales, HR"
                      disabled={isInviting}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="send-email"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                      checked={inviteData.send_email}
                      onChange={(e) => setInviteData({...inviteData, send_email: e.target.checked})}
                      disabled={isInviting}
                    />
                    <label htmlFor="send-email" className="ml-2 block text-sm text-neutral-900 dark:text-secondary-100">
                      Send invitation email
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isInviting}
                      loading={isInviting}
                    >
                      Send Invitation
                    </Button>
                    <button
                      type="button"
                      className={classNames(textStyles.button, textColors.secondary, 'px-4 py-2 border border-neutral-300 dark:border-secondary-600 rounded-md hover:bg-neutral-50 dark:hover:bg-secondary-800')}
                      onClick={() => setShowInviteModal(false)}
                      disabled={isInviting}
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