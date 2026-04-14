import { ContactForm, ContactHero } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <div className="mx-auto max-w-xl px-4 py-10">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold">
          Custom order inquiry
        </h2>
        <ContactForm />
        <div className="mt-12 overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
          <iframe
            title="Cypress TX map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d222396.123!2d-95.9!3d29.97!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8640c0c0c0c0c0c0%3A0x0!2sCypress%2C%20TX%2077433!5e0!3m2!1sen!2sus!4v1"
            width="100%"
            height="320"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </>
  );
}
