import { useState, useEffect } from "react";
import { Monitor, Type, Palette, Play, Save, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { useWelcomeScreenSettings, useUpdateWelcomeScreenSettings } from "@/hooks/useWelcomeScreen";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function WelcomeScreenManagement() {
  const { organization } = useOrganization();
  const { data: settings, isLoading } = useWelcomeScreenSettings(organization?.id);
  const updateSettings = useUpdateWelcomeScreenSettings();
  const { toast } = useToast();

  // Form state
  const [welcomeText, setWelcomeText] = useState("Welcome!");
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'image' | 'color'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState("linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontSize, setFontSize] = useState<'text-4xl' | 'text-5xl' | 'text-6xl' | 'text-7xl' | 'text-8xl'>('text-6xl');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [animationType, setAnimationType] = useState<'floating' | 'pulse' | 'fade' | 'slide'>('floating');
  const [isActive, setIsActive] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Load settings when they change
  useEffect(() => {
    if (settings) {
      setWelcomeText(settings.welcome_text);
      setBackgroundType(settings.background_type);
      setBackgroundValue(settings.background_value);
      setTextColor(settings.text_color);
      setFontSize(settings.font_size);
      setAnimationEnabled(settings.animation_enabled);
      setAnimationType(settings.animation_type);
      setIsActive(settings.is_active);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!organization?.id) return;

    await updateSettings.mutateAsync({
      organization_id: organization.id,
      welcome_text: welcomeText,
      background_type: backgroundType,
      background_value: backgroundValue,
      text_color: textColor,
      font_size: fontSize,
      animation_enabled: animationEnabled,
      animation_type: animationType,
      is_active: isActive,
    });
  };

  const uploadBackgroundImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploadingImage(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `welcome-bg-${organization?.id}.${fileExt}`;
      const filePath = `welcome-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setBackgroundValue(data.publicUrl);
      setBackgroundType('image');
      
      toast({
        title: "Background uploaded!",
        description: "Your welcome screen background has been updated.",
      });
    } catch (error: any) {
      console.error('Background upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload background image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const openPreview = () => {
    if (!organization?.slug) return;
    window.open(`/${organization.slug}/welcome`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading welcome screen settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Welcome Screen Settings
          </CardTitle>
          <CardDescription>
            Configure your meeting room TV welcome screen with customizable text, backgrounds, and animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="text">Text Style</TabsTrigger>
              <TabsTrigger value="animation">Animation</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="welcomeText">Welcome Message</Label>
                <Textarea
                  id="welcomeText"
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  placeholder="Welcome to our office!"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  The main welcome message displayed on the screen
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Enable Welcome Screen</Label>
              </div>
            </TabsContent>

            <TabsContent value="background" className="space-y-4">
              <div>
                <Label>Background Type</Label>
                <Select value={backgroundType} onValueChange={(value: 'gradient' | 'image' | 'color') => setBackgroundType(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="color">Solid Color</SelectItem>
                    <SelectItem value="image">Background Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {backgroundType === 'gradient' && (
                <div>
                  <Label htmlFor="gradientValue">CSS Gradient</Label>
                  <Input
                    id="gradientValue"
                    value={backgroundValue}
                    onChange={(e) => setBackgroundValue(e.target.value)}
                    placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use CSS gradient syntax or design system variables
                  </p>
                </div>
              )}

              {backgroundType === 'color' && (
                <div>
                  <Label>Background Color</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-[100px] h-10 p-1"
                          style={{ backgroundColor: backgroundValue }}
                        >
                          <div className="w-full h-full rounded border-2 border-white/20" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" side="bottom">
                        <HexColorPicker color={backgroundValue} onChange={setBackgroundValue} />
                        <Input
                          value={backgroundValue}
                          onChange={(e) => setBackgroundValue(e.target.value)}
                          placeholder="#000000"
                          className="mt-3 h-8"
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm">{backgroundValue}</span>
                  </div>
                </div>
              )}

              {backgroundType === 'image' && (
                <div>
                  <Label>Background Image</Label>
                  <div className="mt-2 space-y-2">
                    <input
                      type="file"
                      id="background-upload"
                      accept="image/*"
                      onChange={uploadBackgroundImage}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <Label htmlFor="background-upload">
                      <Button variant="outline" size="sm" asChild>
                        <span className="flex items-center gap-2 cursor-pointer">
                          <Upload className="h-4 w-4" />
                          {isUploadingImage ? "Uploading..." : "Upload Image"}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      value={backgroundValue}
                      onChange={(e) => setBackgroundValue(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload an image or enter a URL. Recommended: 1920x1080px or larger
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label>Text Color</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[100px] h-10 p-1"
                        style={{ backgroundColor: textColor }}
                      >
                        <div className="w-full h-full rounded border-2 border-white/20" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" side="bottom">
                      <HexColorPicker color={textColor} onChange={setTextColor} />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="#FFFFFF"
                        className="mt-3 h-8"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm">{textColor}</span>
                </div>
              </div>

              <div>
                <Label>Font Size</Label>
                <Select value={fontSize} onValueChange={(value: typeof fontSize) => setFontSize(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-4xl">Extra Large (4xl)</SelectItem>
                    <SelectItem value="text-5xl">Huge (5xl)</SelectItem>
                    <SelectItem value="text-6xl">Massive (6xl)</SelectItem>
                    <SelectItem value="text-7xl">Gigantic (7xl)</SelectItem>
                    <SelectItem value="text-8xl">Enormous (8xl)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="animation" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="animationEnabled"
                  checked={animationEnabled}
                  onCheckedChange={setAnimationEnabled}
                />
                <Label htmlFor="animationEnabled">Enable Animations</Label>
              </div>

              {animationEnabled && (
                <div>
                  <Label>Animation Type</Label>
                  <Select value={animationType} onValueChange={(value: typeof animationType) => setAnimationType(value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="floating">Floating</SelectItem>
                      <SelectItem value="pulse">Pulse</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the animation style for the welcome text
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 border-t">
            <Button variant="outline" onClick={openPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" asChild>
              <a href={`/${organization?.slug}/welcome`} target="_blank" rel="noopener noreferrer">
                <Monitor className="h-4 w-4 mr-2" />
                Open Welcome Screen
              </a>
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}