import { Button } from "@/components/ui/button";
import { Building, Calendar, Users, MapPin, ArrowRight, Star, Shield, Zap, BarChart3, Settings, Smartphone, MessageCircle, Globe, Lock, Clock, Bell, Eye, UserCheck, Workflow, Database, Palette, Monitor, Coffee, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

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
            <ThemeToggle />
            <Button variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Features
            </Button>
            <Link to="/auth">
              <Button variant="outline">View Demo</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started Free</Button>
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
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
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

      {/* Key Highlights */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🔑 Built for Multi-Tenant Use</h2>
            <p className="text-xl text-muted-foreground">Each organization gets its own private workspace, with fully isolated data, branding, and permissions</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <Lock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Complete Data Isolation</h3>
              <p className="text-muted-foreground">Each organization's data is completely separate. No cross-contamination, ever.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <Palette className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">White-Label Ready</h3>
              <p className="text-muted-foreground">Custom logos, colors, and branding for each organization. Make it yours.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <Zap className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground">Real-time updates, instant bookings, and zero lag. Built for speed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🚀 Powerful Features</h2>
            <p className="text-xl text-muted-foreground">Everything you need to manage rooms efficiently</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Booking System</h3>
              <p className="text-muted-foreground">Real-time availability, recurring meetings, conflict detection — all in timeline or grid view.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-muted-foreground">Invite members, assign roles, and control access levels with granular permissions.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Advanced Security</h3>
              <p className="text-muted-foreground">Role-based access control, audit logs, and enterprise-grade security features.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Bell className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Notifications</h3>
              <p className="text-muted-foreground">Email alerts, Telegram integration, and real-time updates keep everyone informed.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
              <p className="text-muted-foreground">Track room utilization, booking patterns, and optimize your space usage.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Settings className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Room Management</h3>
              <p className="text-muted-foreground">Add amenities, set capacity, manage maintenance schedules, and configure availability.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Clock className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
              <p className="text-muted-foreground">Recurring bookings, time-based rules, and automatic conflict resolution.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Monitor className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Device Support</h3>
              <p className="text-muted-foreground">Works perfectly on desktop, tablet, and mobile. No app downloads required.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <MessageCircle className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Telegram Integration</h3>
              <p className="text-muted-foreground">Connect your bot for instant notifications and booking management via Telegram.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🎯 Enterprise Ready</h2>
            <p className="text-xl text-muted-foreground">Advanced features for serious organizations</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Data Sovereignty</h3>
                  <p className="text-muted-foreground">Complete control over your data with automatic backups and export capabilities.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <Workflow className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Custom Workflows</h3>
                  <p className="text-muted-foreground">Set up approval processes, booking rules, and automated notifications.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Audit Trail</h3>
                  <p className="text-muted-foreground">Complete visibility into all actions with detailed logging and reporting.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">SSO Integration</h3>
                  <p className="text-muted-foreground">Seamless integration with your existing authentication systems.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Multi-Timezone Support</h3>
                  <p className="text-muted-foreground">Perfect for global organizations with teams across different time zones.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <Coffee className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Resource Management</h3>
                  <p className="text-muted-foreground">Track equipment, catering, and other resources alongside room bookings.</p>
                </div>
              </div>
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
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
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