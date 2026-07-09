import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export function extractShippingAddress(session: Stripe.Checkout.Session) {
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) return null;

  return {
    shippingName: shipping.name,
    shippingLine1: shipping.address.line1,
    shippingLine2: shipping.address.line2,
    shippingCity: shipping.address.city,
    shippingState: shipping.address.state,
    shippingPostalCode: shipping.address.postal_code,
    shippingCountry: shipping.address.country,
  };
}
