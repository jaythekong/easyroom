import { Button } from "@/components/ui/button";
import { Building, Calendar, Users, MapPin, ArrowRight, Star, Shield, Zap, BarChart3, Settings, Smartphone, MessageCircle, Globe, Lock, Clock, Bell, Eye, UserCheck, Workflow, Database, Palette, Monitor, Coffee, Wifi, Tv, MessageSquare, Radio } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppFooter } from "@/components/AppFooter";
import { useEffect } from "react";

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for authentication errors in URL hash (from password reset, etc.)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      // Redirect to auth page with error details
      navigate('/auth?error=auth_failed&details=' + encodeURIComponent(errorDescription || error));
    }
  }, [navigate]);
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
            <Link to="/demo">
              <Button variant="outline">Try Live Demo</Button>
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
            Stop the Chaos. Start Booking.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Tired of endless email threads and conflicting calendar invites just to book a meeting room? EasyRoom is the simple, secure, and smart way to manage your office spaces and teams, all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Try Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The Problem: When Booking Becomes a Burden</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Your team shouldn't have to navigate a maze of calendars and spreadsheets just to find an open room. Double-bookings, no-shows, and confusion about room amenities lead to lost time, frustration, and wasted resources.</p>
            <p className="text-lg font-medium text-primary mt-6">We believe that booking a space should be as easy as sending a message.</p>
          </div>
          
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The Solution: Effortless Room Management</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">EasyRoom is a modern room booking platform built for the way your team works. We handle all the complexities of scheduling, so you can focus on getting things done.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Real-Time Booking</h3>
              <p className="text-muted-foreground">Instantly see what's available and book in seconds, with intelligent conflict prevention built-in.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <Palette className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Make It Your Own</h3>
              <p className="text-muted-foreground">Customize your portal with your company's logo, colors, and branding. It feels like your own app, not a clunky third-party tool.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm text-center">
              <MessageCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Stay in Sync</h3>
              <p className="text-muted-foreground">Get real-time updates and notifications right where you work, with our seamless Telegram integration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Features Designed for Your Team</h2>
            <p className="text-xl text-muted-foreground">Everything you need to manage rooms efficiently</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <UserCheck className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Simple, Secure Onboarding</h3>
              <p className="text-muted-foreground">Skip the email chains. Invite your entire team with a single secure link. Users can join in seconds and get started immediately.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Globe className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Location & Multi-Team Ready</h3>
              <p className="text-muted-foreground">Whether you have one office or a dozen across different continents, EasyRoom's multi-tenant architecture keeps all your spaces, data, and teams organized and secure.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Powerful Admin Tools</h3>
              <p className="text-muted-foreground">Get a complete overview of your space utilization with our analytics dashboard. Manage room availability, track user activity, and optimize your office with actionable insights.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Unwavering Security and Privacy</h3>
              <p className="text-muted-foreground">Unlike other platforms, security is not an afterthought. Your data is completely isolated from every other company using EasyRoom. Our system is built with enterprise-grade security from the ground up.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Booking System</h3>
              <p className="text-muted-foreground">Real-time availability, smart scheduling, conflict detection — all in timeline or grid view.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-muted-foreground">Invite members, assign roles, and control access levels with granular permissions.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Clock className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
              <p className="text-muted-foreground">Smart scheduling, time-based rules, and automatic conflict resolution.</p>
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

            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Radio className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Ticker Display</h3>
              <p className="text-muted-foreground">Dynamic messaging system for announcements, updates, and real-time information on room displays.</p>
            </div>

            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <Tv className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Welcome Screen TV Mode</h3>
              <p className="text-muted-foreground">Customizable full-screen welcome displays with animations, branding, and dynamic content for room TVs.</p>
            </div>

            <div className="bg-background p-8 rounded-2xl shadow-sm border">
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dynamic Messaging</h3>
              <p className="text-muted-foreground">Scrolling tickers, custom fonts, colors, and flexible scheduling for room announcements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Signage Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">📺 Digital Signage & TV Integration</h2>
            <p className="text-xl text-muted-foreground">Transform your meeting room TVs into dynamic information displays</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="bg-background p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Tv className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Welcome Screen TV Mode</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Full-screen customizable welcome displays</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Beautiful animations with 5 speed levels (0=static to 5=very fast)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Custom fonts (Sans, Cursive, Elegant, Modern) for main & sub text</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Preset gradients or custom backgrounds & colors</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Organization branding with logo positioning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Text shadows & outlines for better readability</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-background p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Radio className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Smart Ticker System</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Scrolling news ticker for announcements & updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Multiple messages with custom colors & emojis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Adjustable scroll speed & message frequency</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Easy drag & drop message ordering</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Perfect for emergency alerts, event notices, and general info</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>Works seamlessly with room booking display</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <div className="bg-background p-8 rounded-2xl shadow-sm max-w-3xl mx-auto">
              <h3 className="text-2xl font-semibold mb-4">Perfect for Modern Workplaces</h3>
              <p className="text-muted-foreground text-lg">
                Turn any TV or display into an engaging information hub. Keep your team informed with real-time updates, 
                beautiful welcome messages, and important announcements - all managed from your admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">🎯 Ready to Simplify Your Spaces?</h2>
            <p className="text-xl text-muted-foreground">Start your free trial. No credit card required.</p>
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
            <Link to="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Try Live Demo
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
          <AppFooter />
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;