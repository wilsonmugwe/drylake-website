import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Solutions from "@/components/sections/Solutions";
import Approach from "@/components/sections/Approach";
import About from "@/components/sections/About";
import ContactCTA from "@/components/sections/ContactCTA";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Solutions />
      <Approach />
      <About />
      <ContactCTA />
      <Footer />
    </main>
  );
}