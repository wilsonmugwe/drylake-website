import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/sections/Hero";
import Problems from "@/components/sections/Problems";
import Solutions from "@/components/sections/Solutions";
import Founders from "@/components/sections/Founders";
import Approach from "@/components/sections/Approach";
import ContactCTA from "@/components/sections/ContactCTA";

export default function Home() {
  return (
    <main>
      <Navbar />

      <Hero />
      <Problems />
      <Solutions />
      <Founders />
      <Approach />
      <ContactCTA />

      <Footer />
    </main>
  );
}