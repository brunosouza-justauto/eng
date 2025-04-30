import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { Button } from '../ui/Button';
import { UserProfileListItem } from '../../types/profiles';

interface InvitationManagerProps {
  onInviteSent: (email: string) => void;
  coachId: string;
  pendingInvitations: UserProfileListItem[];
  onResendInvitation: (user: UserProfileListItem) => Promise<void>;
  isResendingInvite: boolean;
  userRole?: 'athlete' | 'coach'; // Optional parameter with default value of 'athlete'
}

const InvitationManager: React.FC<InvitationManagerProps> = ({
  onInviteSent,
  coachId,
  pendingInvitations,
  onResendInvitation,
  isResendingInvite,
  userRole = 'athlete' // Default to 'athlete' if not specified
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');

  // Display text based on userRole
  const roleText = userRole === 'coach' ? 'Coach' : 'Athlete';
  const roleTextLower = userRole === 'coach' ? 'coach' : 'athlete';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Send the magic link to the email
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        }
      });

      if (inviteError) throw inviteError;

      // Create a placeholder profile 
      const newProfileData = {
        email: email.trim(),
        coach_id: coachId,
        role: userRole, // Use the passed userRole
        onboarding_complete: false,
        username: email.split('@')[0], // Default username from email
        invitation_status: 'pending',
        invited_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(newProfileData);

      if (profileError) throw profileError;
      
      // Call the callback to update the parent component
      onInviteSent(email);
      
      // Clear the form
      setEmail('');
    } catch (err: unknown) {
      console.error(`Error inviting ${roleTextLower}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmails.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    // Split emails by comma, newline, or semicolon and trim whitespace
    const emails = bulkEmails
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
    
    if (emails.length === 0) {
      setError('No valid emails found');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Process each email
      let successCount = 0;
      
      for (const emailAddress of emails) {
        try {
          // Send the magic link
          const { error: inviteError } = await supabase.auth.signInWithOtp({
            email: emailAddress,
            options: {
              emailRedirectTo: `${window.location.origin}/onboarding`,
            }
          });

          if (inviteError) continue;

          // Create a placeholder profile
          const newProfileData = {
            email: emailAddress,
            coach_id: coachId,
            role: userRole, // Use the passed userRole
            onboarding_complete: false,
            username: emailAddress.split('@')[0],
            invitation_status: 'pending',
            invited_at: new Date().toISOString(),
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .insert(newProfileData);

          if (!profileError) {
            successCount++;
          }
        } catch (err) {
          console.error(`Error processing email ${emailAddress}:`, err);
          // Continue with next email
        }
      }
      
      // Call the callback once for the whole operation
      if (successCount > 0) {
        onInviteSent(`${successCount} of ${emails.length} invitations`);
        setBulkEmails('');
        setShowBulkInvite(false);
      } else {
        setError('Failed to send any invitations. Please check the email addresses and try again.');
      }
    } catch (err: unknown) {
      console.error("Error in bulk invite:", err);
      setError(err instanceof Error ? err.message : 'Failed to process bulk invitations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="default" padding="lg" className="mb-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{roleText} Invitations</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Invite {roleTextLower}s to join your coaching program
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBulkInvite(!showBulkInvite)}
          >
            {showBulkInvite ? 'Single Invite' : 'Bulk Invite'}
          </Button>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {!showBulkInvite ? (
          // Single invitation form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {roleText} Email
              </label>
              <div className="flex mt-1">
                <input
                  type="email"
                  id="email"
                  placeholder={`${roleTextLower}@example.com`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-2 border-gray-300 shadow-sm rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-l-none"
                  loading={isSubmitting}
                  disabled={isSubmitting || !email.trim()}
                >
                  Send Invitation
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                An email will be sent with a link to join your coaching program.
              </p>
            </div>
          </form>
        ) : (
          // Bulk invitation form
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div>
              <label htmlFor="bulkEmails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Multiple Email Addresses
              </label>
              <textarea
                id="bulkEmails"
                placeholder={`${roleTextLower}1@example.com, ${roleTextLower}2@example.com`}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={4}
                className="block w-full px-4 py-2 mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter multiple email addresses separated by commas, semicolons, or new lines.
              </p>
              <Button
                type="submit"
                variant="primary"
                className="mt-3"
                loading={isSubmitting}
                disabled={isSubmitting || !bulkEmails.trim()}
                fullWidth
              >
                Send Bulk Invitations
              </Button>
            </div>
          </form>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-medium text-gray-800 dark:text-white">Pending Invitations ({pendingInvitations.length})</h3>
            <div className="overflow-hidden border border-gray-200 rounded-md dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Email</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Invited</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Status</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {pendingInvitations.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {user.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                        {user.invited_at ? new Date(user.invited_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className="inline-flex px-2 text-xs font-semibold leading-5 text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900/30 dark:text-yellow-200">
                          {user.invitation_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => onResendInvitation(user)}
                          disabled={isResendingInvite}
                          loading={isResendingInvite}
                        >
                          Resend
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InvitationManager; 