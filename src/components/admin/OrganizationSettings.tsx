import { useState, useEffect } from "react";
import { Settings, Globe, Check, AlertCircle, Copy, Upload, Palette, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HexColorPicker } from "react-colorful";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  timezone?: string;
  tagline?: string;
  created_at: string;
}

export function OrganizationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization: contextOrg } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ea580c");
  
  const [tagline, setTagline] = useState("Find and book your perfect meeting space");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [originalLogoUrl, setOriginalLogoUrl] = useState("");
  const [originalPrimaryColor, setOriginalPrimaryColor] = useState("#ea580c");
  
  const [originalTagline, setOriginalTagline] = useState("Find and book your perfect meeting space");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);


  useEffect(() => {
    if (contextOrg?.id) {
      fetchOrganization();
    }
  }, [contextOrg?.id]);

  const fetchOrganization = async () => {
    if (!contextOrg?.id) return;

    try {
      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', contextOrg.id)
        .single();

      if (orgError) throw orgError;

      setOrganization(org);
      setOrgName(org.name);
      setSubdomain(org.slug);
      setLogoUrl(org.logo_url || "");
      setPrimaryColor(org.primary_color || "#ea580c");
      
      setTagline(org.tagline || "Find and book your perfect meeting space");
      setOriginalSubdomain(org.slug);
      setOriginalLogoUrl(org.logo_url || "");
      setOriginalPrimaryColor(org.primary_color || "#ea580c");
      
      setOriginalTagline(org.tagline || "Find and book your perfect meeting space");
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
        variant: "destructive",
      });
    }
  };

  const checkSubdomainAvailability = async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck === originalSubdomain) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slugToCheck)
        .neq('id', organization?.id || '');

      if (error) throw error;

      setIsAvailable(data.length === 0);
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    setSubdomain(cleanSlug);
    
    // Debounce the availability check
    setTimeout(() => {
      checkSubdomainAvailability(cleanSlug);
    }, 500);
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploadingLogo(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${organization?.id}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, fileType: file.type, fileSize: file.size });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
      
      toast({
        title: "Logo uploaded!",
        description: "Your organization logo has been updated.",
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const saveSettings = async () => {
    if (!organization || !orgName.trim() || !subdomain.trim()) return;

    if (isAvailable === false) {
      toast({
        title: "Subdomain unavailable",
        description: "Please choose a different subdomain",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName.trim(),
          slug: subdomain.trim(),
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          
          tagline: tagline.trim(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOriginalSubdomain(subdomain);
      setOriginalLogoUrl(logoUrl);
      setOriginalPrimaryColor(primaryColor);
      
      setOriginalTagline(tagline);
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully",
      });

      // Refresh data
      fetchOrganization();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySubdomainUrl = async () => {
    const pathUrl = `https://easyroom.asia/${subdomain}`;
    await navigator.clipboard.writeText(pathUrl);
    toast({
      title: "Copied!",
      description: "Subdomain URL copied to clipboard",
    });
  };


  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  const hasChanges = orgName !== organization.name || 
    subdomain !== originalSubdomain || 
    logoUrl !== originalLogoUrl || 
    primaryColor !== originalPrimaryColor ||
    
    tagline !== originalTagline;
  const canSave = hasChanges && orgName.trim() && subdomain.trim() && isAvailable !== false;

  return (
    <div className="space-y-6">
      {/* Branding & Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding & Customization
          </CardTitle>
          <CardDescription>
            Customize your organization's visual appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Organization Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={logoUrl} alt={organization.name} />
                <AvatarFallback className="text-lg">
                  {organization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={uploadLogo}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
                <Label htmlFor="logo-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span className="flex items-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                    </span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, 200x200px or larger
                </p>
              </div>
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-3">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[100px] h-10 p-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="w-full h-full rounded border-2 border-white/20" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="bottom" align="start">
                  <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="color-input" className="text-sm">Hex Color</Label>
                    <Input
                      id="color-input"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#000000"
                      className="h-8"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <div>
                <p className="text-sm font-medium">{primaryColor}</p>
                <p className="text-xs text-muted-foreground">
                  This color will be used for buttons, links, and accents throughout your organization
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Settings
          </CardTitle>
          <CardDescription>
            Manage your organization's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Find and book your perfect meeting space"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This tagline will appear on your organization's dashboard
            </p>
          </div>


          <div>
            <Label htmlFor="orgId">Organization ID</Label>
            <Input
              id="orgId"
              value={organization.id}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This is your unique organization identifier (read-only)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subdomain Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Organization Path Setup
          </CardTitle>
          <CardDescription>
            Configure your organization's custom path for branded access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subdomain">Organization Path</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="your-company"
                />
                {isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!isChecking && isAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              
              {isAvailable === true && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Path is available
                </p>
              )}
              {isAvailable === false && (
                <p className="text-sm text-destructive mt-1">
                  ✗ Path is already taken
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                Your organization will be accessible at: <code className="bg-muted px-1 rounded">https://easyroom.asia/{subdomain || 'your-org'}</code>
              </p>
            </div>
          </div>
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Current Path</p>
              <p className="text-sm text-muted-foreground">
                https://easyroom.asia/{originalSubdomain}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySubdomainUrl}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOrgName(organization.name);
                setSubdomain(originalSubdomain);
                setLogoUrl(originalLogoUrl);
                setPrimaryColor(originalPrimaryColor);
                
                setIsAvailable(null);
              }}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!canSave || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Path Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Organization paths must be 3-63 characters long and contain only letters, numbers, and hyphens</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Changes take effect immediately - your organization will be accessible at the new path</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Your old path will redirect to the new one automatically</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}