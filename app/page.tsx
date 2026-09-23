import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/sections/Hero";
import Solutions from "@/components/sections/Solutions";
import Problems from "@/components/sections/Problems";
import SmallThings from "@/components/sections/SmallThings";
import Capabilities from "@/components/sections/Capabilities";
import WhatWeAreNot from "@/components/sections/WhatWeAreNot";
import Approach from "@/components/sections/Approach";
import About from "@/components/sections/About";
import Founders from "@/components/sections/Founders";
import ContactCTA from "@/components/sections/ContactCTA";

export default function Home() {
  return (
    <main>
      <Navbar />

      <Hero />

      <Solutions />

      <Problems />

      <SmallThings />

      <Capabilities />

      <WhatWeAreNot />

      <Approach />

      <About />

      <Founders />

      <ContactCTA />

      <Footer />
    </main>
  );
}