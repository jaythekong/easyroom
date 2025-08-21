import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useDynamicFavicon() {
  const { organization } = useOrganization();

  useEffect(() => {
    const updateFavicon = () => {
      const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
      
      if (faviconLink) {
        // Use organization logo if available, otherwise default to Easy Room logo
        const faviconUrl = organization?.logo_url || '/lovable-uploads/6721bbed-4f17-4518-8a39-2d4732849214.png';
        faviconLink.href = faviconUrl;
      }
    };

    updateFavicon();
  }, [organization?.logo_url]);
}