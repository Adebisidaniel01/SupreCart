import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — CoreCart" },
      {
        name: "description",
        content: "There are no open positions at CoreCart right now. Check back later.",
      },
    ],
  }),
  component: Careers,
});

function Careers() {
  return (
    <main className="careers-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to CoreCart
      </Link>
      <section className="careers-card">
        <div className="career-icon">
          <BriefcaseBusiness size={25} />
        </div>
        <p className="eyebrow">CAREERS AT CORECART</p>
        <h1>
          Good people.
          <br />
          Good things ahead.
        </h1>
        <p className="careers-message">
          We’re not on the lookout for talent just yet — but that could change. Please check back
          later for future opportunities.
        </p>
        <div className="careers-note">
          <Sparkles size={17} />
          <span>In the meantime, there’s plenty of good to discover across the marketplace.</span>
        </div>
        <Button asChild>
          <Link to="/shop" search={{ filter: "All" }}>
            Explore the marketplace <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
      <span className="careers-decoration">MORE TO COME</span>
    </main>
  );
}
