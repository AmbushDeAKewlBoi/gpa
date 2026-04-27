import { supabase, supabaseEnabled } from './supabase';

const APP_ID = 'lockin';

export async function fetchUserAppState(uid) {
  if (!supabaseEnabled || !uid) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_states')
    .select('tasks, classes, gpa')
    .eq('user_id', uid)
    .eq('app_id', APP_ID)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveUserAppState(uid, state) {
  if (!supabaseEnabled || !uid) return;

  const { error } = await supabase.from('app_states').upsert(
    {
      user_id: uid,
      app_id: APP_ID,
      tasks: state.tasks || [],
      classes: state.classes || [],
      gpa: state.gpa || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,app_id' },
  );

  if (error) throw error;
}

export function normalizeCloudState(data) {
  if (!data) return null;

  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    classes: Array.isArray(data.classes) ? data.classes : [],
    gpa: {
      junior: data.gpa?.junior || {},
      senior: data.gpa?.senior || {},
    },
  };
}
