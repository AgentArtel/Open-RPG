import React, { useState } from 'react';
import { FormToggle } from '@/components/ui-custom/FormToggle';
import { FormInput } from '@/components/ui-custom/FormInput';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui-custom/Avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, User, Shield, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, icon, children }) => (
  <div className="bg-dark-100/50 border border-white/5 rounded-xl p-6">
    <div className="flex items-start gap-4 mb-6">
      <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {description && <p className="text-sm text-white/50 mt-1">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

interface SettingsProps {
  onNavigate: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState({ email: true, push: false, executions: true, errors: true });
  const [preferences, setPreferences] = useState({ darkMode: true, compactView: false, autoSave: true });
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-white/50 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="lg:col-span-2 space-y-6">
          <SettingsSection title="Profile" description="Manage your personal information" icon={<User className="w-5 h-5" />}>
            <div className="flex items-center gap-4 mb-6">
              <Avatar name="John Doe" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" size="lg" />
              <div>
                <Button variant="ghost" size="sm" className="text-green hover:text-green-light" onClick={() => toast.info('Avatar upload coming soon')}>Change Avatar</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="First Name" defaultValue="John" className="italic" />
              <FormInput label="Last Name" defaultValue="Doe" className="italic" />
              <FormInput label="Email" type="email" defaultValue="john@example.com" className="md:col-span-2 italic" />
            </div>
            <Button className="mt-4 bg-green text-dark hover:bg-green-light" onClick={() => toast.success('Profile updated')}>Save Changes</Button>
          </SettingsSection>

          <SettingsSection title="Notifications" description="Choose how you want to be notified" icon={<Bell className="w-5 h-5" />}>
            <div className="space-y-4">
              <FormToggle label="Email Notifications" description="Receive updates via email" checked={notifications.email} onChange={(checked) => { setNotifications({ ...notifications, email: checked }); toast.info('Preference saved'); }} />
              <div className="border-t border-white/5 pt-4">
                <FormToggle label="Execution Alerts" description="Get notified when workflows complete" checked={notifications.executions} onChange={(checked) => { setNotifications({ ...notifications, executions: checked }); toast.info('Preference saved'); }} />
              </div>
              <div className="border-t border-white/5 pt-4">
                <FormToggle label="Error Alerts" description="Get notified when workflows fail" checked={notifications.errors} onChange={(checked) => { setNotifications({ ...notifications, errors: checked }); toast.info('Preference saved'); }} />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Preferences" description="Customize your experience" icon={<Palette className="w-5 h-5" />}>
            <div className="space-y-4">
              <FormToggle label="Dark Mode" description="Use dark theme throughout the app" checked={preferences.darkMode} onChange={(checked) => { setPreferences({ ...preferences, darkMode: checked }); toast.info('Preference saved'); }} />
              <div className="border-t border-white/5 pt-4">
                <FormToggle label="Auto-save" description="Automatically save workflow changes" checked={preferences.autoSave} onChange={(checked) => { setPreferences({ ...preferences, autoSave: checked }); toast.info('Preference saved'); }} />
              </div>
            </div>
          </SettingsSection>
        </div>

        <div className="space-y-6">
          <SettingsSection title="Security" description="Manage your security settings" icon={<Shield className="w-5 h-5" />}>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white" onClick={() => toast.info('Coming soon')}>Change Password</Button>
              <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white" onClick={() => toast.info('Coming soon')}>Two-Factor Auth</Button>
              <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white" onClick={() => onNavigate('credentials')}>API Keys</Button>
            </div>
          </SettingsSection>

          <div className="bg-dark-100/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-2">Danger Zone</h3>
            <p className="text-xs text-white/50 mb-4">These actions cannot be undone</p>
            <Button variant="ghost" className="w-full text-danger hover:text-danger hover:bg-danger/10" onClick={() => setDeleteAccountOpen(true)}>Delete Account</Button>
            <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
              <AlertDialogContent className="bg-dark-100 border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/70">
                    Are you sure? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-danger text-white hover:bg-danger/90"
                    onClick={() => { toast.error('Account deletion not available in demo mode'); setDeleteAccountOpen(false); }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};
