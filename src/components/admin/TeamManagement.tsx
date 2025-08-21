import { useState, useEffect } from "react";
import { Plus, Mail, UserCheck, UserX, Copy, Check, Link2, KeyRound, Trash2, Send, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
  email?: string;
  last_login?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  short_code?: string;
  open_count?: number;
  last_opened_at?: string;
  resend_count?: number;
  status?: string;
  recipient_name?: string;
}

export function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization } = useOrganization();
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [linkRole, setLinkRole] = useState("member");
  const [linkRecipientName, setLinkRecipientName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [totalInvitations, setTotalInvitations] = useState(0);
  const invitationsPerPage = 5;

  useEffect(() => {
    if (organization?.id) {
      fetchTeamData();
    }
  }, [organization?.id, invitationsPage]);

  const fetchTeamData = async () => {
    if (!organization?.id) return;
    
    try {
      // Fetch team members from memberships
      const { data: members, error: membersError } = await supabase
        .from('user_organization_memberships')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', organization.id);

      if (membersError) {
        console.error('Members query error:', membersError);
        throw membersError;
      }
      
      // Get emails and last_login data from profiles
      const userIds = members.map(member => member.user_id);
      
      // Fetch user data from profiles including last_login
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email, last_login')
        .in('user_id', userIds)
        .eq('organization_id', organization.id);

      // Combine membership data with profile data
      const membersWithEmails = members.map(member => {
        const profile = profiles?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          email: profile?.email || 'no-email@company.com',
          last_login: profile?.last_login || null
        };
      });

      setTeamMembers(membersWithEmails);

      // Get total count of pending invitations
      const { count: totalCount } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString());

      setTotalInvitations(totalCount || 0);

      // Fetch pending invitations for this organization (latest first, paginated)
      const { data: invites, error: invitesError } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range((invitationsPage - 1) * invitationsPerPage, invitationsPage * invitationsPerPage - 1);

      if (invitesError) {
        console.error('Invites query error:', invitesError);
        throw invitesError;
      }
      setInvitations(invites || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail || !user || !organization?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail,
          role: inviteRole as 'admin' | 'member',
          invited_by: user.id,
          organization_id: organization.id,
        });

      if (error) throw error;

      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteEmail("");
      setInviteRole("member");
      setIsInviteDialogOpen(false);
      setInvitationsPage(1); // Reset to first page when new invite is added
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteLink = async () => {
    if (!user || !organization?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: null, // NULL for link invites - allows any email to use the link
          role: linkRole as 'admin' | 'member',
          invited_by: user.id,
          organization_id: organization.id,
          recipient_name: linkRecipientName || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Wait a moment for the trigger to generate short_code, then refetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: updatedData } = await supabase
        .from('invitations')
        .select('short_code, invite_token')
        .eq('id', data.id)
        .single();

      // Use short_code if available, fallback to invite_token
      const inviteCode = updatedData?.short_code || data.invite_token;
      const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      toast({
        title: "Invite link created!",
        description: `Link copied to clipboard${linkRecipientName ? ` for ${linkRecipientName}` : ' - share it with your team member'}`,
      });

      setIsLinkDialogOpen(false);
      setLinkRecipientName("");
      setInvitationsPage(1); // Reset to first page when new invite is added
      fetchTeamData();
    } catch (error: any) {
      console.error('Generate invite link error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async (invite: Invitation) => {
    // Use short_code if available, fallback to invite_token for consistency
    const inviteCode = invite.short_code || invite.invite_token;
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(invite.invite_token);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const resendInvite = async (inviteId: string) => {
    try {
      const { data, error } = await supabase.rpc('resend_invitation', {
        invitation_id: inviteId
      });

      if (error) throw error;

      toast({
        title: "Invite resent",
        description: "The invitation has been resent successfully",
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invite",
        variant: "destructive",
      });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_invitation', {
        invitation_id: inviteId
      });

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invitation has been revoked",
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invite",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    if (!email || email === 'no-email@company.com') {
      toast({
        title: "Cannot reset password",
        description: "This user doesn't have a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/${organization.slug}?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: `Password reset instructions sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member', email: string) => {
    if (!organization?.id) return;
    
    try {
      // Update role in the memberships table
      const { error: membershipError } = await supabase
        .from('user_organization_memberships')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', organization.id);

      if (membershipError) throw membershipError;

      // Also update role in profiles table for consistency
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', organization.id);

      if (profileError) {
        console.warn('Profile update failed:', profileError);
        // Don't throw error - membership update is more important
      }

      toast({
        title: "Role updated",
        description: `${email} is now a ${newRole}`,
      });
      
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This will permanently remove ALL data associated with this user including bookings, memberships, and subscriptions. This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Starting complete deletion for user ${userId} (${email})`);

      // Step 1: Delete all bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', userId);
      
      if (bookingsError) {
        console.error('Error deleting bookings:', bookingsError);
        throw new Error(`Failed to delete bookings: ${bookingsError.message}`);
      }
      console.log('✅ Deleted user bookings');

      // Step 2: Delete room downtime records
      const { error: downtimeError } = await supabase
        .from('room_downtime')
        .delete()
        .eq('user_id', userId);
      
      if (downtimeError) {
        console.error('Error deleting room downtime:', downtimeError);
        throw new Error(`Failed to delete room downtime: ${downtimeError.message}`);
      }
      console.log('✅ Deleted room downtime records');

      // Step 3: Delete telegram subscriptions
      const { error: telegramError } = await supabase
        .from('telegram_subscriptions')
        .delete()
        .eq('user_id', userId);
      
      if (telegramError) {
        console.error('Error deleting telegram subscriptions:', telegramError);
        throw new Error(`Failed to delete telegram subscriptions: ${telegramError.message}`);
      }
      console.log('✅ Deleted telegram subscriptions');

      // Step 4: Delete invitation audit log entries  
      const { error: auditError } = await supabase
        .from('invitation_audit_log')
        .delete()
        .eq('user_id', userId);
      
      if (auditError) {
        console.error('Error deleting invitation audit logs:', auditError);
        throw new Error(`Failed to delete invitation audit logs: ${auditError.message}`);
      }
      console.log('✅ Deleted invitation audit logs');

      // Step 5: Delete unauthorized access attempts
      const { error: accessError } = await supabase
        .from('unauthorized_access_attempts')
        .delete()
        .eq('user_id', userId);
      
      if (accessError) {
        console.error('Error deleting access attempts:', accessError);
        throw new Error(`Failed to delete access attempts: ${accessError.message}`);
      }
      console.log('✅ Deleted unauthorized access attempts');

      // Step 6: Delete organization memberships
      const { error: membershipError } = await supabase
        .from('user_organization_memberships')
        .delete()
        .eq('user_id', userId);
      
      if (membershipError) {
        console.error('Error deleting memberships:', membershipError);
        throw new Error(`Failed to delete organization memberships: ${membershipError.message}`);
      }
      console.log('✅ Deleted organization memberships');

      // Step 7: Delete user profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw new Error(`Failed to delete user profile: ${profileError.message}`);
      }
      console.log('✅ Deleted user profile');

      // Step 8: Delete from auth.users using edge function (has service role permissions)
      const { error: authError } = await supabase.functions.invoke('delete-auth-user', {
        body: { userId }
      });

      if (authError) {
        console.error('Error deleting auth user:', authError);
        console.warn('Auth user deletion failed, but all application data has been removed');
        toast({
          title: "Partial deletion completed",
          description: "All application data removed, but auth user still exists. Delete manually from Supabase dashboard.",
          variant: "destructive",
        });
      } else {
        console.log('✅ Deleted auth user');
      }

      toast({
        title: "User completely deleted",
        description: `${email} and all associated data have been permanently removed`,
      });
      
      fetchTeamData();
    } catch (error: any) {
      console.error('Complete user deletion failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to completely delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage your organization's team members</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Generate Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Invite Link</DialogTitle>
                  <DialogDescription>
                    Create a shareable invite link for your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                    <Input
                      id="recipientName"
                      type="text"
                      placeholder="e.g., John Smith"
                      value={linkRecipientName}
                      onChange={(e) => setLinkRecipientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkRole">Role</Label>
                    <Select value={linkRole} onValueChange={setLinkRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsLinkDialogOpen(false);
                        setLinkRecipientName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={generateInviteLink} disabled={isLoading}>
                      {isLoading ? "Generating..." : "Generate & Copy Link"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={sendInvite} disabled={isLoading || !inviteEmail}>
                      {isLoading ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(newRole) => updateUserRole(member.user_id, newRole as 'admin' | 'member', member.email || '')}
                      disabled={member.user_id === user?.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {member.last_login 
                      ? new Date(member.last_login).toLocaleString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetPassword(member.email || '')}
                        disabled={!member.email || member.email === 'no-email@company.com'}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(member.user_id, member.email || '')}
                        className="text-destructive hover:text-destructive"
                        title="Delete user account"
                        disabled={member.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Manage outstanding team invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{invite.email}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">Email invite</Badge>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <span>{invite.recipient_name || "Unnamed recipient"}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">Link invite</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{new Date(invite.created_at).toLocaleDateString()}</div>
                        {(invite.resend_count || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Resent {invite.resend_count} time{invite.resend_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{invite.open_count || 0}</span>
                        {invite.last_opened_at && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (last: {new Date(invite.last_opened_at).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite)}
                          className="flex items-center gap-1"
                          title="Copy invite link"
                        >
                          {copiedToken === invite.invite_token ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInvite(invite.id)}
                          className="flex items-center gap-1"
                          title="Resend invitation"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeInvite(invite.id)}
                          className="text-destructive hover:text-destructive"
                          title="Revoke invitation"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalInvitations > invitationsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((invitationsPage - 1) * invitationsPerPage + 1, totalInvitations)} to{' '}
                  {Math.min(invitationsPage * invitationsPerPage, totalInvitations)} of {totalInvitations} invitations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvitationsPage(prev => Math.max(1, prev - 1))}
                    disabled={invitationsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {invitationsPage} of {Math.ceil(totalInvitations / invitationsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvitationsPage(prev => Math.min(Math.ceil(totalInvitations / invitationsPerPage), prev + 1))}
                    disabled={invitationsPage >= Math.ceil(totalInvitations / invitationsPerPage)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}