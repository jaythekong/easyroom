import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Building } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

interface DemoUserMenuProps {
  profile: any;
  onProfileUpdate: () => void;
  userRole: string;
}

export function DemoUserMenu({ profile, onProfileUpdate, userRole }: DemoUserMenuProps) {
  const { user, organization } = useDemoContext();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Demo User';
  const initials = getInitials(displayName);

  const handleSignOut = () => {
    console.log('Demo mode - sign out clicked');
    window.location.href = '/';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile?.email || user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Demo Mode
              </span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                {userRole}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer" disabled>
          <Building className="mr-2 h-4 w-4" />
          <span>{organization.name}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer" disabled>
          <User className="mr-2 h-4 w-4" />
          <span>Profile (Demo)</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" disabled>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings (Demo)</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Exit Demo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}