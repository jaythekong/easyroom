import { Button } from "@/components/ui/button";
import { Building, Calendar, Users, MapPin, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Roomer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/kampus">
              <Button variant="ghost">Demo</Button>
            </Link>
            <Link to="/kampus/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Find & Book Meeting Rooms Instantly
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your workplace with smart room booking. No more conflicts, no more confusion - just seamless space management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/kampus/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/kampus">
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
            <h2 className="text-4xl font-bold mb-4">Everything you need to manage spaces</h2>
            <p className="text-xl text-muted-foreground">Powerful features that make room booking effortless</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">Intelligent booking system that prevents conflicts and optimizes room utilization.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">Book rooms for your team, manage recurring meetings, and coordinate effortlessly.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <MapPin className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Availability</h3>
              <p className="text-muted-foreground">See which rooms are available right now with live status updates.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Access Control</h3>
              <p className="text-muted-foreground">Manage who can book which rooms with flexible permission settings.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Zap className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Book a room in seconds with our intuitive interface and quick booking flow.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm">
              <Building className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Organization</h3>
              <p className="text-muted-foreground">Perfect for companies with multiple offices, departments, or client organizations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">See how Roomer transforms workplaces</h2>
          <p className="text-xl text-muted-foreground mb-12">Join organizations that have streamlined their space management</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-muted-foreground">Reduction in booking conflicts</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">60%</div>
              <div className="text-muted-foreground">Faster room booking process</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">100+</div>
              <div className="text-muted-foreground">Organizations trust Roomer</div>
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
              <p className="text-lg mb-4">"Roomer has completely eliminated our meeting room chaos. Now everyone knows exactly which rooms are available and booking is instant."</p>
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
          <h2 className="text-4xl font-bold mb-4">Ready to transform your workspace?</h2>
          <p className="text-xl text-muted-foreground mb-8">Join hundreds of organizations using Roomer to streamline their meeting room management</p>
          <Link to="/kampus/auth">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Roomer</span>
          </div>
          <p className="text-muted-foreground">Smart room booking for modern workplaces</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;