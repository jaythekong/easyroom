import { useSearchParams } from "react-router-dom";
import { AccessDenied } from "@/components/AccessDenied";

export function AccessDeniedPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug') || 'unknown';
  
  return <AccessDenied orgSlug={slug} />;
}