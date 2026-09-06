import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Verify caller is admin or dev
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const roles = (callerRoles || []).map((r: any) => r.role);
    const isDev = roles.includes("dev");
    const isAdmin = roles.includes("admin") || isDev;
    
    if (!isAdmin) throw new Error("Forbidden: admin or dev role required");

    const { action, targetUserId, targetEmail, role, newPassword } = await req.json();

    switch (action) {
      case "add_role": {
        if (!targetUserId || !role) throw new Error("Missing targetUserId or role");
        
        // Only devs can assign admin or dev roles
        if ((role === "admin" || role === "dev") && !isDev) {
          throw new Error("Forbidden: only devs can assign admin or dev roles");
        }
        
        const { error } = await supabase.from("user_roles").insert({
          user_id: targetUserId,
          role: role,
        });
        if (error && error.code === "23505") {
          return new Response(JSON.stringify({ success: true, message: "Role already exists" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "remove_role": {
        if (!targetUserId || !role) throw new Error("Missing targetUserId or role");
        
        // Only devs can remove admin or dev roles
        if ((role === "admin" || role === "dev") && !isDev) {
          throw new Error("Forbidden: only devs can remove admin or dev roles");
        }
        
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", role);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        if (!targetUserId || !newPassword) throw new Error("Missing targetUserId or newPassword");
        const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        if (!targetUserId) throw new Error("Missing targetUserId");
        if (targetUserId === userData.user.id) throw new Error("Cannot delete yourself");
        
        // Admins (non-dev) cannot delete devs or other admins
        if (!isDev) {
          const { data: targetRoles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", targetUserId);
          const targetRoleList = (targetRoles || []).map((r: any) => r.role);
          if (targetRoleList.includes("dev") || targetRoleList.includes("admin")) {
            throw new Error("Forbidden: only devs can delete admins or devs");
          }
        }
        
        const { error } = await supabase.auth.admin.deleteUser(targetUserId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_recovery": {
        const { data, error } = await supabase
          .from("account_recovery")
          .select("user_id, created_at, used_at");
        if (error) throw error;
        return new Response(JSON.stringify({ recovery: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_recovery": {
        if (!targetUserId) throw new Error("Missing targetUserId");
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        const c = Array.from(bytes).map((b) => alphabet[b % alphabet.length]);
        const code = `${c.slice(0, 4).join("")}-${c.slice(4, 8).join("")}-${c.slice(8, 12).join("")}-${c.slice(12, 16).join("")}`;
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${targetUserId}:${code}`),
        );
        const code_hash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const { error } = await supabase.from("account_recovery").upsert({
          user_id: targetUserId,
          code_hash,
          created_at: new Date().toISOString(),
          used_at: null,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, recoveryCode: code }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_roles": {
        const { data, error } = await supabase.from("user_roles").select("*");
        if (error) throw error;
        return new Response(JSON.stringify({ roles: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: msg.includes("Unauthorized") ? 401 : msg.includes("Forbidden") ? 403 : 500,
    });
  }
});
