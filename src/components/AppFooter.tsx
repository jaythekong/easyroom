import { Heart } from "lucide-react";

export function AppFooter() {
  return (
    <div className="mt-6 text-center">
      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        Built with <Heart className="h-3 w-3 text-red-500 fill-current" /> in Cambodia
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Powered by Easyroom
      </p>
    </div>
  );
}