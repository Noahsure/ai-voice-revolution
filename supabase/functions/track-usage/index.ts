import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { usageType, amount } = await req.json();
    if (!usageType || amount === undefined) {
      throw new Error("Missing usageType or amount");
    }
    logStep("Request data parsed", { usageType, amount });

    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get current usage
    let { data: currentUsage } = await supabaseClient
      .from("usage_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    if (!currentUsage) {
      // Create new usage record
      const { data: newUsage, error } = await supabaseClient
        .from("usage_tracking")
        .insert({
          user_id: user.id,
          month_year: monthYear,
          call_minutes_used: usageType === 'call_minutes' ? amount : 0,
          agents_created: usageType === 'agents' ? amount : 0,
          campaigns_active: usageType === 'campaigns' ? amount : 0,
          contacts_uploaded: usageType === 'contacts' ? amount : 0
        })
        .select()
        .single();
      
      if (error) throw error;
      currentUsage = newUsage;
      logStep("Created new usage record", { currentUsage });
    } else {
      // Update existing usage
      const updateData: any = { updated_at: new Date().toISOString() };
      
      switch (usageType) {
        case 'call_minutes':
          updateData.call_minutes_used = currentUsage.call_minutes_used + amount;
          break;
        case 'agents':
          updateData.agents_created = amount; // Set absolute count for agents
          break;
        case 'campaigns':
          updateData.campaigns_active = amount; // Set absolute count for campaigns
          break;
        case 'contacts':
          updateData.contacts_uploaded = currentUsage.contacts_uploaded + amount;
          break;
        default:
          throw new Error(`Invalid usage type: ${usageType}`);
      }
      
      const { data: updatedUsage, error } = await supabaseClient
        .from("usage_tracking")
        .update(updateData)
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .select()
        .single();
      
      if (error) throw error;
      currentUsage = updatedUsage;
      logStep("Updated usage record", { currentUsage, updateData });
    }

    // Get user's plan limits
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", user.id)
      .single();

    const planType = subscription?.plan_type || 'trial';
    
    const { data: planLimits } = await supabaseClient
      .from("plan_limits")
      .select("*")
      .eq("plan_type", planType)
      .single();

    if (!planLimits) throw new Error(`Plan limits not found for plan: ${planType}`);

    // Check if usage exceeds limits
    const usage = {
      call_minutes: currentUsage.call_minutes_used,
      agents: currentUsage.agents_created,
      campaigns: currentUsage.campaigns_active,
      contacts: currentUsage.contacts_uploaded
    };

    const limits = {
      call_minutes: planLimits.max_call_minutes,
      agents: planLimits.max_agents,
      campaigns: planLimits.max_campaigns,
      contacts: planLimits.max_contacts
    };

    const usagePercentages = {
      call_minutes: (usage.call_minutes / limits.call_minutes) * 100,
      agents: (usage.agents / limits.agents) * 100,
      campaigns: (usage.campaigns / limits.campaigns) * 100,
      contacts: (usage.contacts / limits.contacts) * 100
    };

    const warnings = [];
    const exceeded = [];

    Object.entries(usagePercentages).forEach(([key, percentage]) => {
      if (percentage >= 100) {
        exceeded.push(key);
      } else if (percentage >= 80) {
        warnings.push(key);
      }
    });

    logStep("Usage tracking completed", { 
      usage, 
      limits, 
      usagePercentages, 
      warnings, 
      exceeded 
    });

    return new Response(JSON.stringify({
      success: true,
      usage,
      limits,
      usagePercentages,
      warnings,
      exceeded,
      planType
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in track-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});