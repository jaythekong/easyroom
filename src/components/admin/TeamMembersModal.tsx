import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Crown, Shield, User, Mail, Calendar, X } from "lucide-react";
import { useOrganizationMembers } from "@/hooks/useSuperAdmin";
import { format } from "date-fns";

interface TeamMembersModalProps {
  organizationId: string | null;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TeamMembersModal({ organizationId, organizationName, isOpen, onClose }: TeamMembersModalProps) {
  const { data: members, isLoading } = useOrganizationMembers(organizationId);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members - {organizationName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {members?.length || 0} team members
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.display_name
                              ? member.display_name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                              : member.email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.display_name || 'No name set'}
                          </div>
                          {member.bio && (
                            <div className="text-sm text-muted-foreground truncate max-w-48">
                              {member.bio}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit ${getRoleColor((member as any).user_organization_memberships?.[0]?.role || 'member')}`}>
                        {getRoleIcon((member as any).user_organization_memberships?.[0]?.role || 'member')}
                        {(member as any).user_organization_memberships?.[0]?.role || 'member'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {member.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(member.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.last_login ? (
                        <div className="text-sm">
                          {format(new Date(member.last_login), 'MMM dd, yyyy HH:mm')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(!members || members.length === 0) && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team members found</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}