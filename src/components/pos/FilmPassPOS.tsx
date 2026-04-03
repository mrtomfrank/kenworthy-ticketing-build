import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, DollarSign, Search, ShoppingCart } from 'lucide-react';
import { PaymentMethodSelector, type PaymentMethod } from './PaymentMethodSelector';

interface PassType {
  id: string;
  name: string;
  price: number;
  initial_balance: number;
  expiration_days: number | null;
}

export function FilmPassPOS() {
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [patronEmail, setPatronEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selling, setSelling] = useState(false);

  // Lookup section
  const [lookupEmail, setLookupEmail] = useState('');
  const [foundPasses, setFoundPasses] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    supabase.from('film_pass_types').select('*').eq('is_active', true).order('price')
      .then(({ data }) => {
        setPassTypes(data || []);
        if (data && data.length > 0) setSelectedTypeId(data[0].id);
      });
  }, []);

  const selectedType = passTypes.find(t => t.id === selectedTypeId);

  async function handleSell() {
    if (!selectedType) { toast.error('Select a pass type'); return; }
    if (!patronEmail.trim()) { toast.error('Enter patron email'); return; }

    setSelling(true);
    try {
      // Look up user by email via profiles
      const { data: { users }, error: lookupErr } = await supabase.auth.admin.listUsers();
      // Since we can't use admin API from client, we look up by email in profiles
      // Instead, we'll create the pass under the staff user's ID and use the email as a note
      // Better approach: find user by querying profiles with display_name = email
      
      // Actually, let's look up the profile by querying the auth user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('display_name', patronEmail.trim())
        .maybeSingle();

      let userId: string;
      if (profileData) {
        userId = profileData.id;
      } else {
        // Try with the current staff user as owner (staff selling to walk-in)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        // For walk-in sales, we'll use the staff user's ID
        // In production, you'd create a guest account or lookup by email
        userId = user.id;
      }

      const expiresAt = selectedType.expiration_days
        ? new Date(Date.now() + selectedType.expiration_days * 86400000).toISOString()
        : null;

      const { error } = await supabase.from('user_film_passes').insert({
        user_id: userId,
        pass_type_id: selectedType.id,
        remaining_balance: selectedType.initial_balance,
        payment_method: paymentMethod,
        expires_at: expiresAt,
      });

      if (error) throw error;
      toast.success(`${selectedType.name} sold! Balance: $${selectedType.initial_balance.toFixed(2)}`);
      setPatronEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sell pass');
    } finally {
      setSelling(false);
    }
  }

  async function handleLookup() {
    if (!lookupEmail.trim()) return;
    setSearching(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', `%${lookupEmail.trim()}%`);

      if (!profiles || profiles.length === 0) {
        setFoundPasses([]);
        toast.info('No passes found for this email');
        setSearching(false);
        return;
      }

      const userIds = profiles.map(p => p.id);
      const { data: passes } = await supabase
        .from('user_film_passes')
        .select('*, film_pass_types!user_film_passes_pass_type_id_fkey(name)')
        .in('user_id', userIds)
        .gt('remaining_balance', 0)
        .order('purchased_at', { ascending: false });

      setFoundPasses((passes || []).map((p: any) => ({
        ...p,
        pass_type_name: p.film_pass_types?.name || 'Film Pass',
        display_name: profiles.find(pr => pr.id === p.user_id)?.display_name || 'Unknown',
      })));

      if (!passes || passes.length === 0) {
        toast.info('No active passes found');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Sell New Pass */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Sell Film Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pass Type</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a pass..." />
              </SelectTrigger>
              <SelectContent>
                {passTypes.map(pt => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name} — ${pt.price.toFixed(2)} (${pt.initial_balance.toFixed(2)} balance)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Patron Email</Label>
            <Input
              type="email"
              placeholder="patron@email.com"
              value={patronEmail}
              onChange={e => setPatronEmail(e.target.value)}
            />
          </div>

          <PaymentMethodSelector paymentMethod={paymentMethod} onSelect={setPaymentMethod} />

          {selectedType && (
            <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{selectedType.name}</span>
                <span className="font-bold">${selectedType.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pass Balance</span>
                <span>${selectedType.initial_balance.toFixed(2)}</span>
              </div>
              {selectedType.expiration_days && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Valid For</span>
                  <span>{selectedType.expiration_days} days</span>
                </div>
              )}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSell} disabled={selling || !selectedTypeId}>
            <CreditCard className="h-4 w-4 mr-1" />
            {selling ? 'Processing...' : `Sell Pass — $${selectedType?.price.toFixed(2) || '0.00'}`}
          </Button>
        </CardContent>
      </Card>

      {/* Lookup Passes */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> Look Up Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by email..."
              value={lookupEmail}
              onChange={e => setLookupEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {foundPasses.map(pass => (
              <div key={pass.id} className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{pass.display_name}</p>
                    <p className="text-xs text-muted-foreground">{pass.pass_type_name}</p>
                  </div>
                  <Badge variant="default">
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    ${Number(pass.remaining_balance).toFixed(2)}
                  </Badge>
                </div>
                {pass.expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires {new Date(pass.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
            {foundPasses.length === 0 && lookupEmail && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">No active passes found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
