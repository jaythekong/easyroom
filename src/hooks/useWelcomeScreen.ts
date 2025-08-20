import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WelcomeScreenSettings {
  id: string;
  organization_id: string;
  welcome_text: string;
  background_type: 'gradient' | 'image' | 'color';
  background_value: string;
  text_color: string;
  font_size: 'text-4xl' | 'text-5xl' | 'text-6xl' | 'text-7xl' | 'text-8xl';
  font_family: 'font-sans' | 'font-cursive' | 'font-elegant' | 'font-modern';
  text_shadow: boolean;
  text_outline: boolean;
  logo_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-bottom';
  animation_enabled: boolean;
  animation_type: 'floating' | 'pulse' | 'fade' | 'slide';
  animation_speed: 'slow' | 'normal' | 'fast';
  is_active: boolean;
}

export function useWelcomeScreenSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['welcome-screen-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('welcome_screen_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as WelcomeScreenSettings | null;
    },
    enabled: !!organizationId,
  });
}

export function useUpdateWelcomeScreenSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<WelcomeScreenSettings> & { organization_id: string }) => {
      const { data, error } = await supabase
        .from('welcome_screen_settings')
        .upsert(settings, {
          onConflict: 'organization_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['welcome-screen-settings', data.organization_id] });
      toast({
        title: "Settings saved",
        description: "Welcome screen settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error saving welcome screen settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save welcome screen settings",
        variant: "destructive",
      });
    },
  });
}