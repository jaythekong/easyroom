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
  const [subText, setSubText] = useState("");
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'image' | 'color'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState("linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [subTextColor, setSubTextColor] = useState("#FFFFFF");
  const [fontSize, setFontSize] = useState<'text-4xl' | 'text-5xl' | 'text-6xl' | 'text-7xl' | 'text-8xl'>('text-6xl');
  const [subTextSize, setSubTextSize] = useState<'text-lg' | 'text-xl' | 'text-2xl' | 'text-3xl' | 'text-4xl'>('text-2xl');
  const [fontFamily, setFontFamily] = useState<'font-sans' | 'font-cursive' | 'font-elegant' | 'font-modern'>('font-sans');
  const [subFontFamily, setSubFontFamily] = useState<'font-sans' | 'font-cursive' | 'font-elegant' | 'font-modern'>('font-sans');
  const [textShadow, setTextShadow] = useState(true);
  const [textOutline, setTextOutline] = useState(false);
  const [logoPosition, setLogoPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-bottom'>('bottom-right');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [animationType, setAnimationType] = useState<'floating' | 'pulse' | 'fade' | 'slide'>('floating');
  const [animationSpeed, setAnimationSpeed] = useState<number>(3);
  const [isActive, setIsActive] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Load settings when they change
  useEffect(() => {
    if (settings) {
      setWelcomeText(settings.welcome_text || "Welcome!");
      setSubText(settings.sub_text || "");
      setBackgroundType(settings.background_type || "gradient");
      setBackgroundValue(settings.background_value || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))");
      setTextColor(settings.text_color || "#FFFFFF");
      setSubTextColor(settings.sub_text_color || "#FFFFFF");
      setFontSize(settings.font_size || "text-6xl");
      setSubTextSize(settings.sub_text_size || "text-2xl");
      setFontFamily(settings.font_family || "font-sans");
      setSubFontFamily(settings.sub_font_family || "font-sans");
      setTextShadow(settings.text_shadow ?? true);
      setTextOutline(settings.text_outline ?? false);
      setLogoPosition(settings.logo_position || "bottom-right");
      setAnimationEnabled(settings.animation_enabled ?? true);
      setAnimationType(settings.animation_type || "floating");
      setAnimationSpeed(settings.animation_speed || 3);
      setIsActive(settings.is_active ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!organization?.id) return;

    await updateSettings.mutateAsync({
      organization_id: organization.id,
      welcome_text: welcomeText,
      sub_text: subText,
      background_type: backgroundType,
      background_value: backgroundValue,
      text_color: textColor,
      sub_text_color: subTextColor,
      font_size: fontSize,
      sub_text_size: subTextSize,
      font_family: fontFamily,
      sub_font_family: subFontFamily,
      text_shadow: textShadow,
      text_outline: textOutline,
      logo_position: logoPosition,
      animation_enabled: animationEnabled,
      animation_type: animationType,
      animation_speed: animationSpeed,
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
      const fileName = `welcome-bg-${organization?.id}-${Date.now()}.${fileExt}`;
      const filePath = `welcome-backgrounds/${organization?.id}/${fileName}`;

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content & Text Style</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="animation">Animation</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="welcomeText">Main Welcome Text</Label>
                <Textarea
                  id="welcomeText"
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  placeholder="Welcome to our office!"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  The main welcome message displayed prominently
                </p>
              </div>

              <div>
                <Label htmlFor="subText">Sub Text (Optional)</Label>
                <Textarea
                  id="subText"
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder="A subtitle or additional message..."
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Secondary text displayed below the main message
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

              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Text Styling
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Main Text Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-[80px] h-10 p-1"
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
                      <span className="text-xs">{textColor}</span>
                    </div>
                  </div>

                  <div>
                    <Label>Sub Text Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-[80px] h-10 p-1"
                            style={{ backgroundColor: subTextColor }}
                          >
                            <div className="w-full h-full rounded border-2 border-white/20" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" side="bottom">
                          <HexColorPicker color={subTextColor} onChange={setSubTextColor} />
                          <Input
                            value={subTextColor}
                            onChange={(e) => setSubTextColor(e.target.value)}
                            placeholder="#FFFFFF"
                            className="mt-3 h-8"
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs">{subTextColor}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Main Text Size</Label>
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

                  <div>
                    <Label>Sub Text Size</Label>
                    <Select value={subTextSize} onValueChange={(value: typeof subTextSize) => setSubTextSize(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-lg">Large (lg)</SelectItem>
                        <SelectItem value="text-xl">Extra Large (xl)</SelectItem>
                        <SelectItem value="text-2xl">2X Large (2xl)</SelectItem>
                        <SelectItem value="text-3xl">3X Large (3xl)</SelectItem>
                        <SelectItem value="text-4xl">4X Large (4xl)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Main Text Font Style</Label>
                    <Select value={fontFamily} onValueChange={(value: 'font-sans' | 'font-cursive' | 'font-elegant' | 'font-modern') => setFontFamily(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="font-sans">Sans Serif (Default)</SelectItem>
                        <SelectItem value="font-cursive">Cursive (Dancing Script)</SelectItem>
                        <SelectItem value="font-elegant">Elegant (Playfair)</SelectItem>
                        <SelectItem value="font-modern">Modern (Inter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sub Text Font Style</Label>
                    <Select value={subFontFamily} onValueChange={(value: 'font-sans' | 'font-cursive' | 'font-elegant' | 'font-modern') => setSubFontFamily(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="font-sans">Sans Serif (Default)</SelectItem>
                        <SelectItem value="font-cursive">Cursive (Dancing Script)</SelectItem>
                        <SelectItem value="font-elegant">Elegant (Playfair)</SelectItem>
                        <SelectItem value="font-modern">Modern (Inter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Text Shadow</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        id="textShadow"
                        checked={textShadow}
                        onCheckedChange={setTextShadow}
                      />
                      <Label htmlFor="textShadow" className="text-sm">Enable shadow</Label>
                    </div>
                  </div>

                  <div>
                    <Label>Text Outline</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        id="textOutline"
                        checked={textOutline}
                        onCheckedChange={setTextOutline}
                      />
                      <Label htmlFor="textOutline" className="text-sm">Enable outline</Label>
                    </div>
                  </div>

                  <div>
                    <Label>Logo Position</Label>
                    <Select value={logoPosition} onValueChange={(value: typeof logoPosition) => setLogoPosition(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="center-bottom">Center Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                <div className="space-y-4">
                  <div>
                    <Label>Preset Gradients</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #667eea 0%, #764ba2 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                      >
                        <span className="text-white text-xs">Purple Blue</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
                      >
                        <span className="text-white text-xs">Pink Red</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}
                      >
                        <span className="text-white text-xs">Blue Cyan</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}
                      >
                        <span className="text-white text-xs">Green Mint</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #fa709a 0%, #fee140 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}
                      >
                        <span className="text-white text-xs">Pink Yellow</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" }}
                      >
                        <span className="text-gray-700 text-xs">Soft White</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" }}
                      >
                        <span className="text-gray-700 text-xs">Rose White</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)" }}
                      >
                        <span className="text-gray-700 text-xs">Blue White</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBackgroundValue("linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)")}
                        className="h-12 p-1"
                        style={{ background: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)" }}
                      >
                        <span className="text-gray-700 text-xs">Lavender Cream</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="gradientValue">Custom CSS Gradient</Label>
                    <Input
                      id="gradientValue"
                      value={backgroundValue}
                      onChange={(e) => setBackgroundValue(e.target.value)}
                      placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use CSS gradient syntax or select from presets above
                    </p>
                  </div>
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

                {animationEnabled && (
                  <div>
                    <Label>Animation Speed (0 = Static, 5 = Very Fast)</Label>
                    <Select value={animationSpeed.toString()} onValueChange={(value) => setAnimationSpeed(parseInt(value))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Static (No Animation)</SelectItem>
                        <SelectItem value="1">1 - Very Slow</SelectItem>
                        <SelectItem value="2">2 - Slow</SelectItem>
                        <SelectItem value="3">3 - Normal</SelectItem>
                        <SelectItem value="4">4 - Fast</SelectItem>
                        <SelectItem value="5">5 - Very Fast</SelectItem>
                      </SelectContent>
                    </Select>
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