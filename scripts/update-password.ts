import { supabase } from "../src/integrations/supabase/client";

async function updateUserPassword() {
  try {
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: {
        email: 'recursoshumanos@livigui.com',
        newPassword: 'szurita2025'
      }
    });

    if (error) {
      console.error('Error updating password:', error);
      return;
    }

    console.log('Password updated successfully:', data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateUserPassword();