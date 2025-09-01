import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key to perform database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing subscription in database
    const { data: existingSubscription } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    logStep("Existing subscription checked", { existingSubscription });

    // Get Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, creating trial subscription");
      
      // Create trial subscription record
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7 days from now
      
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        plan_type: "trial",
        status: "trialing",
        trial_end: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: "trial",
        status: "trialing",
        trial_end: trialEnd.toISOString(),
        days_left: 7
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let subscriptionData = {
      subscribed: false,
      plan_type: "trial",
      status: "trialing",
      trial_end: null,
      current_period_end: null,
      cancel_at_period_end: false,
      days_left: 0
    };

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      // Determine plan type from amount
      const amount = subscription.items.data[0].price.unit_amount || 0;
      let planType = "trial";
      if (amount >= 25000) planType = "premium"; // £250+ 
      else if (amount >= 10000) planType = "starter"; // £100+

      subscriptionData = {
        subscribed: true,
        plan_type: planType,
        status: subscription.status,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        days_left: Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      };

      logStep("Active subscription found", { subscriptionId: subscription.id, planType, status: subscription.status });

      // Update database with latest subscription info
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_type: planType,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    } else {
      // Check if trial period has expired
      if (existingSubscription) {
        const trialEnd = new Date(existingSubscription.trial_end || existingSubscription.current_period_end);
        const now = new Date();
        const isTrialExpired = trialEnd < now;
        
        if (isTrialExpired) {
          subscriptionData = {
            subscribed: false,
            plan_type: "trial",
            status: "expired",
            trial_end: trialEnd.toISOString(),
            current_period_end: null,
            cancel_at_period_end: false,
            days_left: 0
          };
          
          // Update status to expired
          await supabaseClient.from("subscriptions").update({
            status: "expired",
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        } else {
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          subscriptionData = {
            subscribed: true,
            plan_type: "trial",
            status: "trialing",
            trial_end: trialEnd.toISOString(),
            current_period_end: trialEnd.toISOString(),
            cancel_at_period_end: false,
            days_left: daysLeft
          };
        }
      }
      
      logStep("No active subscription found", { existingSubscription, subscriptionData });
    }

    return new Response(JSON.stringify(subscriptionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});