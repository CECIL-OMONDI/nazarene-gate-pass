import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Hammer, Route as RouteIcon, ShieldCheck, PhoneCall, Mail, MapPin } from "lucide-react";
import hero from "@/assets/hero-construction.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="absolute top-0 inset-x-0 z-20">
        <nav className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2 text-white">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg tracking-wide">MBINGO CONSTRUCTION</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#services" className="hidden md:inline text-white/90 hover:text-primary text-sm px-3">Services</a>
            <a href="#about" className="hidden md:inline text-white/90 hover:text-primary text-sm px-3">About</a>
            <a href="#contact" className="hidden md:inline text-white/90 hover:text-primary text-sm px-3">Contact</a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
        <img src={hero} alt="Construction site at sunset" width={1920} height={1080}
             className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/70 to-transparent" />
        <div className="relative container mx-auto h-full flex items-center px-4">
          <div className="max-w-2xl text-secondary-foreground">
            <span className="inline-block bg-primary text-primary-foreground text-xs font-semibold tracking-wider px-3 py-1 rounded-full mb-4">
              BUILDING KENYA, ONE FOUNDATION AT A TIME
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
              Your dream house <span className="text-primary">is our design.</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/80 mb-8 max-w-xl">
              Mbingo Construction is a trusted partner for residential, commercial, and infrastructure projects.
              We build with integrity, modern tools, and skilled craftsmanship.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact"><Button size="lg" className="font-semibold">Get a Quote</Button></a>
              <a href="#services"><Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white">Our Services</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">What We Build</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From family homes to highways, we deliver projects that stand the test of time.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Hammer, title: "Residential & Commercial Houses", body: "Modern homes, apartments and commercial buildings constructed to international standards." },
            { icon: RouteIcon, title: "Roads & Infrastructure", body: "Tarmac roads, murram roads, drainage systems and large-scale civil works." },
            { icon: ShieldCheck, title: "Project Management", body: "End-to-end supervision with transparent inventory tracking and on-time delivery." },
          ].map((s) => (
            <Card key={s.title} className="border-border hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* About / numbers */}
      <section id="about" className="bg-secondary text-secondary-foreground py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built on Trust. Powered by Discipline.</h2>
            <p className="text-secondary-foreground/80 mb-4">
              For over a decade, Mbingo Construction has delivered residential, commercial, and road projects across the country.
              Our edge is a transparent supply chain — every bag of cement, every metre of steel is tracked from yard to site.
            </p>
            <p className="text-secondary-foreground/80">
              We invest in our people, our tools, and our processes — so you get quality on time and on budget.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              ["120+", "Projects Delivered"],
              ["48", "Active Sites"],
              ["10+", "Years of Experience"],
              ["350+", "Skilled Workers"],
            ].map(([n, l]) => (
              <div key={l} className="bg-secondary-foreground/5 border border-secondary-foreground/10 rounded-lg p-6">
                <div className="text-4xl font-extrabold text-primary">{n}</div>
                <div className="text-sm text-secondary-foreground/70 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Get in Touch</h2>
          <p className="text-muted-foreground">Tell us about your project. We'll get back within 24 hours.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: PhoneCall, title: "Call us", body: "+254 700 000 000" },
            { icon: Mail, title: "Email", body: "info@mbingo.co.ke" },
            { icon: MapPin, title: "Office", body: "Industrial Area, Nairobi" },
          ].map((c) => (
            <Card key={c.title} className="text-center">
              <CardContent className="pt-6">
                <c.icon className="h-6 w-6 mx-auto text-primary mb-2" />
                <div className="font-semibold">{c.title}</div>
                <div className="text-muted-foreground text-sm">{c.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer with internal app link */}
      <footer className="bg-secondary text-secondary-foreground/80 py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>© {new Date().getFullYear()} Mbingo Construction. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#services" className="hover:text-primary">Services</a>
            <a href="#about" className="hover:text-primary">About</a>
            <Link to="/signup" className="hover:text-primary">Sign Up</Link>
            <Link to="/login" className="hover:text-primary font-semibold underline underline-offset-4">
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
