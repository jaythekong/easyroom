import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, RotateCcw, X, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatDistanceToNow } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  invite_token: string;
  short_code: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  open_count: number;
  last_opened_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by_email?: string;
}

export function InvitationManagement() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      // Fetch all invitations for this organization
      const { data: invites, error: invitesError } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invitesError) {
        console.error('Error fetching invitations:', invitesError);
        toast({
          title: "Error",
          description: "Failed to fetch invitations",
          variant: "destructive",
        });
        return;
      }

      // Get invited_by user emails for the invitations
      const invitedByIds = invites?.map(invite => invite.invited_by).filter(Boolean) || [];
      
      let invitedByEmails: Record<string, string> = {};
      if (invitedByIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('user_id, email')
          .in('user_id', invitedByIds)
          .eq('organization_id', organization.id);

        if (!usersError && users) {
          invitedByEmails = users.reduce((acc, user) => {
            acc[user.user_id] = user.email;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine invitations with invited_by email
      const invitesWithCreatorInfo = invites?.map(invite => ({
        ...invite,
        invited_by_email: invitedByEmails[invite.invited_by] || 'Unknown'
      }));

      setInvitations(invitesWithCreatorInfo || []);
    } catch (error) {
      console.error('Error in fetchInvitations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [organization?.id]);

  const copyInviteLink = async (invite: Invitation) => {
    const inviteUrl = `${window.location.origin}/invite/${invite.invite_token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(invite.id);
    setTimeout(() => setCopiedToken(null), 2000);
    
    toast({
      title: "Link copied!",
      description: "Invitation link has been copied to clipboard",
    });
  };

  const resendInvitation = async (inviteId: string) => {
    try {
      const { data, error } = await supabase.rpc('resend_invitation', {
        invitation_id: inviteId
      });

      if (error) throw error;

      toast({
        title: "Invite resent",
        description: "The invitation has been resent successfully",
      });

      fetchInvitations(); // Refresh the list
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const revokeInvitation = async (inviteId: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_invitation', {
        invitation_id: inviteId
      });

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invitation has been revoked",
      });

      fetchInvitations(); // Refresh the list
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast({
        title: "Error",
        description: "Failed to revoke invitation",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string, accepted_at: string | null, revoked_at: string | null, expires_at: string) => {
    if (revoked_at) return <XCircle className="h-4 w-4 text-red-500" />;
    if (accepted_at) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (new Date(expires_at) < new Date()) return <Clock className="h-4 w-4 text-orange-500" />;
    return <Mail className="h-4 w-4 text-blue-500" />;
  };

  const getStatusBadge = (status: string, accepted_at: string | null, revoked_at: string | null, expires_at: string) => {
    if (revoked_at) return <Badge variant="destructive">Revoked</Badge>;
    if (accepted_at) return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
    if (new Date(expires_at) < new Date()) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation Management</CardTitle>
          <CardDescription>Loading invitations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Management
            </CardTitle>
            <CardDescription>
              View and manage all organization invitations
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {invitations.length} total invitations
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No invitations found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Invitations will appear here when you invite team members
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email || "Link invite"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invite.status, invite.accepted_at, invite.revoked_at, invite.expires_at)}
                        {getStatusBadge(invite.status, invite.accepted_at, invite.revoked_at, invite.expires_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.invited_by_email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.open_count}
                      {invite.last_opened_at && (
                        <div className="text-xs">
                          Last: {formatDistanceToNow(new Date(invite.last_opened_at), { addSuffix: true })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {invite.status === 'pending' && !invite.revoked_at && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInviteLink(invite)}
                              className="flex items-center gap-1"
                              title="Copy invitation link"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedToken === invite.id ? "Copied!" : "Copy"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation(invite.id)}
                              className="flex items-center gap-1"
                              title="Resend invitation"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeInvitation(invite.id)}
                              className="text-destructive hover:text-destructive"
                              title="Revoke invitation"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {invite.resend_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Resent {invite.resend_count}x
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}