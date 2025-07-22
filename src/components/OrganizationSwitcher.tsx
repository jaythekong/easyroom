import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building, ChevronDown, Crown, Users } from "lucide-react";
import { useUserMemberships } from "@/hooks/useUserMemberships";
import { useOrganization } from "@/contexts/OrganizationContext";

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const { organization: currentOrg } = useOrganization();
  const { data: memberships = [], isLoading } = useUserMemberships();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || memberships.length <= 1) {
    return null; // Don't show switcher if only one org or loading
  }

  const handleOrgSwitch = (orgSlug: string) => {
    navigate(`/${orgSlug}`);
    setIsOpen(false);
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? (
      <Crown className="h-3 w-3 text-amber-500" />
    ) : (
      <Users className="h-3 w-3 text-blue-500" />
    );
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge 
        variant={role === 'admin' ? 'default' : 'secondary'} 
        className="text-xs"
      >
        {role}
      </Badge>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 max-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentOrg?.logo_url ? (
              <img 
                src={currentOrg.logo_url} 
                alt={currentOrg.name}
                className="h-4 w-4 object-contain"
              />
            ) : (
              <Building className="h-4 w-4" />
            )}
            <span className="truncate text-sm">
              {currentOrg?.name || 'Select Organization'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Your Organizations ({memberships.length})
        </DropdownMenuLabel>
        
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.organization_id}
            onClick={() => handleOrgSwitch(membership.organization.slug)}
            className="flex items-center justify-between p-3 cursor-pointer"
            disabled={currentOrg?.id === membership.organization_id}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                {membership.organization.logo_url ? (
                  <img 
                    src={membership.organization.logo_url} 
                    alt={membership.organization.name}
                    className="h-5 w-5 object-contain flex-shrink-0"
                  />
                ) : (
                  <Building className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {membership.organization.name}
                  </div>
                  {membership.organization.tagline && (
                    <div className="text-xs text-muted-foreground truncate">
                      {membership.organization.tagline}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {getRoleIcon(membership.role)}
              {getRoleBadge(membership.role)}
              {currentOrg?.id === membership.organization_id && (
                <Badge variant="outline" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-xs text-muted-foreground justify-center"
          disabled
        >
          Switch between your organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}