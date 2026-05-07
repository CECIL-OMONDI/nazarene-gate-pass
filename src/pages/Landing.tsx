import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2, Hammer, Route as RouteIcon, ShieldCheck,
  PhoneCall, Mail, MapPin, Menu, Star, ArrowUp,
} from "lucide-react";
import hero from "@/assets/hero-construction.jpg";

const NAV = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#contact", label: "Contact" },
];

export default function Landing() {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  if (typeof window !== "undefined") {
    window.onscroll = () => setShowTop(window.scrollY > 400);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="absolute top-0 inset-x-0 z-30">
        <nav className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-2 text-white min-w-0">
            <Building2 className="h-6 w-6 shrink-0 text-primary" />
            <span className="font-bold text-base sm:text-lg tracking-wide truncate">
              MBINGO CONSTRUCTION
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <a key={n.href} href={n.href}
                 className="text-white/90 hover:text-primary text-sm px-3 py-2">
                {n.label}
              </a>
            ))}
            <Link to="/login">
              <Button size="sm" className="ml-2 font-semibold">Login</Button>
            </Link>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> Mbingo
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">
                  {NAV.map(n => (
                    <SheetClose asChild key={n.href}>
                      <a href={n.href} className="rounded-md px-3 py-2 text-sm hover:bg-accent">
                        {n.label}
                      </a>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link to="/login" className="mt-2">
                      <Button className="w-full">Login</Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/signup">
                      <Button variant="outline" className="w-full mt-2">Sign Up</Button>
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-[88vh] sm:min-h-[560px] w-full overflow-hidden flex items-center">
        <img src={hero} alt="Construction site at sunset" width={1920} height={1080}
             className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-secondary/40" />
        <div className="relative container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl text-secondary-foreground">
            <span className="inline-block bg-primary text-primary-foreground text-[10px] sm:text-xs font-semibold tracking-wider px-3 py-1 rounded-full mb-4">
              BUILDING KENYA, ONE FOUNDATION AT A TIME
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">
              Your dream house <span className="text-primary">is our design.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-secondary-foreground/80 mb-6 sm:mb-8 max-w-xl">
              Mbingo Construction is a trusted partner for residential, commercial,
              and infrastructure projects. We build with integrity, modern tools,
              and skilled craftsmanship.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact"><Button size="lg" className="font-semibold">Get a Quote</Button></a>
              <a href="#services">
                <Button size="lg" variant="outline"
                        className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white">
                  Our Services
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 sm:py-20 container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">What We Build</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From family homes to highways, we deliver projects that stand the test of time.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { icon: Hammer, title: "Residential & Commercial", body: "Modern homes, apartments and commercial buildings constructed to international standards." },
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

      {/* About */}
      <section id="about" className="bg-secondary text-secondary-foreground py-16 sm:py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Built on Trust. Powered by Discipline.
            </h2>
            <p className="text-secondary-foreground/80 mb-4">
              For over a decade, Mbingo Construction has delivered residential, commercial,
              and road projects across the country. Our edge is a transparent supply chain —
              every bag of cement, every metre of steel is tracked from yard to site.
            </p>
            <p className="text-secondary-foreground/80">
              We invest in our people, our tools, and our processes — so you get quality on
              time and on budget.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {[
              ["120+", "Projects Delivered"],
              ["48", "Active Sites"],
              ["10+", "Years of Experience"],
              ["350+", "Skilled Workers"],
            ].map(([n, l]) => (
              <div key={l} className="bg-secondary-foreground/5 border border-secondary-foreground/10 rounded-lg p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary">{n}</div>
                <div className="text-xs sm:text-sm text-secondary-foreground/70 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-20 container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">What Our Clients Say</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Honest words from the people we've built for.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { name: "Grace Wanjiru", role: "Homeowner, Kiambu", body: "They finished our 4-bedroom on time and on budget. The site was always organized and clean." },
            { name: "Eng. Peter Otieno", role: "County Engineer", body: "Their road works are top-tier. Transparent reporting and disciplined crews — exactly what we need." },
            { name: "Achieng Holdings", role: "Commercial Client", body: "From design to handover, Mbingo treated our project like their own. Highly recommended." },
          ].map(t => (
            <Card key={t.name} className="border-border">
              <CardContent className="pt-6">
                <div className="flex gap-1 text-primary mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">"{t.body}"</p>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="bg-card rounded-lg border">
            {[
              { q: "What areas do you serve?", a: "We operate across Kenya with active sites in Nairobi, Kiambu, Kisumu, Mombasa, and surrounding regions." },
              { q: "How do I get a quote?", a: "Use the contact form or call us. We'll arrange a site visit and send a detailed quotation within 3-5 working days." },
              { q: "Do you handle small renovations?", a: "Yes — from a single room renovation to a full estate, our teams scale to the project." },
              { q: "How do you track materials?", a: "Every order moves through our digital supply chain — from yard dispatch to site receipt — with full audit trails." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`q-${i}`} className="px-4">
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 sm:py-20 container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Get in Touch</h2>
          <p className="text-muted-foreground">Tell us about your project. We'll get back within 24 hours.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {[
            { icon: PhoneCall, title: "Call us", body: "+254 700 000 000" },
            { icon: Mail, title: "Email", body: "info@mbingo.co.ke" },
            { icon: MapPin, title: "Office", body: "Industrial Area, Nairobi" },
          ].map((c) => (
            <Card key={c.title} className="text-center">
              <CardContent className="pt-6">
                <c.icon className="h-6 w-6 mx-auto text-primary mb-2" />
                <div className="font-semibold">{c.title}</div>
                <div className="text-muted-foreground text-sm break-words">{c.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground/80 py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row gap-4 items-center justify-between text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-sm">© {new Date().getFullYear()} Mbingo Construction. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm">
            <a href="#services" className="hover:text-primary">Services</a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#testimonials" className="hover:text-primary">Testimonials</a>
            <Link to="/signup" className="hover:text-primary">Sign Up</Link>
            <Link to="/login" className="hover:text-primary font-semibold underline underline-offset-4">
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
