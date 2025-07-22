import { useState, useEffect } from "react";
import { Plus, Mail, UserCheck, UserX, Copy, Check, Link2, KeyRound, Trash2 } from "lucide-react";
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

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
}

export function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [linkRole, setLinkRole] = useState("member");
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, [user]);

  const initializeUser = async () => {
    if (!user) return;

    try {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // User profile doesn't exist - this should not happen for properly signed up users
        // Don't auto-create admin profiles as this is a security vulnerability
        console.error('User profile not found. User may need to sign up properly through organization auth.');
        toast({
          title: "Error",
          description: "User profile not found. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      if (profile?.organization_id) {
        setUserOrgId(profile.organization_id);
        fetchTeamData(profile.organization_id);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      toast({
        title: "Error",
        description: "Failed to initialize user profile",
        variant: "destructive",
      });
    }
  };

  const fetchTeamData = async (orgId?: string) => {
    const organizationId = orgId || userOrgId;
    if (!organizationId) return;
    
    try {
      // Fetch organization data including slug
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('Organization query error:', orgError);
        throw orgError;
      }

      if (orgData?.slug) {
        setOrgSlug(orgData.slug);
      }

      // Fetch team members from the same organization
      const { data: members, error: membersError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          email
        `)
        .eq('organization_id', organizationId);

      if (membersError) {
        console.error('Members query error:', membersError);
        throw membersError;
      }

      // Use actual email from user_profiles
      const membersWithEmails = (members || []).map((member) => ({
        ...member,
        email: member.email || 'no-email@company.com'
      }));

      setTeamMembers(membersWithEmails);

      // Fetch pending invitations for this organization
      const { data: invites, error: invitesError } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

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
    if (!inviteEmail || !user || !userOrgId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail,
          role: inviteRole as 'admin' | 'member',
          invited_by: user.id,
          organization_id: userOrgId,
        });

      if (error) throw error;

      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteEmail("");
      setInviteRole("member");
      setIsInviteDialogOpen(false);
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
    if (!user || !userOrgId) return;

    setIsLoading(true);
    try {
      // Use a unique identifier for link-only invites to avoid constraint violations
      const linkIdentifier = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: linkIdentifier, // Use unique identifier instead of empty string
          role: linkRole as 'admin' | 'member',
          invited_by: user.id,
          organization_id: userOrgId,
        })
        .select()
        .single();

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/invite/${data.invite_token}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      toast({
        title: "Invite link created!",
        description: "Link copied to clipboard - share it with your team member",
      });

      setIsLinkDialogOpen(false);
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

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invitation has been revoked",
      });
      fetchTeamData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke invite",
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
        redirectTo: `${window.location.origin}/auth/${orgSlug}?reset=true`,
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

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete user profile first (this will fail if there are bookings)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        if (profileError.message.includes('violates foreign key constraint')) {
          toast({
            title: "Cannot delete user",
            description: "This user has existing bookings. Cancel their bookings first before deleting the account.",
            variant: "destructive",
          });
        } else {
          throw profileError;
        }
        return;
      }

      // Delete from auth.users using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;

      toast({
        title: "User deleted",
        description: `${email} has been successfully removed`,
      });
      
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
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
                      onClick={() => setIsLinkDialogOpen(false)}
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email?.startsWith('link-') ? 
                        <span className="italic text-muted-foreground">Link invite</span> : 
                        invite.email || <span className="italic text-muted-foreground">Link invite</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.invite_token)}
                          className="flex items-center gap-1"
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
                          onClick={() => revokeInvite(invite.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}