import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard, DollarSign } from 'lucide-react';

interface FilmPassType {
  id: string;
  name: string;
  price: number;
  initial_balance: number;
  expiration_days: number | null;
  is_active: boolean;
}

interface UserPass {
  id: string;
  remaining_balance: number;
  payment_method: string;
  purchased_at: string;
  expires_at: string | null;
  user_id: string;
  profile: { display_name: string | null } | null;
  pass_type: { name: string } | null;
}

export default function FilmPassesTab() {
  const [passTypes, setPassTypes] = useState<FilmPassType[]>([]);
  const [userPasses, setUserPasses] = useState<UserPass[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '60', initial_balance: '60', expiration_days: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [typesRes, passesRes] = await Promise.all([
      supabase.from('film_pass_types').select('*').order('created_at', { ascending: false }),
      supabase.from('user_film_passes').select('*, profiles!user_film_passes_user_id_fkey(display_name), film_pass_types!user_film_passes_pass_type_id_fkey(name)').order('purchased_at', { ascending: false }).limit(50),
    ]);
    setPassTypes(typesRes.data || []);
    setUserPasses((passesRes.data || []).map((p: any) => ({
      ...p,
      profile: p.profiles,
      pass_type: p.film_pass_types,
    })));
  }

  async function handleCreateType() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const { error } = await supabase.from('film_pass_types').insert({
      name: form.name.trim(),
      price: parseFloat(form.price) || 60,
      initial_balance: parseFloat(form.initial_balance) || 60,
      expiration_days: form.expiration_days ? parseInt(form.expiration_days) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Pass type created');
    setForm({ name: '', price: '60', initial_balance: '60', expiration_days: '' });
    setShowForm(false);
    loadData();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('film_pass_types').update({ is_active: !isActive }).eq('id', id);
    if (error) toast.error(error.message);
    else loadData();
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this pass type?')) return;
    const { error } = await supabase.from('film_pass_types').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); loadData(); }
  }

  return (
    <div className="space-y-6">
      {/* Pass Types */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Film Pass Types</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add Pass Type
        </Button>
      </div>

      {showForm && (
        <Card className="glass">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 10-Film Pass" />
              </div>
              <div className="space-y-2">
                <Label>Sale Price ($)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Initial Balance ($)</Label>
                <Input type="number" step="0.01" value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Expiration (days, blank = none)</Label>
                <Input type="number" value={form.expiration_days} onChange={e => setForm(f => ({ ...f, expiration_days: e.target.value }))} placeholder="365" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateType}>Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {passTypes.map(pt => (
          <Card key={pt.id} className="glass">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{pt.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">${pt.price.toFixed(2)} sale price</Badge>
                    <Badge variant="outline" className="text-xs">${pt.initial_balance.toFixed(2)} balance</Badge>
                    {pt.expiration_days && <Badge variant="secondary" className="text-xs">{pt.expiration_days} day expiry</Badge>}
                    <Badge variant={pt.is_active ? 'default' : 'secondary'} className="text-xs">
                      {pt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pt.is_active} onCheckedChange={() => toggleActive(pt.id, pt.is_active)} />
                <Button variant="ghost" size="sm" onClick={() => deleteType(pt.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {passTypes.length === 0 && <p className="text-muted-foreground text-center py-8">No film pass types configured.</p>}
      </div>

      {/* Active Passes */}
      <h2 className="font-display text-xl font-bold pt-4">Active Passes</h2>
      <div className="space-y-3">
        {userPasses.map(up => (
          <Card key={up.id} className="glass">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{up.profile?.display_name || 'Unknown User'}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{up.pass_type?.name}</Badge>
                    <Badge variant="secondary" className="text-xs">${Number(up.remaining_balance).toFixed(2)} remaining</Badge>
                    <Badge variant="outline" className="text-xs">{up.payment_method}</Badge>
                    {up.expires_at && (
                      <Badge variant={new Date(up.expires_at) < new Date() ? 'destructive' : 'secondary'} className="text-xs">
                        {new Date(up.expires_at) < new Date() ? 'Expired' : `Expires ${new Date(up.expires_at).toLocaleDateString()}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {userPasses.length === 0 && <p className="text-muted-foreground text-center py-8">No passes purchased yet.</p>}
      </div>
    </div>
  );
}
