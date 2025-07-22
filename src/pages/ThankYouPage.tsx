import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ThankYouPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  useEffect(() => {
    // Create firework particles
    const createFirework = () => {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.cssText = `
        position: fixed;
        top: 20%;
        left: ${Math.random() * 100}%;
        width: 4px;
        height: 4px;
        background: hsl(var(--primary));
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        animation: firework 1.5s ease-out forwards;
      `;
      document.body.appendChild(firework);

      setTimeout(() => {
        if (document.body.contains(firework)) {
          document.body.removeChild(firework);
        }
      }, 1500);
    };

    // Create multiple fireworks
    const interval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => createFirework(), i * 200);
      }
    }, 800);

    // Add firework animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes firework {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        50% {
          transform: translateY(-100px) scale(1.5);
          opacity: 1;
        }
        100% {
          transform: translateY(-200px) scale(0);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      clearInterval(interval);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="space-y-4">
            <div className="text-4xl">🎉</div>
            <h1 className="text-2xl font-semibold">Thank you!</h1>
            <p className="text-muted-foreground">
              You have been successfully signed out.
            </p>
          </div>
          
          <Button asChild className="w-full">
            <Link to={orgSlug ? `/auth/${orgSlug}` : "/auth"}>
              Back to Sign In
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}