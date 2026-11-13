import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms governing NutriSun meal subscriptions, payments, deliveries, cancellations, holidays, and use of the NutriSun web application.',
  alternates: { canonical: '/terms' },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg sm:text-xl font-semibold text-[#741B22]">{title}</h2>
    <div className="space-y-3 text-sm sm:text-base leading-7 text-[#22222B]/85">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-[#B0BE8C]/35 bg-white/90 p-5 shadow-xl backdrop-blur-sm sm:p-10 lg:p-12">
        <header className="border-b border-[#B0BE8C]/35 pb-7">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#B92F25]">NutriSun</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#22222B] sm:text-4xl">Terms and Conditions</h1>
          <p className="mt-3 text-sm text-[#22222B]/65">Effective date: 14 November 2026</p>
          <p className="mt-5 text-sm leading-7 text-[#22222B]/80 sm:text-base">
            These Terms and Conditions govern your use of the NutriSun website and web application, and your purchase and receipt of NutriSun meal-delivery services.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#22222B]/80 sm:text-base">
            NutriSun is operated by NutriSun Foods (OPC) Private Limited, a company incorporated under the Companies Act, 2013 and limited by shares ("NutriSun", "we", "us" or "our"). By creating an account, purchasing a plan or using our services, you confirm that you have read and accepted these Terms.
          </p>
        </header>

        <div className="mt-8 space-y-9">
          <Section title="1. Customer eligibility and accounts">
            <p>You must provide accurate and complete information, including your first name, last name, primary telephone number, delivery address and pincode.</p>
            <p>You are responsible for keeping your login credentials confidential, maintaining accurate account information, and promptly informing NutriSun if you suspect unauthorised access.</p>
            <p>An account may be used only by the customer for whom it was created, unless NutriSun expressly permits otherwise. If a customer is under 18 years of age, the account and purchase must be managed by a parent or lawful guardian.</p>
          </Section>

          <Section title="2. Delivery area and feasibility">
            <p>NutriSun currently provides delivery only to approved locations in and around Madurai. Before placing a first order, every new customer must contact NutriSun Customer Care and confirm that delivery is feasible at the customer&apos;s location.</p>
            <p>Account registration or display of a plan does not by itself confirm delivery feasibility. NutriSun may decline or discontinue delivery to an address that is outside its service area, unsafe, inaccessible or operationally impractical.</p>
          </Section>

          <Section title="3. Delivery addresses">
            <p>Customers must provide a complete address, including flat or plot number, floor, building name, street, landmark, area or locality, city and pincode.</p>
            <p>Where different addresses apply to different meal types or days, the customer must ensure that the relevant address and instructions are clearly recorded and confirmed by NutriSun.</p>
            <p>Address changes are subject to delivery feasibility and reasonable advance notice. NutriSun is not responsible for a failed or delayed delivery caused by incomplete, inaccurate or outdated information supplied by the customer.</p>
          </Section>

          <Section title="4. Meal plans">
            <p>NutriSun offers prepaid weekly and monthly plans that may include breakfast, lunch, dinner or combinations of these meal types. The checkout description identifies the included meal types, duration, number of meals, price, selected quantity and total payable amount.</p>
            <p>A customer may purchase up to five quantities of a plan, subject to availability. Plans do not automatically renew unless automatic renewal is expressly offered and separately accepted.</p>
            <p>NutriSun may introduce, modify or withdraw plans prospectively. A later pricing or plan change will not alter the price recorded for a previously confirmed purchase.</p>
          </Section>

          <Section title="5. Availability and order acceptance">
            <p>Availability is assessed separately for every meal type included in a selected plan. The payment option and UPI QR code are made available only after the selected quantity passes the availability check.</p>
            <p>Availability confirmation permits the customer to proceed with payment but is not final acceptance. A purchase is confirmed only after the customer completes and acknowledges payment, NutriSun verifies it, and an administrator approves the purchase and confirms the applicable start date or dates.</p>
            <p>NutriSun may reject a request because of payment discrepancies, delivery infeasibility, capacity limitations, suspected misuse or another reasonable operational concern.</p>
          </Section>

          <Section title="6. Prices and payment">
            <p>Current prices are displayed in Indian Rupees. The total payable amount is the displayed plan price multiplied by the selected quantity, together with any applicable tax or charge disclosed before payment.</p>
            <div className="rounded-2xl border border-[#F7DE9D] bg-[#F7DE9D]/25 p-4">
              <p>UPI ID: <span className="font-medium text-[#22222B]">nutrisun@kvb</span></p>
              <p>Bank: Karur Vysya Bank</p>
              <p>Account holder: NutriSun Foods (OPC) Private Limited</p>
            </div>
            <p>Customers must verify the recipient and amount before authorising payment. NutriSun will never request a UPI PIN, banking password or one-time password.</p>
            <p>A debit is not itself approval. The purchase remains subject to verification and approval. NutriSun normally reviews a paid request within a few hours, but this is an indicative service period rather than a guaranteed approval time.</p>
            <p>If money is received but the purchase cannot be approved, NutriSun will contact the customer and arrange an appropriate refund or resolution within the period communicated and required by applicable law.</p>
          </Section>

          <Section title="7. Subscription commencement and scheduling">
            <p>NutriSun may assign different commencement dates to breakfast, lunch and dinner when approving a multi-meal plan. Once approved, individual meals appear in the Meal Schedule and Cancellations page.</p>
            <p>The meal log is the most accurate record of scheduled dates. A displayed plan end date is indicative and may change because of NutriSun holidays, timely cancellations and replacements, different commencement dates by meal type, or operational rescheduling. Replacement meals may extend beyond the original plan period.</p>
          </Section>

          <Section title="8. Customer cancellations">
            <p>A customer may cancel a scheduled meal by selecting its date, meal type and quantity. The quantity cannot exceed the number scheduled for that date and meal type.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Breakfast: cancel before 12:00 midnight at the beginning of the delivery date - in practical terms, by 11:59 p.m. on the previous day.</li>
              <li>Lunch: cancel before 12:00 midnight at the beginning of the delivery date - in practical terms, by 11:59 p.m. on the previous day.</li>
              <li>Dinner: cancel before 12:00 noon on the delivery date.</li>
            </ul>
            <p>A meal cancelled before its cut-off is automatically moved to the next available slot for the same meal type. That slot is determined using the customer&apos;s overall schedule and daily entitlement across subscriptions, and remains subject to operating days and capacity.</p>
            <p>A meal cancelled at or after the cut-off is cancelled without replacement, credit or refund, except where NutriSun expressly agrees otherwise or applicable law requires otherwise.</p>
            <p>NutriSun does not provide a separate subscription-pause facility. Customers wishing to stop several consecutive deliveries must cancel the applicable scheduled meals. A cancellation is effective only when successfully recorded in the web application.</p>
          </Section>

          <Section title="9. NutriSun holidays">
            <p>NutriSun may declare a holiday for a particular date and meal type. All affected scheduled meals will be cancelled and automatically rescheduled to the next available slots for the same meal type. The normal late-cancellation rule does not apply and customers do not lose the affected meals.</p>
            <p>Rescheduling takes account of full or partial cancellations already made by customers. A meal already validly cancelled will not be duplicated merely because a holiday is later declared.</p>
          </Section>

          <Section title="10. Delivery">
            <p>Customers must ensure that an authorised person is available at the confirmed address. All stated delivery timings are tentative only and are not guaranteed. Actual delivery times may vary because of traffic, weather, route conditions, order volume, access restrictions or other operational circumstances.</p>
            <p>If delivery cannot be completed because the recipient is unavailable, the telephone is unanswered, access is denied or the address is inaccurate, the meal may be treated as attempted or fulfilled, subject to applicable consumer rights.</p>
            <p>Reusable tiffin boxes must be washed thoroughly, fully dried and returned to NutriSun during a subsequent meal delivery. If the required empty tiffin boxes are not returned in this condition, NutriSun may withhold the subsequent meal. A meal withheld for this reason will not qualify for a free replacement, credit or refund.</p>
            <p>The web application operationally classifies a non-cancelled breakfast as delivered after 9:00 a.m., lunch after 3:00 p.m., and dinner after 9:00 p.m. This automated classification does not remove a customer&apos;s statutory right to report genuine non-delivery or another service problem.</p>
            <p>A missing, damaged, incorrect or materially delayed meal should be reported as soon as reasonably possible, preferably on the same day.</p>
          </Section>

          <Section title="11. Menus and substitutions">
            <p>Monthly menus are indicative and may be updated when reasonably necessary. NutriSun may substitute a dish or ingredient because of availability, quality, food safety, a holiday or another operational reason. Where practicable, the substitute will be reasonably comparable.</p>
            <p>Menu photographs and illustrations are representative. Actual appearance, presentation and arrangement may vary.</p>
          </Section>

          <Section title="12. Food safety, allergies and dietary requirements">
            <p>NutriSun prepares and handles food in accordance with applicable food-safety requirements. Customers must disclose any serious allergy or medically necessary dietary restriction before purchasing.</p>
            <p>Unless expressly confirmed otherwise in writing, NutriSun&apos;s kitchen may handle common allergens and different food categories in shared areas, and complete absence of cross-contact cannot be guaranteed.</p>
            <p>The web application is not medical or nutritional advice. NutriSun does not assign dietary classifications to individual customer meal logs. Customers requiring a particular classification must obtain express confirmation before ordering.</p>
            <p>Meals should be consumed or stored appropriately after delivery. NutriSun is not responsible for deterioration caused by improper storage, reheating or handling after delivery.</p>
          </Section>

          <Section title="13. Refunds, replacements and unused meals">
            <p>Timely customer cancellations are ordinarily resolved through automatic rescheduling rather than a cash refund. Except where a refund is required by applicable law, all refunds are granted solely at the discretion of NutriSun Foods (OPC) Private Limited.</p>
            <p>If NutriSun agrees to a refund for cancellation before the scheduled end of a subscription, the refunded amount may be reduced by reasonable early-cancellation charges, administrative costs, the value of meals already delivered or scheduled within a non-replaceable period, and any other deductions communicated to the customer when the refund is considered.</p>
            <p>No replacement, credit or refund is ordinarily provided for a late cancellation, an unsuccessful delivery caused by inaccurate information or recipient unavailability, a meal the customer elects not to consume, or unused scheduled meals forfeited at the customer&apos;s request.</p>
            <p>A NutriSun holiday ordinarily results in rescheduling rather than a cash refund. If NutriSun fails to provide a confirmed meal and cannot reasonably replace it, NutriSun will offer an appropriate remedy, which may include rescheduling, account adjustment or refund.</p>
            <p>Nothing in these Terms limits a remedy that cannot lawfully be excluded under applicable consumer law.</p>
          </Section>

          <Section title="14. Purchase requests and duplicate submissions">
            <p>Customers should submit only one purchase request for each intended transaction. Incomplete checkout drafts do not constitute purchases and may be cleared automatically after 24 hours. NutriSun may close duplicate, abandoned, unpaid or unverifiable requests without activating a subscription.</p>
          </Section>

          <Section title="15. Account suspension and termination">
            <p>NutriSun may reasonably restrict or suspend an account because of fraudulent or abusive activity, payment manipulation, repeated misuse, threatening or unlawful conduct, a serious breach of these Terms, or a legal, food-safety or security requirement.</p>
            <p>Where reasonably practicable, NutriSun will explain the reason and allow the customer to contact Customer Care. Any confirmed but unfulfilled purchase will be handled fairly and in accordance with applicable law.</p>
          </Section>

          <Section title="16. Personal information and communications">
            <p>NutriSun may collect and use information needed to create and secure accounts, assess delivery feasibility, process purchases and payments, schedule and deliver meals, manage cancellations and holidays, communicate service information, maintain records, prevent fraud and protect the service.</p>
            <p>NutriSun may use service providers for hosting, data storage, communications and necessary operations, subject to appropriate safeguards. Transactional communications may be sent through the web application, telephone, SMS, email or WhatsApp.</p>
          </Section>

          <Section title="17. Intellectual property">
            <p>The NutriSun name, logo, website, web application, text, graphics, menus and original content belong to NutriSun or their respective licensors. Customers may not reproduce, sell, commercially exploit, impersonate or misuse them without prior written permission.</p>
          </Section>

          <Section title="18. Service availability">
            <p>NutriSun aims to keep the web application available and accurate but does not guarantee uninterrupted or error-free operation. Temporary interruptions may occur because of maintenance, hosting failures, connectivity problems, security incidents or circumstances beyond NutriSun&apos;s reasonable control.</p>
            <p>If the application is unavailable for a time-sensitive cancellation, the customer should promptly contact Customer Care. NutriSun will assess the request using the time at which it was received.</p>
          </Section>

          <Section title="19. Liability">
            <p>NutriSun is responsible for providing its services with reasonable care and skill and for complying with obligations that cannot legally be excluded.</p>
            <p>To the extent permitted by law, NutriSun is not responsible for indirect or consequential loss that was not reasonably foreseeable, or for failure caused by events beyond its reasonable control, including severe weather, natural disasters, public restrictions, strikes, supply disruption, widespread outages or transport emergencies.</p>
            <p>Nothing in these Terms excludes liability for fraud, wilful misconduct, food-safety obligations, personal injury caused by negligence or another liability that cannot lawfully be excluded.</p>
          </Section>

          <Section title="20. Changes to these Terms">
            <p>NutriSun may update these Terms to reflect changes in its services, technology, processes or legal obligations. Material changes will be published in the web application and take effect from the stated date.</p>
            <p>Changes will not retrospectively remove rights already accrued under a confirmed purchase unless required by law or expressly agreed with the customer.</p>
          </Section>

          <Section title="21. Customer support and complaints">
            <div className="rounded-2xl border border-[#B0BE8C]/40 bg-[#F3F5F4] p-4 sm:p-5">
              <p>Phone and WhatsApp: <a className="font-medium text-[#741B22] underline underline-offset-4" href="tel:+919600449704">+91 96004 49704</a></p>
              <p>Email: <a className="font-medium text-[#741B22] underline underline-offset-4" href="mailto:admin@nutrisun.cloud">admin@nutrisun.cloud</a></p>
              <p>Postal address: NutriSun Foods (OPC) Private Limited, No. 5/120, Kasim Residency, Othakadai, Madurai North, Madurai - 625107, Tamil Nadu</p>
            </div>
            <p>Customers should include their name, registered telephone number, relevant date and meal type, payment reference where applicable, and a concise description of the issue. NutriSun will acknowledge and address complaints within the periods required by applicable law.</p>
          </Section>

          <Section title="22. Governing law and disputes">
            <p>These Terms are governed by the laws of India. NutriSun and the customer should first attempt to resolve a dispute through Customer Care.</p>
            <p>Subject to applicable consumer law and the jurisdiction of statutory consumer commissions, courts having jurisdiction in Madurai, Tamil Nadu will have jurisdiction. Nothing in this section prevents a consumer from using a complaint, mediation or dispute-resolution remedy available under applicable law.</p>
          </Section>

          <Section title="23. Company information">
            <div className="space-y-1 rounded-2xl border border-[#B0BE8C]/40 bg-[#F3F5F4] p-4 sm:p-5">
              <p><span className="font-medium text-[#22222B]">Legal name:</span> NutriSun Foods (OPC) Private Limited</p>
              <p><span className="font-medium text-[#22222B]">CIN:</span> U56102TN2026OPC197079</p>
              <p><span className="font-medium text-[#22222B]">Incorporated:</span> 24 August 2026</p>
              <p><span className="font-medium text-[#22222B]">Registered office:</span> No. 5/120, Kasim Residency, Othakadai, Madurai North, Madurai - 625107, Tamil Nadu</p>
              <p><span className="font-medium text-[#22222B]">Email:</span> admin@nutrisun.cloud</p>
              <p><span className="font-medium text-[#22222B]">Phone and WhatsApp:</span> +91 96004 49704</p>
            </div>
          </Section>
        </div>

        <div className="mt-10 border-t border-[#B0BE8C]/35 pt-6 text-center">
          <Link href="/" className="text-sm font-medium text-[#741B22] underline decoration-[#B0BE8C] underline-offset-4 hover:text-[#B92F25]">
            Return to NutriSun home
          </Link>
        </div>
      </article>
    </div>
  );
}

