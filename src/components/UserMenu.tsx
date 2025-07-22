import { useState } from "react";
import { User, Settings, LogOut, Moon, Sun, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
}

interface UserMenuProps {
  profile: UserProfile | null;
  onProfileUpdate: () => void;
  userRole?: string;
}

export function UserMenu({ profile, onProfileUpdate, userRole }: UserMenuProps) {
  const { signOut } = useAuth();
  const { setTheme } = useTheme();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigate to the org's auth page after logout
      const currentOrgSlug = organization?.slug || orgSlug;
      if (currentOrgSlug) {
        navigate(`/auth/${currentOrgSlug}`, { replace: true });
      } else {
        // Fallback to main auth page if no org slug
        navigate(`/auth`, { replace: true });
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if sign out fails, redirect to auth page
      const currentOrgSlug = organization?.slug || orgSlug;
      if (currentOrgSlug) {
        navigate(`/auth/${currentOrgSlug}`, { replace: true });
      } else {
        navigate(`/auth`, { replace: true });
      }
    }
  };

  const getUserDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.email) return profile.email.split('@')[0];
    return "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt={getUserDisplayName()} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{getUserDisplayName()}</p>
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {profile?.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          {userRole === 'admin' && (
            <DropdownMenuItem asChild>
              <Link to={`/${orgSlug}/admin`} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile} 
        onProfileUpdate={onProfileUpdate} 
      />
    </>
  );
}