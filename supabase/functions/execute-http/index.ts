import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, url, headers, body } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: headers || {},
    };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        statusCode: response.status,
        body: responseBody,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
