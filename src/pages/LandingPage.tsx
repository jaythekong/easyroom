import { Button } from "@/components/ui/button";
import { Building, Calendar, Users, MapPin, ArrowRight, Star, Shield, Zap, BarChart3, Settings, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Easy Room</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Demo</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Multi-Tenant Room Booking Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Each organization gets its own private workspace, with fully isolated data, branding, and permissions. Perfect for coworking spaces, campuses, NGOs, and corporate environments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🔑 Built for Multi-Tenant Use</h2>
            <p className="text-xl text-muted-foreground">Each organization gets its own private workspace, with fully isolated data, branding, and permissions</p>
          </div>
          

          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">🧩 Core Features</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">✅ Room Booking Made Easy</h3>
              <p className="text-muted-foreground">Real-time availability, recurring meetings, conflict detection — all in a timeline or grid view.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Building className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">✅ Custom Branding per Organization</h3>
              <p className="text-muted-foreground">Logo, color theme, and timezone — give each org their own identity.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">✅ Role-Based Access</h3>
              <p className="text-muted-foreground">Admins manage rooms and bookings. Members just book what they need.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Settings className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">✅ Amenities & Maintenance Management</h3>
              <p className="text-muted-foreground">Attach Wi-Fi, projector, or whiteboard to each room. Block off downtime for cleaning or repairs.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Smartphone className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">✅ Fully Responsive Design</h3>
              <p className="text-muted-foreground">Works beautifully across desktop and mobile — no app download needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">💬 Use Cases</h2>
          <p className="text-xl text-muted-foreground mb-12">Perfect for organizations that need flexible, scalable room management</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="p-6 bg-background rounded-2xl shadow-sm">
              <div className="text-lg font-semibold text-primary mb-2">Coworking Spaces</div>
              <div className="text-muted-foreground">Managing 10+ tenants</div>
            </div>
            <div className="p-6 bg-background rounded-2xl shadow-sm">
              <div className="text-lg font-semibold text-primary mb-2">Universities</div>
              <div className="text-muted-foreground">Multiple departments</div>
            </div>
            <div className="p-6 bg-background rounded-2xl shadow-sm">
              <div className="text-lg font-semibold text-primary mb-2">NGOs</div>
              <div className="text-muted-foreground">Distributed teams</div>
            </div>
            <div className="p-6 bg-background rounded-2xl shadow-sm">
              <div className="text-lg font-semibold text-primary mb-2">Corporate Offices</div>
              <div className="text-muted-foreground">Standardizing scheduling</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">What teams are saying</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-background p-8 rounded-2xl">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-lg mb-4">"Easy Room has completely eliminated our meeting room chaos. Now everyone knows exactly which rooms are available and booking is instant."</p>
              <div className="font-semibold">Sarah Chen, Operations Manager</div>
            </div>
            
            <div className="bg-background p-8 rounded-2xl">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-lg mb-4">"The best room booking solution we've used. Simple, fast, and it just works. Our team productivity has increased significantly."</p>
              <div className="font-semibold">Marcus Rodriguez, Tech Lead</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-4">✅ Ready to Simplify Room Management?</h2>
          <p className="text-xl text-muted-foreground mb-8">Try the demo or book a call. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Try Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Easy Room</span>
          </div>
          <p className="text-muted-foreground">Smart room booking for modern workplaces</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;