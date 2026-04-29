import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UtensilsCrossed, Package, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ConcessionItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
  is_combo: boolean;
}

interface ComboChild {
  id: string;
  combo_id: string;
  child_item_id: string;
  quantity: number;
  display_order: number;
  child?: ConcessionItem;
}

export default function ConcessionItemsTab() {
  const [items, setItems] = useState<ConcessionItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConcessionItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Snacks');
  const [isCombo, setIsCombo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Combo management
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboParent, setComboParent] = useState<ConcessionItem | null>(null);
  const [comboChildren, setComboChildren] = useState<ComboChild[]>([]);
  const [newChildItemId, setNewChildItemId] = useState<string>('');
  const [newChildQty, setNewChildQty] = useState<string>('1');

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
    setIsCombo(false);
    setDialogOpen(true);
  };

  const openEdit = (item: ConcessionItem) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setIsCombo(item.is_combo);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    const row = {
      name: name.trim(),
      price: parseFloat(price),
      category: category.trim(),
      is_combo: isCombo,
    };

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

  const openComboManager = async (item: ConcessionItem) => {
    setComboParent(item);
    setNewChildItemId('');
    setNewChildQty('1');
    const { data } = await supabase
      .from('concession_combo_items')
      .select('id, combo_id, child_item_id, quantity, display_order, child:concession_items!concession_combo_items_child_item_id_fkey(*)')
      .eq('combo_id', item.id)
      .order('display_order');
    setComboChildren((data as ComboChild[]) || []);
    setComboDialogOpen(true);
  };

  const reloadComboChildren = async (comboId: string) => {
    const { data } = await supabase
      .from('concession_combo_items')
      .select('id, combo_id, child_item_id, quantity, display_order, child:concession_items!concession_combo_items_child_item_id_fkey(*)')
      .eq('combo_id', comboId)
      .order('display_order');
    setComboChildren((data as ComboChild[]) || []);
  };

  const addComboChild = async () => {
    if (!comboParent || !newChildItemId) return;
    const qty = parseInt(newChildQty, 10);
    if (!qty || qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    const { error } = await supabase.from('concession_combo_items').insert({
      combo_id: comboParent.id,
      child_item_id: newChildItemId,
      quantity: qty,
      display_order: comboChildren.length,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewChildItemId('');
    setNewChildQty('1');
    reloadComboChildren(comboParent.id);
  };

  const updateChildQty = async (childRow: ComboChild, qty: number) => {
    if (!qty || qty < 1) return;
    const { error } = await supabase
      .from('concession_combo_items')
      .update({ quantity: qty })
      .eq('id', childRow.id);
    if (error) toast.error(error.message);
    else if (comboParent) reloadComboChildren(comboParent.id);
  };

  const removeComboChild = async (id: string) => {
    const { error } = await supabase.from('concession_combo_items').delete().eq('id', id);
    if (error) toast.error(error.message);
    else if (comboParent) reloadComboChildren(comboParent.id);
  };

  const childTotal = comboChildren.reduce(
    (sum, c) => sum + (c.child ? Number(c.child.price) * c.quantity : 0),
    0,
  );

  // Eligible children: any non-combo item (DB trigger also enforces this).
  const eligibleChildren = items.filter(
    (i) => !i.is_combo && i.id !== comboParent?.id,
  );

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
                    {item.is_combo ? (
                      <Package className="h-5 w-5 text-accent" />
                    ) : (
                      <UtensilsCrossed className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {item.name}
                        {item.is_combo && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Combo</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">${Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                    <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {item.is_combo && (
                      <Button variant="ghost" size="sm" onClick={() => openComboManager(item)} title="Manage combo contents">
                        <Package className="h-4 w-4" />
                      </Button>
                    )}
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
            <div className="flex items-center justify-between rounded-md border border-border/40 p-3">
              <div>
                <p className="text-sm font-medium">This is a combo bundle</p>
                <p className="text-xs text-muted-foreground">
                  Combos let you group child items. Price stays as set above (override).
                </p>
              </div>
              <Switch checked={isCombo} onCheckedChange={setIsCombo} />
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

      <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {comboParent?.name ?? 'Combo'} — Contents
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Combo price (override)</span>
                <span className="tabular-nums">${comboParent ? Number(comboParent.price).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sum of children (à la carte)</span>
                <span className="tabular-nums">${childTotal.toFixed(2)}</span>
              </div>
              {comboParent && childTotal > Number(comboParent.price) && (
                <div className="flex justify-between text-accent">
                  <span>Customer savings</span>
                  <span className="tabular-nums">
                    ${(childTotal - Number(comboParent.price)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Included items</Label>
              {comboChildren.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No items added yet.</p>
              )}
              {comboChildren.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border border-border/40 p-2">
                  <span className="flex-1 text-sm">{c.child?.name ?? 'Unknown item'}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                    ${c.child ? Number(c.child.price).toFixed(2) : '0.00'} ea
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={c.quantity}
                    onChange={(e) => updateChildQty(c, parseInt(e.target.value, 10))}
                    className="w-16 h-8"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeComboChild(c.id)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add item</Label>
              <div className="flex gap-2">
                <Select value={newChildItemId} onValueChange={setNewChildItemId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose an item…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleChildren
                      .filter((i) => !comboChildren.some((c) => c.child_item_id === i.id))
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} — ${Number(i.price).toFixed(2)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={newChildQty}
                  onChange={(e) => setNewChildQty(e.target.value)}
                  className="w-20"
                />
                <Button onClick={addComboChild} disabled={!newChildItemId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Editing a child item's price elsewhere will update the "sum of children" reference here automatically. The combo's customer-facing price stays at the override above.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setComboDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
