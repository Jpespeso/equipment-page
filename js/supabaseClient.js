// Connects every page to Supabase. Paste your Project URL and Publishable key
// (Supabase > Settings > API Keys). Never use a secret or service_role key here.
const SUPABASE_URL = "https://ljhqcbxpadynppsphenw.supabase.co";
const SUPABASE_KEY = "sb_publishable_zUOh_VIXmOyq0ECzXi0Lgg_fbHqGm-p";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function isConfigured() {
    return !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_KEY.includes("YOUR-PUBLISHABLE");
}
