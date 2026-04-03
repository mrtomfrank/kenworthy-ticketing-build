import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PosterUpload } from '@/components/admin/PosterUpload';

export default function ConcertForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [rating, setRating] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/'); return; }
    if (isEdit) {
      supabase.from('concerts').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDescription(data.description || '');
          setPosterUrl(data.poster_url || '');
          setGenre(data.genre || '');
          setRating(data.rating || '');
          setIsActive(data.is_active);
        }
      });
    }
  }, [id, isEdit, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const concertData = {
      title,
      description: description || null,
      poster_url: posterUrl || null,
      genre: genre || null,
      rating: rating || null,
      is_active: isActive,
    };

    const { error } = isEdit
      ? await supabase.from('concerts').update(concertData).eq('id', id)
      : await supabase.from('concerts').insert(concertData);

    if (error) toast.error(error.message);
    else { toast.success(isEdit ? 'Concert updated!' : 'Concert created!'); navigate('/admin'); }
    setSaving(false);
  };

  if (authLoading) return null;

  return (
    <div className="container py-8 px-4 max-w-lg">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-4">← Back</Button>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">{isEdit ? 'Edit Concert' : 'Add Concert'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <PosterUpload currentUrl={posterUrl} onUrlChange={setPosterUrl} folder="concerts" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Classical" />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Input value={rating} onChange={e => setRating(e.target.value)} placeholder="NR" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active (visible to public)</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Concert' : 'Create Concert'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
