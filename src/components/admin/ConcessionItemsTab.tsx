import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

interface ConcessionItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
}

export default function ConcessionItemsTab() {
  const [items, setItems] = useState<ConcessionItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConcessionItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Snacks');
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    const { data } = await supabase
      .from('concession_items')
      .select('*')
      .order('category')
      .order('name');
    setItems((data as ConcessionItem[]) || []);
  };

  useEffect(() => { loadItems(); }, []);

  const openNew = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setCategory('Snacks');
    setDialogOpen(true);
  };

  const openEdit = (item: ConcessionItem) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    const row = { name: name.trim(), price: parseFloat(price), category: category.trim() };

    if (editing) {
      const { error } = await supabase.from('concession_items').update(row).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success('Item updated');
    } else {
      const { error } = await supabase.from('concession_items').insert(row);
      if (error) toast.error(error.message);
      else toast.success('Item added');
    }
    setSaving(false);
    setDialogOpen(false);
    loadItems();
  };

  const toggleActive = async (item: ConcessionItem) => {
    const { error } = await supabase
      .from('concession_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (error) toast.error(error.message);
    else loadItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this concession item?')) return;
    const { error } = await supabase.from('concession_items').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Item deleted'); loadItems(); }
  };

  const grouped = items.reduce<Record<string, ConcessionItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Concession Menu</h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h3>
          <div className="space-y-2">
            {catItems.map(item => (
              <Card key={item.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">${Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                    <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No concession items yet. Add your first item!</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Concession Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Large Popcorn" />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="5.00" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Snacks, Drinks, Candy..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !price}>
              {editing ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
