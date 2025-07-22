import { Progress } from "@/components/ui/progress";
import { getPasswordStrength } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, feedback } = getPasswordStrength(password);
  
  if (!password) return null;
  
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const strengthColor = [
    'bg-destructive',
    'bg-orange-500',
    'bg-yellow-500', 
    'bg-blue-500',
    'bg-green-500'
  ][score];
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={cn(
          "text-sm font-medium",
          score <= 1 && "text-destructive",
          score === 2 && "text-orange-500",
          score === 3 && "text-yellow-600",
          score === 4 && "text-blue-500",
          score === 5 && "text-green-600"
        )}>
          {strengthText}
        </span>
      </div>
      
      <Progress 
        value={(score / 5) * 100} 
        className="h-2"
      />
      
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 bg-muted-foreground rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}